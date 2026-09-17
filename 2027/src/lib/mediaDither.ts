import { HERO_DITHER_SETTINGS } from './heroDither';

export interface MediaDitherOptions {
  macroCellSize: number;
  brightness: number;
  contrast: number;
  accentTint: number;
  scale: number;
  positionX: number;
  positionY: number;
  interactive?: boolean;
  /** Optional foreground surface that should feed pointer events to the media. */
  interactionTarget?: HTMLElement;
}

const MAX_TRAIL_POINTS = 18;
const TRAIL_DURATION_MS = 1100;
const HOVER_RADIUS_CSS_PX = 104;
const HOVER_BRIGHTNESS_BOOST = 0.55;
const HOVER_CONTRAST_SCALE = 1.3;
// At full influence the plus threshold reaches zero, so every macro-cell under
// the cursor becomes the site's signature +. The radial/trail falloff restores
// the image-driven threshold progressively rather than drawing a hard circle.
const HOVER_PLUS_THRESHOLD_SHIFT = HERO_DITHER_SETTINGS.plusThreshold;
const HOVER_TINT_BOOST = 0.65;
const CLICK_TRAIL_DURATION_MS = TRAIL_DURATION_MS;
const CLICK_ATTACK_DURATION_MS = 420;
const CLICK_RADIUS_GROWTH_DURATION_MS = 650;
const CLICK_MIN_RADIUS_SCALE = 0.42;
const CLICK_RADIUS_CSS_PX = 116;
const CLICK_TINT_OVERDRIVE = 1.15;
const CLICK_GLOW_STRENGTH = 0.28;

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

const int MAX_TRAIL_POINTS = ${MAX_TRAIL_POINTS};

uniform sampler2D uSource;
uniform vec2 uResolution;
uniform vec2 uDisplaySize;
uniform vec2 uSourceSize;
uniform int uDitherGridSize;
uniform float uMacroCellSize;
uniform float uDitherStrength;
uniform float uBrightness;
uniform float uContrast;
uniform float uPlusThreshold;
uniform vec3 uForegroundColor;
uniform vec3 uBackgroundColor;
uniform vec3 uAccentColor;
uniform float uAccentTint;
uniform float uSourceScale;
uniform vec2 uSourcePosition;
uniform int uTrailCount;
uniform vec3 uTrailPoints[MAX_TRAIL_POINTS];
uniform float uHoverRadius;
uniform float uHoverBrightnessBoost;
uniform float uHoverContrastScale;
uniform float uHoverPlusThresholdShift;
uniform float uHoverTintBoost;
uniform int uClickTrailCount;
uniform vec3 uClickTrailPoints[MAX_TRAIL_POINTS];
uniform float uClickRadius;
uniform float uClickRadiusScale;
uniform float uClickActivation;
uniform float uClickTintOverdrive;
uniform float uClickGlowStrength;

out vec4 outColor;

float thresholdRank4(ivec2 position) {
  const vec4 row0 = vec4(1.0, 14.0, 7.0, 11.0);
  const vec4 row1 = vec4(6.0, 15.0, 3.0, 16.0);
  const vec4 row2 = vec4(2.0, 9.0, 13.0, 10.0);
  const vec4 row3 = vec4(8.0, 5.0, 12.0, 4.0);

  if (position.y == 0) return row0[position.x];
  if (position.y == 1) return row1[position.x];
  if (position.y == 2) return row2[position.x];
  return row3[position.x];
}

float thresholdRank5(ivec2 position) {
  const float ranks[25] = float[25](
    19.0, 24.0,  6.0, 11.0, 17.0,
    23.0, 10.0,  2.0, 16.0, 18.0,
     9.0,  3.0,  1.0,  4.0, 22.0,
    13.0, 15.0,  5.0, 21.0,  8.0,
    14.0, 20.0, 25.0,  7.0, 12.0
  );
  return ranks[position.y * 5 + position.x];
}

vec2 sourceUvAt(vec2 cssPosition) {
  float coverScale = max(
    uDisplaySize.x / uSourceSize.x,
    uDisplaySize.y / uSourceSize.y
  ) * max(1.0, uSourceScale);
  vec2 renderedSize = uSourceSize * coverScale;
  vec2 renderedOrigin = -(renderedSize - uDisplaySize) * uSourcePosition;
  vec2 sourcePosition = (cssPosition - renderedOrigin) / renderedSize;
  return vec2(sourcePosition.x, 1.0 - sourcePosition.y);
}

