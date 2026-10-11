/**
 * Color and Lighting Adjustment Engine
 * Supports gentle automatic correction, manual brightness/contrast/saturation/warmth,
 * and two distinct color styles: Natural (preserves true fabric dyes) and Enhanced (vivid).
 */
import { ColorAdjustments } from '../types/image';

export const DEFAULT_COLOR_ADJUSTMENTS: ColorAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  style: 'natural',
  autoCorrect: false,
};

export function applyColorAdjustments(
  sourceCanvas: HTMLCanvasElement,
  adjustments: ColorAdjustments
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d', { willReadFrequently: true });
  if (!outCtx) return sourceCanvas;

  const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) return sourceCanvas;

  const srcImageData = srcCtx.getImageData(0, 0, width, height);
  const data = srcImageData.data;

  // 1. Calculate auto-correction parameters if requested
  let autoMin = 0;
  let autoMax = 255;
  if (adjustments.autoCorrect) {
    const range = computeAutoLuminanceRange(data, width * height);
    autoMin = range.min;
    autoMax = range.max;
  }

  // Pre-calculate adjustment factors
  const isEnhanced = adjustments.style === 'enhanced';

  // Base adjustments + style modifiers
  const styleContrast = isEnhanced ? 6 : 0;
  const styleSaturation = isEnhanced ? 12 : 0;

  const effectiveBrightness = adjustments.brightness * 1.2;
  const effectiveContrast = (adjustments.contrast + styleContrast) * 1.5;
  const effectiveSaturation = (adjustments.saturation + styleSaturation) * 1.4;
  const effectiveWarmth = adjustments.warmth * 0.8;

  // Contrast factor: (259 * (C + 255)) / (255 * (259 - C))
  const contrastFactor =
    (259 * (effectiveContrast + 255)) / (255 * (259 - effectiveContrast));

  // Saturation factor
  const satFactor = 1 + effectiveSaturation / 100;

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    let r = data[idx];
    let g = data[idx + 1];
    let b = data[idx + 2];
    const a = data[idx + 3];

    // If completely transparent, skip
    if (a === 0) continue;

    // A. Auto dynamic range stretch
    if (adjustments.autoCorrect && autoMax > autoMin) {
      r = ((r - autoMin) / (autoMax - autoMin)) * 255;
      g = ((g - autoMin) / (autoMax - autoMin)) * 255;
      b = ((b - autoMin) / (autoMax - autoMin)) * 255;
    }

    // B. Brightness
    r += effectiveBrightness;
    g += effectiveBrightness;
    b += effectiveBrightness;

    // C. Contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // D. Warmth / White Balance
    if (effectiveWarmth !== 0) {
      r += effectiveWarmth * 1.2;
      b -= effectiveWarmth * 1.2;
    }

    // E. Saturation (luminance preserve)
    if (satFactor !== 1) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = lum + (r - lum) * satFactor;
      g = lum + (g - lum) * satFactor;
      b = lum + (b - lum) * satFactor;
    }

    data[idx] = Math.max(0, Math.min(255, Math.round(r)));
    data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }

  outCtx.putImageData(srcImageData, 0, 0);
  return outputCanvas;
}

function computeAutoLuminanceRange(
  data: Uint8ClampedArray,
  pixelCount: number
): { min: number; max: number } {
  // Build histogram
  const hist = new Uint32Array(256);
  const step = Math.max(1, Math.floor(pixelCount / 10000));
  let sampled = 0;

  for (let i = 0; i < pixelCount; i += step) {
    const idx = i * 4;
    if (data[idx + 3] === 0) continue;
    const lum = Math.round(
      0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
    );
    hist[lum]++;
    sampled++;
  }

  // Find 1st percentile and 99th percentile
  let count = 0;
  let min = 0;
  const minTarget = sampled * 0.015;
  for (let i = 0; i < 256; i++) {
    count += hist[i];
    if (count >= minTarget) {
      min = i;
      break;
    }
  }

  count = 0;
  let max = 255;
  const maxTarget = sampled * 0.015;
  for (let i = 255; i >= 0; i--) {
    count += hist[i];
    if (count >= maxTarget) {
      max = i;
      break;
    }
  }

  return { min: Math.min(min, 30), max: Math.max(max, 225) };
}
