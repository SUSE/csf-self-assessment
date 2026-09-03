const BAND = Object.freeze({ light: [0.43, 0.77], dark: [0.48, 0.67] });
const CHROMA_FLOOR = 0.1;
const CVD_TARGET = 8;
const CVD_FLOOR = 6;
const NORMAL_FLOOR = 15;
const CONTRAST_MIN = 3;

const MACHADO = Object.freeze({
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
});

const s2lin = (channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
const linearRgb = (hex) => [1, 3, 5].map((start) => s2lin(Number.parseInt(hex.slice(start, start + 2), 16) / 255));

function oklabFromLinear([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const oklab = (hex) => oklabFromLinear(linearRgb(hex));
const oklch = (hex) => {
  const [L, a, b] = oklab(hex);
  return [L, Math.hypot(a, b)];
};

function simulated(hex, kind) {
  const [r, g, b] = linearRgb(hex);
  const matrix = MACHADO[kind];
  const clamp = (channel) => Math.max(0, Math.min(1, channel));
  return [
    clamp(matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b),
    clamp(matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b),
    clamp(matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b),
  ];
}

function deltaE(left, right, kind) {
  const a = oklabFromLinear(kind ? simulated(left, kind) : linearRgb(left));
  const b = oklabFromLinear(kind ? simulated(right, kind) : linearRgb(right));
  return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function contrast(left, right) {
  const luminance = (hex) => {
    const [r, g, b] = linearRgb(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

export function validateCategoricalPalette(palette, { mode, surface, pairs = 'adjacent' }) {
  const [low, high] = BAND[mode];
  const pairList = pairs === 'all'
    ? palette.flatMap((_, index) => palette.slice(index + 1).map((__, offset) => [index, index + offset + 1]))
    : palette.slice(1).map((_, index) => [index, index + 1]);
  const lightness = palette.every((color) => {
    const [L] = oklch(color);
    return L >= low && L <= high;
  });
  const chroma = palette.every((color) => oklch(color)[1] >= CHROMA_FLOOR);
  const cvd = Math.min(...['protan', 'deutan'].flatMap((kind) => pairList.map(([a, b]) => deltaE(palette[a], palette[b], kind))));
  const normal = Math.min(...pairList.map(([a, b]) => deltaE(palette[a], palette[b])));
  const lowContrast = palette.filter((color) => contrast(color, surface) < CONTRAST_MIN);
  return {
    ok: lightness && chroma && cvd >= CVD_FLOOR && normal >= NORMAL_FLOOR,
    checks: {
      lightness,
      chroma,
      cvd: cvd >= CVD_TARGET ? 'pass' : cvd >= CVD_FLOOR ? 'relief' : 'fail',
      normal: normal >= NORMAL_FLOOR,
      contrast: lowContrast.length === 0 ? 'pass' : 'relief',
    },
    measurements: { cvd, normal, lowContrast },
  };
}