float hoverInfluenceAt(vec2 cssPosition) {
  float influence = 0.0;

  for (int index = 0; index < MAX_TRAIL_POINTS; index += 1) {
    if (index >= uTrailCount) break;

    vec3 point = uTrailPoints[index];
    float timeFade = 1.0 - smoothstep(0.0, 1.0, clamp(point.z, 0.0, 1.0));
    // Old points become physically narrower as well as fainter, which tapers
    // the back of the stroke into a point instead of ending in a round blob.
    float taperedRadius = uHoverRadius * mix(0.12, 1.0, timeFade);
    float spatialFade = 1.0 - smoothstep(
      taperedRadius * 0.18,
      taperedRadius,
      distance(cssPosition, point.xy)
    );
    // Keep the outer part of the response visible for longer, producing a
    // broad feather without softening the actual dither marks.
    spatialFade = pow(spatialFade, 0.78);
    influence = max(influence, spatialFade * timeFade);
  }

  return clamp(influence, 0.0, 1.0);
}

float clickInfluenceAt(vec2 cssPosition) {
  float influence = 0.0;

  for (int index = 0; index < MAX_TRAIL_POINTS; index += 1) {
    if (index >= uClickTrailCount) break;

    vec3 point = uClickTrailPoints[index];
    float timeFade = 1.0 - smoothstep(0.0, 1.0, clamp(point.z, 0.0, 1.0));
    float activation = max(0.0, uClickActivation);
    float taperedRadius =
      uClickRadius * uClickRadiusScale * mix(0.14, 1.0, timeFade) *
      mix(0.88, 1.0, activation);
    float spatialFade = 1.0 - smoothstep(
      taperedRadius * 0.18,
      taperedRadius,
      distance(cssPosition, point.xy)
    );
    spatialFade = pow(spatialFade, 0.78);
    influence = max(influence, spatialFade * timeFade * activation);
  }

  return clamp(influence, 0.0, 1.15);
}

float luminanceAt(vec2 cssPosition, float hoverInfluence) {
  vec3 sourceColor = texture(uSource, clamp(sourceUvAt(cssPosition), 0.0, 1.0)).rgb;
  float luminance = (sourceColor.r + sourceColor.g + sourceColor.b) / 3.0;
  float localContrast = min(2.0, uContrast * mix(1.0, uHoverContrastScale, hoverInfluence));
  float localBrightness = min(1.5, uBrightness + uHoverBrightnessBoost * hoverInfluence);
  luminance = (luminance - 0.5) * localContrast + 0.5;
  return clamp(luminance * localBrightness, 0.0, 1.0);
}

