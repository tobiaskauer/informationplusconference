/** Hero dither tuning. Changes appear after reloading the page. */
export const HERO_DITHER_SETTINGS = Object.freeze({
  // Active ordered-dither matrix. Use 5 for the experimental unified grid;
  // change this to 4 to restore the original custom 4×4 matrix below.
  ditherGridSize: 5,

  // Macro-cell size in CSS pixels. It is divided by ditherGridSize for normal
  // dithering and by 5 for the +. Multiples of the active size produce whole
  // CSS-pixel subpixels; 10–20 makes the repeated symbol easy to inspect.
  macroCellSize: 12,

  // CSS custom-property names used for lit and unlit pixels. Define additional
  // tokens in global.css rather than putting hex values here. Swap these two
  // values to invert the effect; --accent also works as a colored foreground.
  foregroundColor: '--hero-dither-foreground',
  backgroundColor: '--bg',

  // Ordered-dither amount: 0 = plain luminance cutoff, 0.6–1 = useful range,
  // 1 = the full custom matrix. The shader clamps values to the 0–1 range.
  ditherStrength: 1,

  // Overall density of light pixels. Roughly 0.5–1.5 is useful; lower values
  // darken/sparsify the field and higher values brighten/fill it.
  videoBrightness: 0.6,

  // Tonal separation. Try 0.5–2: lower retains more midtone dithering, while
  // higher produces harder silhouettes and clearer bright/dark regions.
  videoContrast: 1,

  // After brightness/contrast adjustment, cells at or above this luminance
  // become a small + instead of regular dithering. With brightness at 0.6,
  // roughly 0.48–0.58 is useful; set above 1 to disable the symbol entirely.
  plusThreshold: 0.52,

  // Canvas resolution cap. 1 is cheaper; 2 stays sharp on Retina displays.
  // Values above 2 cost considerably more without refining the CSS-size grid.
  maxDevicePixelRatio: 2,
});

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

uniform sampler2D uVideo;
uniform vec2 uResolution;
uniform vec2 uDisplaySize;
uniform vec2 uVideoSize;
uniform int uDitherGridSize;
uniform float uMacroCellSize;
uniform float uDitherStrength;
uniform float uVideoBrightness;
uniform float uVideoContrast;
uniform float uPlusThreshold;
uniform vec3 uForegroundColor;
uniform vec3 uBackgroundColor;

out vec4 outColor;

// Original matrix: retained intact so ditherGridSize: 4 remains an immediate
// rollback path for this experiment.
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

// Experimental 5×5 threshold order. Ranks 1–5 form the centered + at the
// requested 1-based cells: (2,3), (3,2), (3,3), (3,4), and (4,3).
// Remaining ranks retain a dispersed order around the symbol.
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

// Convert a top-left-origin CSS position to the centered object-fit: cover UV
// used by the existing HTML video.
vec2 videoUvAt(vec2 cssPosition) {
  float coverScale = max(
    uDisplaySize.x / uVideoSize.x,
    uDisplaySize.y / uVideoSize.y
  );
  vec2 renderedVideoSize = uVideoSize * coverScale;
  vec2 renderedVideoOrigin = (uDisplaySize - renderedVideoSize) * 0.5;
  vec2 videoPosition = (cssPosition - renderedVideoOrigin) / renderedVideoSize;
  return vec2(videoPosition.x, 1.0 - videoPosition.y);
}

float luminanceAt(vec2 cssPosition) {
  vec3 videoColor = texture(uVideo, clamp(videoUvAt(cssPosition), 0.0, 1.0)).rgb;
  float luminance = (videoColor.r + videoColor.g + videoColor.b) / 3.0;
  luminance = (luminance - 0.5) * uVideoContrast + 0.5;
  return clamp(luminance * uVideoBrightness, 0.0, 1.0);
}

