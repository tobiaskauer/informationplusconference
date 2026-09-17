import { HERO_DITHER_SETTINGS } from './heroDither';

export const IMAGE_OUTPUT_PRESETS = [
  { id: 'original', label: 'Original ratio', width: null, height: null },
  { id: 'portrait', label: 'Portrait post', width: 1080, height: 1350 },
  { id: 'square', label: 'Square post', width: 1080, height: 1080 },
  { id: 'story', label: 'Story', width: 1080, height: 1920 },
] as const;

export type ImageOutputPresetId = (typeof IMAGE_OUTPUT_PRESETS)[number]['id'];

interface RenderStillDitherOptions {
  source: CanvasImageSource;
  sourceWidth: number;
  sourceHeight: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
  scale: number;
  macroCellSize: number;
  brightness: number;
  contrast: number;
  accentTint: number;
}

export type Rgb = readonly [number, number, number];

export interface StillDitherRenderResult {
  foreground: Rgb;
  background: Rgb;
}

// Pattern size is calibrated against the 1080px-wide social presets. Scaling
// it with the exported width keeps the number of cells—and therefore the visual
// density—consistent when Original ratio uses a smaller or larger resolution.
const PATTERN_REFERENCE_WIDTH = 1080;

const RANKS_4 = [
  1, 14, 7, 11,
  6, 15, 3, 16,
  2, 9, 13, 10,
  8, 5, 12, 4,
] as const;

const RANKS_5 = [
  19, 24, 6, 11, 17,
  23, 10, 2, 16, 18,
  9, 3, 1, 4, 22,
  13, 15, 5, 21, 8,
  14, 20, 25, 7, 12,
] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Resolve the same CSS color tokens used by the live hero shader. */
function readCssColor(customProperty: string): Rgb {
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 1;
  colorCanvas.height = 1;
  const context = colorCanvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [0, 0, 0];

  context.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue(customProperty)
    .trim();
  context.fillRect(0, 0, 1, 1);
  const pixel = context.getImageData(0, 0, 1, 1).data;
  return [pixel[0], pixel[1], pixel[2]];
}

/**
 * Apply the hero's ordered-dither and bright-cell plus-symbol treatment to one
 * still image. This deliberately mirrors the shader math in heroDither.ts so
 * exported social assets and the homepage video belong to the same system.
 */
export function renderStillDither({
  source,
  sourceWidth,
  sourceHeight,
  canvas,
  width,
  height,
  positionX,
  positionY,
  scale,
  macroCellSize,
  brightness,
  contrast,
  accentTint,
}: RenderStillDitherOptions) {
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = width;
  sampleCanvas.height = height;
  const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
  const outputContext = canvas.getContext('2d');
  if (!sampleContext || !outputContext) throw new Error('Canvas rendering is unavailable.');

  canvas.width = width;
  canvas.height = height;

  // Reproduce CSS `object-fit: cover` plus `object-position`. Values above 1
  // zoom further into the already-covered image without exposing empty edges.
  const coverScale = Math.max(width / sourceWidth, height / sourceHeight);
  const renderedScale = coverScale * Math.max(1, scale);
  const renderedWidth = sourceWidth * renderedScale;
  const renderedHeight = sourceHeight * renderedScale;
  const offsetX = -(renderedWidth - width) * clamp(positionX, 0, 1);
  const offsetY = -(renderedHeight - height) * clamp(positionY, 0, 1);
  sampleContext.imageSmoothingEnabled = true;
  sampleContext.imageSmoothingQuality = 'high';
  sampleContext.drawImage(source, offsetX, offsetY, renderedWidth, renderedHeight);

  const input = sampleContext.getImageData(0, 0, width, height).data;
  const output = outputContext.createImageData(width, height);
  const pixels = output.data;
  const configuredGridSize = Number(HERO_DITHER_SETTINGS.ditherGridSize);
  const gridSize: 4 | 5 = configuredGridSize === 4 ? 4 : 5;
  const ranks = gridSize === 4 ? RANKS_4 : RANKS_5;
  const cellSize = Math.max(
    1,
    macroCellSize * (width / PATTERN_REFERENCE_WIDTH)
  );
  const ditherSubpixelSize = cellSize / gridSize;
  const symbolSubpixelSize = cellSize / 5;
  const defaultForeground = readCssColor(HERO_DITHER_SETTINGS.foregroundColor);
  const accent = readCssColor('--accent');
  const tintAmount = clamp(accentTint, 0, 1);
  const foreground: Rgb = [
    Math.round(defaultForeground[0] + (accent[0] - defaultForeground[0]) * tintAmount),
    Math.round(defaultForeground[1] + (accent[1] - defaultForeground[1]) * tintAmount),
    Math.round(defaultForeground[2] + (accent[2] - defaultForeground[2]) * tintAmount),
  ];
  const background = readCssColor(HERO_DITHER_SETTINGS.backgroundColor);

  const luminanceAt = (x: number, y: number) => {
    const safeX = clamp(Math.floor(x), 0, width - 1);
    const safeY = clamp(Math.floor(y), 0, height - 1);
    const index = (safeY * width + safeX) * 4;
    let luminance = (input[index] + input[index + 1] + input[index + 2]) / (3 * 255);
    luminance = (luminance - 0.5) * contrast + 0.5;
    return clamp(luminance * brightness, 0, 1);
  };

  for (let y = 0; y < height; y += 1) {
    const macroY = Math.floor(y / cellSize) * cellSize;
    const ditherY = clamp(Math.floor((y - macroY) / ditherSubpixelSize), 0, gridSize - 1);
    const symbolY = clamp(Math.floor((y - macroY) / symbolSubpixelSize), 0, 4);

    for (let x = 0; x < width; x += 1) {
      const macroX = Math.floor(x / cellSize) * cellSize;
      const ditherX = clamp(Math.floor((x - macroX) / ditherSubpixelSize), 0, gridSize - 1);
      const symbolX = clamp(Math.floor((x - macroX) / symbolSubpixelSize), 0, 4);
      const macroLuminance = luminanceAt(
        macroX + cellSize * 0.5,
        macroY + cellSize * 0.5
      );

      let color: Rgb;
      // Decide the plus once from the macro-cell center. Sampling per output
      // pixel would let image detail fragment what should be one crisp glyph.
      if (macroLuminance >= HERO_DITHER_SETTINGS.plusThreshold) {
        const verticalStroke = symbolX === 2 && symbolY >= 1 && symbolY <= 3;
        const horizontalStroke = symbolY === 2 && symbolX >= 1 && symbolX <= 3;
        color = verticalStroke || horizontalStroke ? foreground : background;
      } else {
        const sampleX = macroX + (ditherX + 0.5) * ditherSubpixelSize;
        const sampleY = macroY + (ditherY + 0.5) * ditherSubpixelSize;
        const luminance = luminanceAt(sampleX, sampleY);
        const rank = ranks[ditherY * gridSize + ditherX];
        const orderedThreshold = (rank - 0.5) / (gridSize * gridSize);
        const threshold =
          0.5 +
          (orderedThreshold - 0.5) * clamp(HERO_DITHER_SETTINGS.ditherStrength, 0, 1);
        color = luminance >= threshold ? foreground : background;
      }

      const outputIndex = (y * width + x) * 4;
      pixels[outputIndex] = color[0];
      pixels[outputIndex + 1] = color[1];
      pixels[outputIndex + 2] = color[2];
      pixels[outputIndex + 3] = 255;
    }
  }

  outputContext.putImageData(output, 0, 0);
  return { foreground, background } satisfies StillDitherRenderResult;
}

interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const rgbToHex = ([red, green, blue]: Rgb) =>
  `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`;

const isColor = (pixels: Uint8ClampedArray, index: number, color: Rgb) =>
  pixels[index] === color[0] &&
  pixels[index + 1] === color[1] &&
  pixels[index + 2] === color[2] &&
  pixels[index + 3] === 255;

/**
 * Convert the rendered two-color bitmap into vertically merged rectangles.
 * Adjacent pixels become one compound path rather than thousands of separate
 * SVG objects, keeping recoloring practical after importing the file in Figma.
 */
function foregroundRectangles(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  foreground: Rgb
) {
  const rectangles: PixelRect[] = [];
  let activeRuns = new Map<string, PixelRect>();

  for (let y = 0; y < height; y += 1) {
    const nextRuns = new Map<string, PixelRect>();
    let x = 0;

    while (x < width) {
      const pixelIndex = (y * width + x) * 4;
      if (!isColor(pixels, pixelIndex, foreground)) {
        x += 1;
        continue;
      }

      const startX = x;
      x += 1;
      while (x < width && isColor(pixels, (y * width + x) * 4, foreground)) x += 1;

      const runWidth = x - startX;
      const key = `${startX}:${runWidth}`;
      const active = activeRuns.get(key);
      if (active) {
        active.height += 1;
        nextRuns.set(key, active);
      } else {
        nextRuns.set(key, { x: startX, y, width: runWidth, height: 1 });
      }
    }

    for (const [key, rectangle] of activeRuns) {
      if (!nextRuns.has(key)) rectangles.push(rectangle);
    }
    activeRuns = nextRuns;
  }

  rectangles.push(...activeRuns.values());
  return rectangles;
}

/** Create a true two-layer vector version of the current canvas output. */
export function createStillDitherSvg(
  canvas: HTMLCanvasElement,
  { foreground, background }: StillDitherRenderResult
) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas export is unavailable.');

  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  const path = foregroundRectangles(pixels, width, height, foreground)
    .map(({ x, y, width: rectWidth, height: rectHeight }) =>
      `M${x} ${y}h${rectWidth}v${rectHeight}h-${rectWidth}z`
    )
    .join('');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
    '  <title>Information+ dither image</title>',
    `  <rect id="background" width="${width}" height="${height}" fill="${rgbToHex(background)}"/>`,
    `  <path id="dither-marks" fill="${rgbToHex(foreground)}" d="${path}"/>`,
    '</svg>',
  ].join('\n');
}