float foregroundAt(vec2 rawPosition) {
  // Keep the dither lattice completely fixed. The previous hover treatment
  // changed the lattice size per fragment, which made neighboring cells use
  // incompatible origins and produced a visible warp/twirl.
  vec2 cssPosition = clamp(rawPosition, vec2(0.0), uDisplaySize - vec2(0.001));
  vec2 macroCellOrigin = floor(cssPosition / uMacroCellSize) * uMacroCellSize;
  float gridSize = uDitherGridSize == 5 ? 5.0 : 4.0;
  float subpixelSize = uMacroCellSize / gridSize;
  vec2 subpixelIndex = clamp(
    floor((cssPosition - macroCellOrigin) / subpixelSize),
    vec2(0.0),
    vec2(gridSize - 1.0)
  );
  vec2 samplePosition = macroCellOrigin + (subpixelIndex + 0.5) * subpixelSize;
  ivec2 matrixPosition = ivec2(subpixelIndex);

  // Every dither mark receives one influence value sampled at its center. This
  // changes whether the mark is generated without deforming or partially
  // clipping its geometry.
  float markInfluence = hoverInfluenceAt(samplePosition);
  float luminance = luminanceAt(samplePosition, markInfluence);
  float rank = uDitherGridSize == 5
    ? thresholdRank5(matrixPosition)
    : thresholdRank4(matrixPosition);
  float orderedThreshold = (rank - 0.5) / (gridSize * gridSize);
  float threshold = mix(0.5, orderedThreshold, clamp(uDitherStrength, 0.0, 1.0));

  vec2 macroCellCenter = macroCellOrigin + vec2(uMacroCellSize * 0.5);
  float macroInfluence = hoverInfluenceAt(macroCellCenter);
  float clickMorph = clickInfluenceAt(macroCellCenter);
  float macroCellLuminance = luminanceAt(macroCellCenter, macroInfluence);
  float localPlusThreshold = max(
    0.0,
    uPlusThreshold - uHoverPlusThresholdShift * max(macroInfluence, clickMorph)
  );
  float symbolSubpixelSize = uMacroCellSize / 5.0;
  ivec2 symbolPosition = ivec2(
    clamp(
      floor((cssPosition - macroCellOrigin) / symbolSubpixelSize),
      vec2(0.0),
      vec2(4.0)
    )
  );
  // The symbol is drawn on the same five-by-five grid as a tiny monospaced
  // glyph. Its I keeps a full unit of vertical breathing room, while its caps
  // are only two centered units wide so it reads as a letter rather than a
  // square tile. During a press the caps appear first, then the +'s side arms
  // retract to complete the letter.
  vec2 symbolUv = (cssPosition - macroCellOrigin) / uMacroCellSize;
  bool sharedStem =
    symbolPosition.x == 2 && symbolPosition.y >= 1 && symbolPosition.y <= 3;
  bool plusSideArms =
    symbolPosition.y == 2 && (symbolPosition.x == 1 || symbolPosition.x == 3);
  bool capRow = symbolPosition.y == 1 || symbolPosition.y == 3;
  bool iBarSides =
    capRow &&
    ((symbolUv.x >= 0.3 && symbolUv.x < 0.4) ||
      (symbolUv.x >= 0.6 && symbolUv.x < 0.7));
  float sharedStemMask = sharedStem ? 1.0 : 0.0;
  float plusArmMask = plusSideArms
    ? 1.0 - smoothstep(0.38, 0.74, clickMorph)
    : 0.0;
  float iBarMask = iBarSides
    ? smoothstep(0.16, 0.58, clickMorph)
    : 0.0;
  float morphedSymbolMask = max(sharedStemMask, max(plusArmMask, iBarMask));

  return macroCellLuminance >= localPlusThreshold
    ? morphedSymbolMask
    : (luminance >= threshold ? 1.0 : 0.0);
}

vec2 markCenterAt(vec2 cssPosition) {
  vec2 macroCellOrigin = floor(cssPosition / uMacroCellSize) * uMacroCellSize;
  float gridSize = uDitherGridSize == 5 ? 5.0 : 4.0;
  float subpixelSize = uMacroCellSize / gridSize;
  vec2 subpixelIndex = clamp(
    floor((cssPosition - macroCellOrigin) / subpixelSize),
    vec2(0.0),
    vec2(gridSize - 1.0)
  );
  return macroCellOrigin + (subpixelIndex + 0.5) * subpixelSize;
}

