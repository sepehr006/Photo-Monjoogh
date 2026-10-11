/**
 * Image Processing Pipeline
 * Orchestrates Cropping -> Color Adjustment -> WebP Compression.
 */
import { PhotoItem, ExportResult } from '../types/image';
import { applyColorAdjustments } from './colorAdjustment';
import { optimizeAndCompressToWebp } from './compression';

export async function executeRenderPipeline(
  photo: PhotoItem
): Promise<ExportResult> {
  const { imageElement, cropRect, colorAdjustments } = photo;
  if (!imageElement) {
    throw new Error('عنصر تصویر معتبر بارگذاری نشده است.');
  }

  // 1. Render cropped portion onto offscreen canvas preserving full pixel details
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = Math.max(1, Math.round(cropRect.width));
  cropCanvas.height = Math.max(1, Math.round(cropRect.height));
  const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
  if (!cropCtx) {
    throw new Error('امکان ایجاد بوم دوبعدی در مرورگر وجود ندارد.');
  }

  cropCtx.imageSmoothingEnabled = true;
  cropCtx.imageSmoothingQuality = 'high';

  // Draw exactly the 3:4 crop window from the original image
  cropCtx.drawImage(
    imageElement,
    Math.round(cropRect.x),
    Math.round(cropRect.y),
    Math.round(cropRect.width),
    Math.round(cropRect.height),
    0,
    0,
    cropCanvas.width,
    cropCanvas.height
  );

  // Capture raw unadjusted crop for instant Before/After comparison
  const originalCropDataUrl = cropCanvas.toDataURL('image/jpeg', 0.85);

  // 2. Color & Lighting Adjustments
  const colorAdjustedCanvas = applyColorAdjustments(
    cropCanvas,
    colorAdjustments
  );

  // 3. WebP Compression & 200 KB Evaluation
  const exportResult = await optimizeAndCompressToWebp(colorAdjustedCanvas);
  exportResult.originalCropDataUrl = originalCropDataUrl;

  return exportResult;
}
