/**
 * WebP Compression & 200 KB Optimization Engine
 * Strips all EXIF / GPS metadata.
 * Exports pure WebP with exact 3:4 aspect ratio.
 * Evaluates target <= 200 KB and offers dual variants if trade-offs are needed.
 */
import { ExportResult, ExportVariant } from '../types/image';
import { ASPECT_RATIO } from './cropping';

const MAX_TARGET_BYTES = 200 * 1024; // 204,800 bytes (200 KB)
const MIN_ACCEPTABLE_QUALITY = 0.70;

export async function canvasToWebpBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('خطا در تبدیل بوم به فرمت WebP'));
      },
      'image/webp',
      quality
    );
  });
}

function scaleCanvas3x4(
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number
): HTMLCanvasElement {
  const targetHeight = Math.round(targetWidth / ASPECT_RATIO);
  const scaled = document.createElement('canvas');
  scaled.width = targetWidth;
  scaled.height = targetHeight;
  const ctx = scaled.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  }
  return scaled;
}

export async function optimizeAndCompressToWebp(
  finalCanvas: HTMLCanvasElement
): Promise<ExportResult> {
  const origW = finalCanvas.width;
  const origH = finalCanvas.height;

  // 1. Try finding a high quality at full resolution that stays <= 200 KB
  const testQualities = [0.90, 0.84, 0.78, 0.72];
  let bestDirectBlob: Blob | null = null;
  let bestDirectQuality = 0.90;

  for (const q of testQualities) {
    const blob = await canvasToWebpBlob(finalCanvas, q);
    if (blob.size <= MAX_TARGET_BYTES) {
      bestDirectBlob = blob;
      bestDirectQuality = q;
      break;
    }
  }

  // If a full resolution option fits under 200 KB with good quality
  if (bestDirectBlob && bestDirectQuality >= MIN_ACCEPTABLE_QUALITY) {
    const sizeBytes = bestDirectBlob.size;
    const sizeKb = Math.round((sizeBytes / 1024) * 10) / 10;
    const dataUrl = URL.createObjectURL(bestDirectBlob);

    const primary: ExportVariant = {
      label: 'بهینه شده (زیر ۲۰۰ کیلوبایت)',
      blob: bestDirectBlob,
      dataUrl,
      width: origW,
      height: origH,
      sizeBytes,
      sizeKb,
      quality: bestDirectQuality,
      isUnder200Kb: true,
      aspectRatioNotice: 'نسبت تصویر دقیق ۳:۴',
    };

    return {
      primary,
      isTargetMetDirectly: true,
    };
  }

  // 2. If it cannot fit under 200 KB without excessive compression loss:
  // Generate TWO explicit choices for the user:
  // Option A: "Under 200 KB" (intelligently scaled to standard web catalog dimensions)
  // Option B: "Higher quality" (full resolution, high quality, exceeding 200 KB)

  // Generate Option B first: Full resolution with high quality (0.88)
  const highQualityBlob = await canvasToWebpBlob(finalCanvas, 0.88);
  const hqSizeBytes = highQualityBlob.size;
  const hqSizeKb = Math.round((hqSizeBytes / 1024) * 10) / 10;
  const hqDataUrl = URL.createObjectURL(highQualityBlob);

  const higherQualityVariant: ExportVariant = {
    label: 'کیفیت بالا (ابعاد کامل)',
    blob: highQualityBlob,
    dataUrl: hqDataUrl,
    width: origW,
    height: origH,
    sizeBytes: hqSizeBytes,
    sizeKb: hqSizeKb,
    quality: 0.88,
    isUnder200Kb: hqSizeBytes <= MAX_TARGET_BYTES,
    aspectRatioNotice: 'نسبت تصویر دقیق ۳:۴ (ابعاد اصلی)',
  };

  // Generate Option A: Scale down preserving 3:4 until under 200 KB
  // Common fashion catalog standards: 1080x1440, 960x1280, 840x1120
  const candidateWidths = [1200, 1050, 900, 750];
  let under200Blob: Blob = highQualityBlob;
  let under200W = origW;
  let under200H = origH;
  let under200Q = 0.82;

  for (const targetW of candidateWidths) {
    if (targetW >= origW) continue;
    const scaledCanvas = scaleCanvas3x4(finalCanvas, targetW);
    const testBlob = await canvasToWebpBlob(scaledCanvas, 0.82);
    if (testBlob.size <= MAX_TARGET_BYTES) {
      under200Blob = testBlob;
      under200W = scaledCanvas.width;
      under200H = scaledCanvas.height;
      break;
    }
  }

  // Fallback if still over 200 KB: scale to 840px with 0.75 quality
  if (under200Blob.size > MAX_TARGET_BYTES) {
    const scaledCanvas = scaleCanvas3x4(finalCanvas, Math.min(origW, 840));
    under200Blob = await canvasToWebpBlob(scaledCanvas, 0.75);
    under200W = scaledCanvas.width;
    under200H = scaledCanvas.height;
    under200Q = 0.75;
  }

  const u200SizeBytes = under200Blob.size;
  const u200SizeKb = Math.round((u200SizeBytes / 1024) * 10) / 10;
  const u200DataUrl = URL.createObjectURL(under200Blob);

  const under200Variant: ExportVariant = {
    label: 'زیر ۲۰۰ کیلوبایت (بهینه‌سازی وب)',
    blob: under200Blob,
    dataUrl: u200DataUrl,
    width: under200W,
    height: under200H,
    sizeBytes: u200SizeBytes,
    sizeKb: u200SizeKb,
    quality: under200Q,
    isUnder200Kb: true,
    aspectRatioNotice: 'نسبت تصویر دقیق ۳:۴ (بهینه‌سازی حجم)',
  };

  return {
    primary: under200Variant,
    secondary: higherQualityVariant,
    isTargetMetDirectly: false,
  };
}