void main() {
  // Work in top-left-origin CSS pixels. This keeps every macro-cell anchored
  // to the viewport independently of the canvas backing-buffer DPR.
  vec2 cssPosition = vec2(
    gl_FragCoord.x / uResolution.x * uDisplaySize.x,
    (1.0 - gl_FragCoord.y / uResolution.y) * uDisplaySize.y
  );

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

  float luminance = luminanceAt(samplePosition);

  // Half-step thresholds preserve fully dark and fully bright endpoints.
  float rank = uDitherGridSize == 5
    ? thresholdRank5(matrixPosition)
    : thresholdRank4(matrixPosition);
  float orderedThreshold = (rank - 0.5) / (gridSize * gridSize);
  float threshold = mix(0.5, orderedThreshold, clamp(uDitherStrength, 0.0, 1.0));
  vec3 ditheredColor = luminance >= threshold
    ? uForegroundColor
    : uBackgroundColor;

  // Decide symbol activation once per whole macro-cell, using its center video
  // sample. The previous per-subpixel decision could fragment a single + when
  // the underlying video varied within the cell.
  vec2 macroCellCenter = macroCellOrigin + vec2(uMacroCellSize * 0.5);
  float macroCellLuminance = luminanceAt(macroCellCenter);

  // Bright cells use a separate 5×5 symbol grid, giving the + a full empty
  // border on every side:
  //   .....
  //   ..#..
  //   .###.
  //   ..#..
  //   .....
  float symbolSubpixelSize = uMacroCellSize / 5.0;
  ivec2 symbolPosition = ivec2(
    clamp(
      floor((cssPosition - macroCellOrigin) / symbolSubpixelSize),
      vec2(0.0),
      vec2(4.0)
    )
  );
  bool verticalStroke =
    symbolPosition.x == 2 && symbolPosition.y >= 1 && symbolPosition.y <= 3;
  bool horizontalStroke =
    symbolPosition.y == 2 && symbolPosition.x >= 1 && symbolPosition.x <= 3;
  bool isPlusPixel = verticalStroke || horizontalStroke;
  vec3 finalColor = macroCellLuminance >= uPlusThreshold
    ? (isPlusPixel ? uForegroundColor : uBackgroundColor)
    : ditheredColor;

  outColor = vec4(finalColor, 1.0);
}
`;

type Rgb = readonly [number, number, number];

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create the hero dither shader.');

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
    if (!program) throw new Error('Unable to create the hero dither program.');

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
  if (location === null) throw new Error(`Missing hero dither uniform: ${name}`);
  return location;
}

/** Resolve any modern CSS color (including OKLCH and var()) to sRGB once. */
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

/**
 * Enhance the existing video in `root` with WebGL2. The original video stays
 * in the DOM and is only visually covered after the first successful draw.
 */
export function initHeroDither(root: HTMLElement) {
  const video = root.querySelector<HTMLVideoElement>('.hero-video');
  const canvas = root.querySelector<HTMLCanvasElement>('.hero-dither-canvas');
  if (!video || !canvas || root.dataset.heroDitherInitialized === 'true') {
    return () => {};
  }

  // Development-only fallback hook used for visual QA. It is compiled out of
  // production and never exposes a control in the interface.
  if (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has('heroDitherFallback')
  ) {
    root.dataset.heroDitherFallback = 'forced';
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
    root.dataset.heroDitherFallback = 'webgl2-unavailable';
    return () => {};
  }

  let program: WebGLProgram | null = null;
  let vertexArray: WebGLVertexArrayObject | null = null;
  let positionBuffer: WebGLBuffer | null = null;
  let videoTexture: WebGLTexture | null = null;
  let frameId = 0;
  let isVisible = false;
  let isDisposed = false;
  let hasRendered = false;
  let needsRedraw = true;
  let lastVideoTime = -1;
  let textureWidth = 0;
  let textureHeight = 0;
  let displayWidth = 0;
  let displayHeight = 0;
  const abortController = new AbortController();
  const { signal } = abortController;
  const readCssColor = createCssColorReader();

  const disposeGlResources = () => {
    if (gl.isContextLost()) return;
    if (positionBuffer) gl.deleteBuffer(positionBuffer);
    if (vertexArray) gl.deleteVertexArray(vertexArray);
    if (videoTexture) gl.deleteTexture(videoTexture);
    if (program) gl.deleteProgram(program);
    positionBuffer = null;
    vertexArray = null;
    videoTexture = null;
    program = null;
  };

  let intersectionObserver: IntersectionObserver | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let paletteObserver: MutationObserver | null = null;
  let mountObserver: MutationObserver | null = null;

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
    delete root.dataset.heroDitherInitialized;
    disposeGlResources();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };

  const failToVideo = (reason: string) => {
    root.dataset.heroDitherFallback = reason;
    dispose();
  };

  try {
    program = createProgram(gl);
    vertexArray = gl.createVertexArray();
    positionBuffer = gl.createBuffer();
    videoTexture = gl.createTexture();
    if (!vertexArray || !positionBuffer || !videoTexture) {
      throw new Error('Unable to allocate hero dither WebGL resources.');
    }

    const positionLocation = gl.getAttribLocation(program, 'aPosition');
    if (positionLocation < 0) throw new Error('Missing hero dither position attribute.');

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
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.useProgram(program);
    gl.uniform1i(requiredUniform(gl, program, 'uVideo'), 0);
    gl.uniform1i(
      requiredUniform(gl, program, 'uDitherGridSize'),
      HERO_DITHER_SETTINGS.ditherGridSize
    );
    gl.uniform1f(
      requiredUniform(gl, program, 'uMacroCellSize'),
      HERO_DITHER_SETTINGS.macroCellSize
    );
    gl.uniform1f(
      requiredUniform(gl, program, 'uDitherStrength'),
      HERO_DITHER_SETTINGS.ditherStrength
    );
    gl.uniform1f(
      requiredUniform(gl, program, 'uVideoBrightness'),
      HERO_DITHER_SETTINGS.videoBrightness
    );
    gl.uniform1f(
      requiredUniform(gl, program, 'uVideoContrast'),
      HERO_DITHER_SETTINGS.videoContrast
    );
    gl.uniform1f(
      requiredUniform(gl, program, 'uPlusThreshold'),
      HERO_DITHER_SETTINGS.plusThreshold
    );
  } catch {
    failToVideo('shader-or-resource-failure');
    return dispose;
  }

  // Locations and typed arrays are resolved once, never inside the frame loop.
  const resolutionUniform = requiredUniform(gl, program, 'uResolution');
  const displaySizeUniform = requiredUniform(gl, program, 'uDisplaySize');
  const videoSizeUniform = requiredUniform(gl, program, 'uVideoSize');
  const foregroundUniform = requiredUniform(gl, program, 'uForegroundColor');
  const backgroundUniform = requiredUniform(gl, program, 'uBackgroundColor');

  const syncPalette = () => {
    if (isDisposed || !program) return;
    const foreground = readCssColor(HERO_DITHER_SETTINGS.foregroundColor);
    const background = readCssColor(HERO_DITHER_SETTINGS.backgroundColor);
    gl.useProgram(program);
    gl.uniform3f(foregroundUniform, foreground[0], foreground[1], foreground[2]);
    gl.uniform3f(backgroundUniform, background[0], background[1], background[2]);
    needsRedraw = true;
  };

  const syncSize = () => {
    if (isDisposed || !program) return;
    const bounds = root.getBoundingClientRect();
    displayWidth = Math.max(1, bounds.width);
    displayHeight = Math.max(1, bounds.height);
    const dpr = Math.min(window.devicePixelRatio || 1, HERO_DITHER_SETTINGS.maxDevicePixelRatio);
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

  const canRender = () =>
    !isDisposed &&
    isVisible &&
    !document.hidden &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0;

  const render = () => {
    frameId = 0;
    if (!canRender() || !program || !videoTexture || !vertexArray) return;

    // The source is ~25fps on a commonly 60Hz display. Keep rAF as the sole
    // scheduler, but avoid re-uploading an identical decoded frame.
    if (!needsRedraw && video.currentTime === lastVideoTime) {
      frameId = requestAnimationFrame(render);
      return;
    }

    if (textureWidth !== video.videoWidth || textureHeight !== video.videoHeight) {
      textureWidth = video.videoWidth;
      textureHeight = video.videoHeight;
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        textureWidth,
        textureHeight,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
      gl.uniform2f(videoSizeUniform, textureWidth, textureHeight);
    }

    try {
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        video
      );
    } catch {
      failToVideo('video-texture-failure');
      return;
    }

    gl.useProgram(program);
    gl.bindVertexArray(vertexArray);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    lastVideoTime = video.currentTime;
    needsRedraw = false;

    if (!hasRendered) {
      hasRendered = true;
      root.classList.add('is-dither-active');
      root.dataset.heroDitherInitialized = 'true';
    }
    frameId = requestAnimationFrame(render);
  };

  const requestRender = () => {
    if (!frameId && canRender()) frameId = requestAnimationFrame(render);
  };

  // There are intentionally no time-based shader transitions or distortions.
  // Reduced-motion visitors retain the site's existing video behavior without
  // receiving any additional motion from this enhancement.

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

  // The palette prototype changes CSS variables through root attributes/style.
  paletteObserver = new MutationObserver(syncPalette);
  paletteObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-accent', 'style'],
  });

  // Astro currently performs full-page navigation, but this also disposes the
  // renderer if the component is ever removed by a future client-side router.
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
  window.addEventListener('resize', syncSize, { passive: true, signal });
  video.addEventListener('loadeddata', requestRender, { signal });
  video.addEventListener('playing', requestRender, { signal });
  canvas.addEventListener('webglcontextlost', () => failToVideo('context-lost'), { signal });
  document.addEventListener('astro:before-swap', dispose, { once: true, signal });

  syncPalette();
  syncSize();
  requestRender();

  return dispose;
}