void main() {
  vec2 cssPosition = vec2(
    gl_FragCoord.x / uResolution.x * uDisplaySize.x,
    (1.0 - gl_FragCoord.y / uResolution.y) * uDisplaySize.y
  );

  vec2 markCenter = markCenterAt(cssPosition);
  float hoverInfluence = hoverInfluenceAt(markCenter);
  float clickInfluence = clickInfluenceAt(markCenter);
  float foregroundMask = foregroundAt(cssPosition);
  float tint = uAccentTint
    + hoverInfluence * uHoverTintBoost
    + clickInfluence * uClickTintOverdrive;
  vec3 foreground = mix(uForegroundColor, uAccentColor, min(tint, 1.0));

  // Values above the normal 100% tint become additive accent light instead
  // of being discarded. A softer radial wash underneath reads as a glow while
  // keeping every dither mark crisp.
  float overdrive = max(0.0, tint - 1.0);
  foreground += uAccentColor * overdrive * 0.55;
  float glow = min(clickInfluenceAt(cssPosition), 1.0) * uClickGlowStrength;
  vec3 glowingBackground = mix(uBackgroundColor, uAccentColor, glow);

  outColor = vec4(mix(glowingBackground, foreground, foregroundMask), 1.0);
}
`;

type Rgb = readonly [number, number, number];
type DitherSource = HTMLImageElement | HTMLVideoElement;
interface TrailPoint {
  x: number;
  y: number;
  bornAt: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create the media dither shader.');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error.';
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram(gl: WebGL2RenderingContext) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  let fragmentShader: WebGLShader | null = null;

  try {
    fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) throw new Error('Unable to create the media dither program.');

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'Unknown shader link error.';
      gl.deleteProgram(program);
      throw new Error(message);
    }

    return program;
  } finally {
    gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
  }
}

function requiredUniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string) {
  const location = gl.getUniformLocation(program, name);
  if (location === null) throw new Error(`Missing media dither uniform: ${name}`);
  return location;
}

function createCssColorReader() {
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 1;
  colorCanvas.height = 1;
  const context = colorCanvas.getContext('2d', { willReadFrequently: true });
  if (!context) return () => [0, 0, 0] as const;

  return (customProperty: string): Rgb => {
    const cssValue = getComputedStyle(document.documentElement)
      .getPropertyValue(customProperty)
      .trim();
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = cssValue;
    context.fillRect(0, 0, 1, 1);
    const pixel = context.getImageData(0, 0, 1, 1).data;
    return [pixel[0] / 255, pixel[1] / 255, pixel[2] / 255] as const;
  };
}

const sourceDimensions = (source: DitherSource) =>
  source instanceof HTMLVideoElement
    ? { width: source.videoWidth, height: source.videoHeight }
    : { width: source.naturalWidth, height: source.naturalHeight };

const sourceIsReady = (source: DitherSource) =>
  source instanceof HTMLVideoElement
    ? source.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    : source.complete && source.naturalWidth > 0;

/**
 * Apply the Information+ live dither treatment to an image or video contained
 * by `root`. Images render only when something changes; videos can reuse the
 * same renderer later by supplying a video as the data-dither-source element.
 */
export function initMediaDither(root: HTMLElement, options: MediaDitherOptions) {
  const source = root.querySelector<DitherSource>('[data-dither-source]');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-dither-canvas]');
  if (!source || !canvas || root.dataset.mediaDitherInitialized === 'true') {
    return () => {};
  }

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
  if (!gl) {
    root.dataset.mediaDitherFallback = 'webgl2-unavailable';
    return () => {};
  }

  const isVideo = source instanceof HTMLVideoElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const interactionEnabled = options.interactive !== false && !reduceMotion;
  const interactionTarget = options.interactionTarget ?? root;
  const abortController = new AbortController();
  const { signal } = abortController;
  const readCssColor = createCssColorReader();
  const trailData = new Float32Array(MAX_TRAIL_POINTS * 3);
  const clickTrailData = new Float32Array(MAX_TRAIL_POINTS * 3);
  const history: TrailPoint[] = [];
  const clickHistory: TrailPoint[] = [];

  let program: WebGLProgram | null = null;
  let vertexArray: WebGLVertexArrayObject | null = null;
  let positionBuffer: WebGLBuffer | null = null;
  let sourceTexture: WebGLTexture | null = null;
  let frameId = 0;
  let isVisible = false;
  let isDisposed = false;
  let textureReady = false;
  let textureWidth = 0;
  let textureHeight = 0;
  let hasRendered = false;
  let needsRedraw = true;
  let lastVideoTime = -1;
  let displayWidth = 0;
  let displayHeight = 0;
  let activePointer: TrailPoint | null = null;
  let lastRecordedPointer: TrailPoint | null = null;
  let activeClickPointer: TrailPoint | null = null;
  let lastRecordedClickPointer: TrailPoint | null = null;
  let clickPointerId: number | null = null;
  let clickPressedAt = 0;
  let releasedClickRadiusScale = 1;
  let intersectionObserver: IntersectionObserver | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let paletteObserver: MutationObserver | null = null;
  let mountObserver: MutationObserver | null = null;

  const disposeGlResources = () => {
    if (gl.isContextLost()) return;
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    if (vertexArray) gl.deleteVertexArray(vertexArray);
    if (sourceTexture) gl.deleteTexture(sourceTexture);
    if (program) gl.deleteProgram(program);
    positionBuffer = null;
    vertexArray = null;
    sourceTexture = null;
    program = null;
  };

  const dispose = () => {
    if (isDisposed) return;
    isDisposed = true;
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    intersectionObserver?.disconnect();
    resizeObserver?.disconnect();
    paletteObserver?.disconnect();
    mountObserver?.disconnect();
    abortController.abort();
    root.classList.remove('is-dither-active');
    delete root.dataset.mediaDitherInitialized;
    disposeGlResources();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };

  const failToSource = (reason: string) => {
    root.dataset.mediaDitherFallback = reason;
    dispose();
  };

  try {
    program = createProgram(gl);
    vertexArray = gl.createVertexArray();
    positionBuffer = gl.createBuffer();
    sourceTexture = gl.createTexture();
    if (!vertexArray || !positionBuffer || !sourceTexture) {
      throw new Error('Unable to allocate media dither WebGL resources.');
    }

    const positionLocation = gl.getAttribLocation(program, 'aPosition');
    if (positionLocation < 0) throw new Error('Missing media dither position attribute.');

    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.useProgram(program);
    gl.uniform1i(requiredUniform(gl, program, 'uSource'), 0);
    gl.uniform1i(
      requiredUniform(gl, program, 'uDitherGridSize'),
      Number(HERO_DITHER_SETTINGS.ditherGridSize) === 4 ? 4 : 5
    );
    gl.uniform1f(
      requiredUniform(gl, program, 'uMacroCellSize'),
      clamp(options.macroCellSize, 6, 30)
    );
    gl.uniform1f(
      requiredUniform(gl, program, 'uDitherStrength'),
      HERO_DITHER_SETTINGS.ditherStrength
    );
    gl.uniform1f(requiredUniform(gl, program, 'uBrightness'), clamp(options.brightness, 0.2, 1.5));
    gl.uniform1f(requiredUniform(gl, program, 'uContrast'), clamp(options.contrast, 0.5, 2));
    gl.uniform1f(
      requiredUniform(gl, program, 'uPlusThreshold'),
      HERO_DITHER_SETTINGS.plusThreshold
    );
    gl.uniform1f(requiredUniform(gl, program, 'uAccentTint'), clamp(options.accentTint, 0, 1));
    gl.uniform1f(requiredUniform(gl, program, 'uSourceScale'), Math.max(1, options.scale));
    gl.uniform2f(
      requiredUniform(gl, program, 'uSourcePosition'),
      clamp(options.positionX, 0, 1),
      clamp(options.positionY, 0, 1)
    );
    gl.uniform1f(requiredUniform(gl, program, 'uHoverRadius'), HOVER_RADIUS_CSS_PX);
    gl.uniform1f(
      requiredUniform(gl, program, 'uHoverBrightnessBoost'),
      HOVER_BRIGHTNESS_BOOST
    );
    gl.uniform1f(
      requiredUniform(gl, program, 'uHoverContrastScale'),
      HOVER_CONTRAST_SCALE
    );
    gl.uniform1f(
      requiredUniform(gl, program, 'uHoverPlusThresholdShift'),
      HOVER_PLUS_THRESHOLD_SHIFT
    );
    gl.uniform1f(requiredUniform(gl, program, 'uHoverTintBoost'), HOVER_TINT_BOOST);
    gl.uniform1f(requiredUniform(gl, program, 'uClickRadius'), CLICK_RADIUS_CSS_PX);
    gl.uniform1f(
      requiredUniform(gl, program, 'uClickTintOverdrive'),
      CLICK_TINT_OVERDRIVE
    );
    gl.uniform1f(
      requiredUniform(gl, program, 'uClickGlowStrength'),
      CLICK_GLOW_STRENGTH
    );
  } catch {
    failToSource('shader-or-resource-failure');
    return dispose;
  }

  const resolutionUniform = requiredUniform(gl, program, 'uResolution');
  const displaySizeUniform = requiredUniform(gl, program, 'uDisplaySize');
  const sourceSizeUniform = requiredUniform(gl, program, 'uSourceSize');
  const foregroundUniform = requiredUniform(gl, program, 'uForegroundColor');
  const backgroundUniform = requiredUniform(gl, program, 'uBackgroundColor');
  const accentUniform = requiredUniform(gl, program, 'uAccentColor');
  const trailCountUniform = requiredUniform(gl, program, 'uTrailCount');
  const trailPointsUniform = requiredUniform(gl, program, 'uTrailPoints[0]');
  const clickTrailCountUniform = requiredUniform(gl, program, 'uClickTrailCount');
  const clickTrailPointsUniform = requiredUniform(gl, program, 'uClickTrailPoints[0]');
  const clickRadiusScaleUniform = requiredUniform(gl, program, 'uClickRadiusScale');
  const clickActivationUniform = requiredUniform(gl, program, 'uClickActivation');

  const syncPalette = () => {
    if (isDisposed || !program) return;
    const foreground = readCssColor(HERO_DITHER_SETTINGS.foregroundColor);
    const background = readCssColor(HERO_DITHER_SETTINGS.backgroundColor);
    const accent = readCssColor('--accent');
    gl.useProgram(program);
    gl.uniform3f(foregroundUniform, foreground[0], foreground[1], foreground[2]);
    gl.uniform3f(backgroundUniform, background[0], background[1], background[2]);
    gl.uniform3f(accentUniform, accent[0], accent[1], accent[2]);
    needsRedraw = true;
  };

  const syncSize = () => {
    if (isDisposed || !program) return;
    const bounds = root.getBoundingClientRect();
    displayWidth = Math.max(1, bounds.width);
    displayHeight = Math.max(1, bounds.height);
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      HERO_DITHER_SETTINGS.maxDevicePixelRatio
    );
    const backingWidth = Math.max(1, Math.round(displayWidth * dpr));
    const backingHeight = Math.max(1, Math.round(displayHeight * dpr));

    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth;
      canvas.height = backingHeight;
      gl.viewport(0, 0, backingWidth, backingHeight);
    }

    gl.useProgram(program);
    gl.uniform2f(resolutionUniform, backingWidth, backingHeight);
    gl.uniform2f(displaySizeUniform, displayWidth, displayHeight);
    needsRedraw = true;
  };

  const uploadSource = () => {
    if (!program || !sourceTexture || !sourceIsReady(source)) return false;
    const { width, height } = sourceDimensions(source);
    if (width <= 0 || height <= 0) return false;

    try {
      gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
      if (isVideo) {
        // Allocate only when the decoded dimensions change. Subsequent video
        // frames update the existing texture rather than reallocating it.
        if (textureWidth !== width || textureHeight !== height) {
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
          );
          textureWidth = width;
          textureHeight = height;
        }
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          source
        );
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        textureWidth = width;
        textureHeight = height;
      }
      gl.useProgram(program);
      gl.uniform2f(sourceSizeUniform, width, height);
      textureReady = true;
      return true;
    } catch {
      failToSource('source-texture-failure');
      return false;
    }
  };

  const canRender = () =>
    !isDisposed &&
    isVisible &&
    !document.hidden &&
    sourceIsReady(source) &&
    displayWidth > 0 &&
    displayHeight > 0;

  const clickRadiusScaleAt = (elapsed: number) => {
    const progress = clamp(elapsed / CLICK_RADIUS_GROWTH_DURATION_MS, 0, 1);
    // A power curve keeps taps compact, then accelerates continuously as the
    // press gets longer. Unlike an ease-in-out, it does not slow down again
    // before reaching the existing maximum radius.
    const acceleratedProgress = progress ** 1.8;
    return CLICK_MIN_RADIUS_SCALE +
      (1 - CLICK_MIN_RADIUS_SCALE) * acceleratedProgress;
  };

  const syncTrail = (now: number) => {
    while (history.length && now - history[0].bornAt >= TRAIL_DURATION_MS) history.shift();
    while (
      clickHistory.length &&
      now - clickHistory[0].bornAt >= CLICK_TRAIL_DURATION_MS
    ) clickHistory.shift();

    const points = activePointer ? [...history, activePointer] : history;
    const visiblePoints = points.slice(-MAX_TRAIL_POINTS);
    trailData.fill(0);
    visiblePoints.forEach((point, index) => {
      const offset = index * 3;
      trailData[offset] = point.x;
      trailData[offset + 1] = point.y;
      trailData[offset + 2] = point === activePointer
        ? 0
        : clamp((now - point.bornAt) / TRAIL_DURATION_MS, 0, 1);
    });

    gl.uniform1i(trailCountUniform, visiblePoints.length);
    gl.uniform3fv(trailPointsUniform, trailData);

    // A small back-ease makes the pressed area grow slightly beyond its final
    // radius before settling. The trail keeps a stable activation after
    // release and continues to disappear through its normal time fade.
    const hasClickGesture = activeClickPointer !== null || clickHistory.length > 0;
    const attackProgress = hasClickGesture
      ? clamp((now - clickPressedAt) / CLICK_ATTACK_DURATION_MS, 0, 1)
      : 1;
    const shiftedAttack = attackProgress - 1;
    const springOvershoot = 1.9;
    const clickActivation = hasClickGesture
      ? 1 +
        (springOvershoot + 1) * shiftedAttack ** 3 +
        springOvershoot * shiftedAttack ** 2
      : 1;
    gl.uniform1f(clickActivationUniform, clickActivation);
    gl.uniform1f(
      clickRadiusScaleUniform,
      activeClickPointer
        ? clickRadiusScaleAt(now - clickPressedAt)
        : releasedClickRadiusScale
    );

    const clickPoints = activeClickPointer
      ? [...clickHistory, activeClickPointer]
      : clickHistory;
    const visibleClickPoints = clickPoints.slice(-MAX_TRAIL_POINTS);
    clickTrailData.fill(0);
    visibleClickPoints.forEach((point, index) => {
      const offset = index * 3;
      clickTrailData[offset] = point.x;
      clickTrailData[offset + 1] = point.y;
      clickTrailData[offset + 2] = point === activeClickPointer
        ? 0
        : clamp((now - point.bornAt) / CLICK_TRAIL_DURATION_MS, 0, 1);
    });

    gl.uniform1i(clickTrailCountUniform, visibleClickPoints.length);
    gl.uniform3fv(clickTrailPointsUniform, clickTrailData);

    return history.length > 0 || clickHistory.length > 0 || activeClickPointer !== null;
  };

  const render = (now: number) => {
    frameId = 0;
    if (!canRender() || !program || !sourceTexture || !vertexArray) return;

    if (
      isVideo &&
      !needsRedraw &&
      source.currentTime === lastVideoTime &&
      history.length === 0 &&
      clickHistory.length === 0 &&
      !activeClickPointer
    ) {
      frameId = requestAnimationFrame(render);
      return;
    }

    if (!textureReady || isVideo) {
      if (!uploadSource()) return;
    }

    gl.useProgram(program);
    const hasFadingTrail = syncTrail(now);
    gl.bindVertexArray(vertexArray);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    needsRedraw = false;
    if (isVideo) lastVideoTime = source.currentTime;

    if (!hasRendered) {
      hasRendered = true;
      root.classList.add('is-dither-active');
      root.dataset.mediaDitherInitialized = 'true';
    }

    if (isVideo || hasFadingTrail) frameId = requestAnimationFrame(render);
  };

  const requestRender = () => {
    if (!frameId && canRender()) frameId = requestAnimationFrame(render);
  };

  const pointerPosition = (event: Pick<PointerEvent, 'clientX' | 'clientY'>) => {
    const bounds = root.getBoundingClientRect();
    return {
      x: clamp(event.clientX - bounds.left, 0, bounds.width),
      y: clamp(event.clientY - bounds.top, 0, bounds.height),
      bornAt: performance.now(),
    };
  };

  if (interactionEnabled) {
    interactionTarget.addEventListener(
      'pointerenter',
      (event) => {
        if (event.pointerType === 'touch') return;
        activePointer = pointerPosition(event);
        lastRecordedPointer = activePointer;
        needsRedraw = true;
        requestRender();
      },
      { signal }
    );
    interactionTarget.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerType === 'touch') return;
        const next = pointerPosition(event);
        const distance = lastRecordedPointer
          ? Math.hypot(next.x - lastRecordedPointer.x, next.y - lastRecordedPointer.y)
          : Number.POSITIVE_INFINITY;

        if (activePointer && distance >= 9) {
          history.push({ ...activePointer, bornAt: next.bornAt });
          if (history.length > MAX_TRAIL_POINTS - 1) history.shift();
          lastRecordedPointer = next;
        }
        activePointer = next;
        if (activeClickPointer && event.pointerId === clickPointerId) {
          const clickDistance = lastRecordedClickPointer
            ? Math.hypot(
                next.x - lastRecordedClickPointer.x,
                next.y - lastRecordedClickPointer.y
              )
            : Number.POSITIVE_INFINITY;

          if (lastRecordedClickPointer && clickDistance >= 9) {
            // Pointer events can be sparse during a quick drag. Paint the
            // positions between events as well, so boost follows the whole
            // gesture instead of leaving a few disconnected hot spots.
            const segmentCount = Math.max(1, Math.ceil(clickDistance / 20));
            for (let segment = 0; segment < segmentCount; segment += 1) {
              const progress = segment / segmentCount;
              clickHistory.push({
                x: lastRecordedClickPointer.x +
                  (next.x - lastRecordedClickPointer.x) * progress,
                y: lastRecordedClickPointer.y +
                  (next.y - lastRecordedClickPointer.y) * progress,
                bornAt: lastRecordedClickPointer.bornAt +
                  (next.bornAt - lastRecordedClickPointer.bornAt) * progress,
              });
              if (clickHistory.length > MAX_TRAIL_POINTS - 1) clickHistory.shift();
            }
            lastRecordedClickPointer = next;
          }
          activeClickPointer = next;
        }
        needsRedraw = true;
        requestRender();
      },
      { passive: true, signal }
    );
    interactionTarget.addEventListener(
      'pointerleave',
      () => {
        if (activePointer) history.push({ ...activePointer, bornAt: performance.now() });
        activePointer = null;
        lastRecordedPointer = null;
        needsRedraw = true;
        requestRender();
      },
      { signal }
    );
    interactionTarget.addEventListener(
      'pointerdown',
      (event) => {
        if (!event.isPrimary || event.button !== 0) return;
        // The venue image itself has no click behavior, so suppressing the
        // browser's native image gesture is desirable there. The homepage
        // listens on its foreground scene instead, where links must stay live.
        if (interactionTarget === root) event.preventDefault();
        clickHistory.length = 0;
        activeClickPointer = pointerPosition(event);
        lastRecordedClickPointer = activeClickPointer;
        clickPressedAt = activeClickPointer.bornAt;
        releasedClickRadiusScale = CLICK_MIN_RADIUS_SCALE;
        clickPointerId = event.pointerId;
        if (interactionTarget === root) interactionTarget.setPointerCapture(event.pointerId);
        needsRedraw = true;
        requestRender();
      },
      { signal }
    );
    const releaseClickBoost = (event: PointerEvent) => {
      if (event.pointerId !== clickPointerId) return;
      const releasedAt = performance.now();
      releasedClickRadiusScale = clickRadiusScaleAt(releasedAt - clickPressedAt);
      if (activeClickPointer) {
        clickHistory.push({ ...activeClickPointer, bornAt: releasedAt });
        if (clickHistory.length > MAX_TRAIL_POINTS) clickHistory.shift();
      }
      activeClickPointer = null;
      lastRecordedClickPointer = null;
      clickPointerId = null;
      if (interactionTarget.hasPointerCapture(event.pointerId)) {
        interactionTarget.releasePointerCapture(event.pointerId);
      }
      needsRedraw = true;
      requestRender();
    };
    window.addEventListener('pointerup', releaseClickBoost, { signal });
    window.addEventListener('pointercancel', releaseClickBoost, { signal });
  }

  intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      isVisible = Boolean(entry?.isIntersecting);
      if (isVisible) requestRender();
      else if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    },
    { threshold: 0.01 }
  );
  intersectionObserver.observe(root);

  resizeObserver = new ResizeObserver(() => {
    syncSize();
    requestRender();
  });
  resizeObserver.observe(root);

  paletteObserver = new MutationObserver(() => {
    syncPalette();
    requestRender();
  });
  paletteObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-accent', 'style'],
  });

  mountObserver = new MutationObserver(() => {
    if (!root.isConnected) dispose();
  });
  mountObserver.observe(document.body, { childList: true, subtree: true });

  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden && frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      } else {
        requestRender();
      }
    },
    { signal }
  );
  source.addEventListener('load', () => {
    textureReady = false;
    requestRender();
  }, { signal });
  source.addEventListener('loadeddata', () => {
    textureReady = false;
    requestRender();
  }, { signal });
  source.addEventListener('playing', requestRender, { signal });
  source.addEventListener('dragstart', (event) => event.preventDefault(), { signal });
  canvas.addEventListener('webglcontextlost', () => failToSource('context-lost'), { signal });
  window.addEventListener('resize', syncSize, { passive: true, signal });
  document.addEventListener('astro:before-swap', dispose, { once: true, signal });

  syncPalette();
  syncSize();
  requestRender();

  return dispose;
}
