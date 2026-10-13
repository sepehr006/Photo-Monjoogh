/**
 * WebP Compression & 200 KB Optimization Engine
 * Strips all EXIF / GPS / device metadata.
 * Exports pure WebP with exact 3:4 aspect ratio.
 * Evaluates target <= 200 KB and offers dual variants if trade-offs are needed:
 *   - Primary: Optimized for web & e-commerce catalogs (strictly <= 200 KB, crisp 3:4 ratio)
 *   - Secondary: High Quality (full crop resolution, ~0.88 quality)
 */
import { ExportResult, ExportVariant } from '../types/image';
import { ASPECT_RATIO } from './cropping';

const MAX_TARGET_BYTES = 200 * 1024; // 204,800 bytes (200 KB)
const MIN_ACCEPTABLE_QUALITY = 0.70;

/**
 * Converts an HTMLCanvasElement to a pure WebP Blob at the specified quality.
 */
export async function canvasToWebpBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // If browser fails on image/webp, try canvas.toDataURL fallback
          try {
            const dataUrl = canvas.toDataURL('image/webp', quality);
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/webp';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            resolve(new Blob([u8arr], { type: mime }));
          } catch (fallbackErr) {
            reject(new Error('خطا در تبدیل تصویر به فرمت WebP در مرورگر'));
          }
        }
      },
      'image/webp',
      quality
    );
  });
}

/**
 * High-quality canvas scaling enforcing exact 3:4 portrait aspect ratio.
 */
function scaleCanvas3x4(
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number
): HTMLCanvasElement {
  const targetHeight = Math.round(targetWidth / ASPECT_RATIO);
  const scaled = document.createElement('canvas');
  scaled.width = Math.max(1, targetWidth);
  scaled.height = Math.max(1, targetHeight);
  const ctx = scaled.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  }
  return scaled;
}

/**
 * Main WebP optimization routine.
 * Finds the highest quality configuration that satisfies the <= 200 KB constraint,
 * while maintaining exact 3:4 ratio.
 */
export async function optimizeAndCompressToWebp(
  finalCanvas: HTMLCanvasElement
): Promise<ExportResult> {
  const origW = finalCanvas.width;
  const origH = finalCanvas.height;

  // 1. Try finding a high quality at full original cropped resolution that stays <= 200 KB
  const testQualities = [0.92, 0.86, 0.80, 0.74, 0.70];
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

  // If a full resolution option fits under 200 KB with acceptable quality
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
      aspectRatioNotice: 'نسبت تصویر دقیق ۳:۴ (ابعاد اصلی)',
    };

    return {
      primary,
      isTargetMetDirectly: true,
    };
  }

  // 2. If full resolution cannot fit under 200 KB (common for high-resolution iPhone 12MP/48MP photos):
  // Generate TWO explicit choices for the user:
  // Option B: "High Quality" (full cropped resolution, high quality ~0.88, exceeds 200 KB)
  // Option A: "Under 200 KB" (intelligently scaled to standard web catalog dimensions)

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
    aspectRatioNotice: 'نسبت تصویر ۳:۴ (ابعاد اصلی دوربین)',
  };

  // Generate Option A: Find best catalog width & quality that stays strictly <= 200 KB
  // Standard fashion catalog dimensions (width x height in 3:4):
  // 1440x1920, 1200x1600, 1080x1440, 960x1280, 840x1120, 750x1000, 660x880, 540x720
  const candidateWidths = [1440, 1200, 1080, 960, 840, 750, 660, 540, 480];
  let bestUnder200Blob: Blob = highQualityBlob;
  let bestUnder200W = origW;
  let bestUnder200H = origH;
  let bestUnder200Q = 0.82;
  let foundUnder200 = false;

  for (const targetW of candidateWidths) {
    if (targetW >= origW) continue;

    const scaledCanvas = scaleCanvas3x4(finalCanvas, targetW);

    // Try high-fidelity qualities for this width
    for (const testQ of [0.84, 0.80, 0.75]) {
      const testBlob = await canvasToWebpBlob(scaledCanvas, testQ);
      if (testBlob.size <= MAX_TARGET_BYTES) {
        bestUnder200Blob = testBlob;
        bestUnder200W = scaledCanvas.width;
        bestUnder200H = scaledCanvas.height;
        bestUnder200Q = testQ;
        foundUnder200 = true;
        break;
      }
    }

    if (foundUnder200) {
      break;
    }
  }

  // Guarantee: if still over 200 KB (very noisy/dense texture), scale down until strictly <= 200 KB
  if (!foundUnder200 || bestUnder200Blob.size > MAX_TARGET_BYTES) {
    let fallbackW = Math.min(origW, 720);
    while (fallbackW >= 360) {
      const scaledCanvas = scaleCanvas3x4(finalCanvas, fallbackW);
      const testBlob = await canvasToWebpBlob(scaledCanvas, 0.72);
      if (testBlob.size <= MAX_TARGET_BYTES) {
        bestUnder200Blob = testBlob;
        bestUnder200W = scaledCanvas.width;
        bestUnder200H = scaledCanvas.height;
        bestUnder200Q = 0.72;
        foundUnder200 = true;
        break;
      }
      fallbackW -= 60;
    }
  }

  const u200SizeBytes = bestUnder200Blob.size;
  const u200SizeKb = Math.round((u200SizeBytes / 1024) * 10) / 10;
  const u200DataUrl = URL.createObjectURL(bestUnder200Blob);

  const under200Variant: ExportVariant = {
    label: 'زیر ۲۰۰ کیلوبایت (بهینه‌سازی وب)',
    blob: bestUnder200Blob,
    dataUrl: u200DataUrl,
    width: bestUnder200W,
    height: bestUnder200H,
    sizeBytes: u200SizeBytes,
    sizeKb: u200SizeKb,
    quality: bestUnder200Q,
    isUnder200Kb: u200SizeBytes <= MAX_TARGET_BYTES,
    aspectRatioNotice: 'نسبت تصویر دقیق ۳:۴ (استاندارد فروشگاه)',
  };

  return {
    primary: under200Variant,
    secondary: higherQualityVariant,
    isTargetMetDirectly: false,
  };
}
