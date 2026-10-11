/**
 * 3:4 Portrait Cropping Math and Utilities
 * Strictly enforces 3 units wide by 4 units high.
 * Never stretches or distorts pixels.
 */
import { BoundingBox } from '../types/image';

export const ASPECT_RATIO_W = 3;
export const ASPECT_RATIO_H = 4;
export const ASPECT_RATIO = ASPECT_RATIO_W / ASPECT_RATIO_H; // 0.75

export function enforceExact3x4(
  width: number,
  height: number,
  prefer: 'width' | 'height' = 'height'
): { width: number; height: number } {
  let w = Math.round(width);
  let h = Math.round(height);

  if (prefer === 'height') {
    w = Math.round(h * ASPECT_RATIO);
  } else {
    h = Math.round(w / ASPECT_RATIO);
  }

  return { width: Math.max(30, w), height: Math.max(40, h) };
}

export function clampCropToImage(
  crop: BoundingBox,
  imgWidth: number,
  imgHeight: number
): BoundingBox {
  let { width, height } = enforceExact3x4(crop.width, crop.height);

  // If larger than image boundaries, downscale maintaining 3:4
  if (height > imgHeight) {
    height = imgHeight;
    width = Math.round(height * ASPECT_RATIO);
  }
  if (width > imgWidth) {
    width = imgWidth;
    height = Math.round(width / ASPECT_RATIO);
  }

  // Position bounds
  let x = Math.round(crop.x);
  let y = Math.round(crop.y);

  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + width > imgWidth) x = imgWidth - width;
  if (y + height > imgHeight) y = imgHeight - height;

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width,
    height,
  };
}

export function getLargest3x4Crop(
  imgWidth: number,
  imgHeight: number
): BoundingBox {
  let cropW: number;
  let cropH: number;

  if (imgWidth / imgHeight > ASPECT_RATIO) {
    cropH = imgHeight;
    cropW = Math.round(cropH * ASPECT_RATIO);
  } else {
    cropW = imgWidth;
    cropH = Math.round(cropW / ASPECT_RATIO);
  }

  const cropX = Math.round((imgWidth - cropW) / 2);
  const cropY = Math.round((imgHeight - cropH) / 2);

  return {
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH,
  };
}

export function getMediumShot3x4Crop(
  imgWidth: number,
  imgHeight: number,
  subjectBbox?: BoundingBox
): BoundingBox {
  if (subjectBbox) {
    // Top 60% of model (head + torso + hips)
    const upperH = subjectBbox.height * 0.65;
    const cropH = Math.min(imgHeight, upperH * 1.35);
    const cropW = Math.round(cropH * ASPECT_RATIO);

    const centerX = subjectBbox.x + subjectBbox.width / 2;
    const cropX = Math.round(centerX - cropW / 2);
    const cropY = Math.round(subjectBbox.y - cropH * 0.1);

    return clampCropToImage(
      { x: cropX, y: cropY, width: cropW, height: cropH },
      imgWidth,
      imgHeight
    );
  }

  // Fallback to top-center 65% of image
  const largest = getLargest3x4Crop(imgWidth, imgHeight);
  const w = Math.round(largest.width * 0.7);
  const h = Math.round(w / ASPECT_RATIO);
  const x = Math.round((imgWidth - w) / 2);
  const y = Math.round(imgHeight * 0.05);

  return clampCropToImage({ x, y, width: w, height: h }, imgWidth, imgHeight);
}
