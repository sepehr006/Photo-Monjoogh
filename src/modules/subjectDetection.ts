/**
 * Client-Side Subject & Garment Detection Engine
 * Analyzes human model presence, skin loci, fabric gradients, and multi-model clusters
 * to calculate optimal 3:4 fashion portrait crops without any server dependency.
 */
import { BoundingBox, DetectionResult, DetectedSubject } from '../types/image';

interface AnalysisMap {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  skinMask: Uint8Array;
  edgeEnergy: Float32Array;
  saliency: Float32Array;
}

export function detectSubjectsAndSuggestCrop(
  img: HTMLImageElement
): DetectionResult {
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  // 1. Create a downsampled canvas for fast, non-blocking analysis (max 500px)
  const maxDim = 500;
  let targetW = origW;
  let targetH = origH;
  if (Math.max(origW, origH) > maxDim) {
    const scale = maxDim / Math.max(origW, origH);
    targetW = Math.round(origW * scale);
    targetH = Math.round(origH * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return createFallbackCrop(origW, origH);
  }

  ctx.drawImage(img, 0, 0, targetW, targetH);
  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;

  // 2. Perform pixel-level analysis: Skin loci, Sobel edge energy, and Contrast
  const analysis = performVisionAnalysis(data, targetW, targetH, origW, origH);

  // 3. Cluster horizontal projections to detect single or multiple models
  const subjects = clusterSubjects(analysis, origW, origH);

  if (subjects.length === 0) {
    return createFallbackCrop(origW, origH);
  }

  // 4. Determine suggested 3:4 crop for the primary subject
  const primarySubject = subjects.find((s) => s.isPrimary) || subjects[0];
  const { crop, fitWarning } = calculateFashion3x4Crop(
    primarySubject.bbox,
    origW,
    origH,
    primarySubject.garmentBbox
  );

  return {
    subjects,
    suggestedCrop: crop,
    confidence: primarySubject.confidence,
    fitWarning,
    isMultipleSubjects: subjects.length > 1,
  };
}

function performVisionAnalysis(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  origW: number,
  origH: number
): AnalysisMap {
  const pixelCount = w * h;
  const skinMask = new Uint8Array(pixelCount);
  const edgeEnergy = new Float32Array(pixelCount);
  const saliency = new Float32Array(pixelCount);

  // Estimate background color by sampling perimeter pixels
  const bgR = (data[0] + data[(w - 1) * 4] + data[(h - 1) * w * 4]) / 3;
  const bgG = (data[1] + data[(w - 1) * 4 + 1] + data[(h - 1) * w * 4 + 1]) / 3;
  const bgB = (data[2] + data[(w - 1) * 4 + 2] + data[(h - 1) * w * 4 + 2]) / 3;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // YCbCr skin locus detection (Standard ITU-R BT.601)
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      const isSkin = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
      if (isSkin) {
        skinMask[y * w + x] = 1;
      }

      // Sobel gradient energy for fabric texture, seams, and silhouettes
      const leftIdx = (y * w + (x - 1)) * 4;
      const rightIdx = (y * w + (x + 1)) * 4;
      const topIdx = ((y - 1) * w + x) * 4;
      const bottomIdx = ((y + 1) * w + x) * 4;

      const gx =
        Math.abs(data[rightIdx] - data[leftIdx]) +
        Math.abs(data[rightIdx + 1] - data[leftIdx + 1]) +
        Math.abs(data[rightIdx + 2] - data[leftIdx + 2]);

      const gy =
        Math.abs(data[bottomIdx] - data[topIdx]) +
        Math.abs(data[bottomIdx + 1] - data[topIdx + 1]) +
        Math.abs(data[bottomIdx + 2] - data[topIdx + 2]);

      const grad = Math.min(255, (gx + gy) / 3);
      edgeEnergy[y * w + x] = grad;

      // Color distance from backdrop
      const dR = r - bgR;
      const dG = g - bgG;
      const dB = b - bgB;
      const colorDist = Math.sqrt(dR * dR + dG * dG + dB * dB);

      // Saliency score combines edge energy, color contrast, and skin
      const skinBoost = isSkin ? 1.6 : 1.0;
      saliency[y * w + x] = (grad * 0.45 + colorDist * 0.55) * skinBoost;
    }
  }

  return {
    width: w,
    height: h,
    scaleX: origW / w,
    scaleY: origH / h,
    skinMask,
    edgeEnergy,
    saliency,
  };
}

function clusterSubjects(
  analysis: AnalysisMap,
  origW: number,
  origH: number
): DetectedSubject[] {
  const { width: w, height: h, scaleX, scaleY, saliency, skinMask } = analysis;

  // Horizontal column energy projection
  const colEnergy = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = 0; y < h; y++) {
      sum += saliency[y * w + x];
    }
    colEnergy[x] = sum;
  }

  // Smooth projection
  const smoothed = new Float32Array(w);
  const radius = Math.max(3, Math.floor(w * 0.03));
  for (let x = 0; x < w; x++) {
    let sum = 0;
    let count = 0;
    for (let i = Math.max(0, x - radius); i <= Math.min(w - 1, x + radius); i++) {
      sum += colEnergy[i];
      count++;
    }
    smoothed[x] = sum / count;
  }

  // Compute energy threshold for subject segment
  let maxEnergy = 0;
  for (let x = 0; x < w; x++) {
    if (smoothed[x] > maxEnergy) maxEnergy = smoothed[x];
  }
  const threshold = maxEnergy * 0.22;

  // Find continuous high-energy spans (potential models)
  const segments: { start: number; end: number; peak: number }[] = [];
  let inSpan = false;
  let spanStart = 0;
  let peakVal = 0;

  for (let x = 0; x < w; x++) {
    if (smoothed[x] >= threshold) {
      if (!inSpan) {
        inSpan = true;
        spanStart = x;
        peakVal = smoothed[x];
      } else {
        if (smoothed[x] > peakVal) peakVal = smoothed[x];
      }
    } else {
      if (inSpan) {
        inSpan = false;
        // Check minimum width (at least 6% of image width)
        if (x - spanStart > w * 0.06) {
          segments.push({ start: spanStart, end: x, peak: peakVal });
        }
      }
    }
  }
  if (inSpan && w - spanStart > w * 0.06) {
    segments.push({ start: spanStart, end: w, peak: peakVal });
  }

  if (segments.length === 0) {
    return [];
  }

  // Merge segments that are very close (gaps < 4% of image width)
  const mergedSegments: { start: number; end: number; peak: number }[] = [];
  let current = segments[0];

  for (let i = 1; i < segments.length; i++) {
    const next = segments[i];
    if (next.start - current.end < w * 0.04) {
      current.end = next.end;
      current.peak = Math.max(current.peak, next.peak);
    } else {
      mergedSegments.push(current);
      current = next;
    }
  }
  mergedSegments.push(current);

  // For each model segment, find exact vertical bounds (head to feet) and garment region
  const subjects: DetectedSubject[] = [];

  mergedSegments.forEach((seg, index) => {
    let minY = h;
    let maxY = 0;
    let skinMinY = h;
    let skinMaxY = 0;
    let garmentMinY = h;
    let garmentMaxY = 0;

    const segThresh = seg.peak * 0.18;

    for (let y = 0; y < h; y++) {
      for (let x = seg.start; x < seg.end; x++) {
        const val = saliency[y * w + x];
        if (val > segThresh) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;

          if (skinMask[y * w + x] === 1) {
            if (y < skinMinY) skinMinY = y;
            if (y > skinMaxY) skinMaxY = y;
          } else {
            if (y < garmentMinY) garmentMinY = y;
            if (y > garmentMaxY) garmentMaxY = y;
          }
        }
      }
    }

    if (maxY <= minY) {
      minY = Math.floor(h * 0.1);
      maxY = Math.floor(h * 0.9);
    }

    // Convert to original coordinates
    const bbox: BoundingBox = {
      x: Math.round(seg.start * scaleX),
      y: Math.round(minY * scaleY),
      width: Math.round((seg.end - seg.start) * scaleX),
      height: Math.round((maxY - minY) * scaleY),
    };

    // Garment bbox (clothing torso/skirt/pants)
    let garmentBbox: BoundingBox | undefined;
    if (garmentMaxY > garmentMinY) {
      garmentBbox = {
        x: bbox.x,
        y: Math.round(garmentMinY * scaleY),
        width: bbox.width,
        height: Math.round((garmentMaxY - garmentMinY) * scaleY),
      };
    }

    // Persian label based on position
    let label = 'مدل اصلی (مرکز)';
    if (mergedSegments.length > 1) {
      const centerX = (seg.start + seg.end) / 2;
      if (centerX < w * 0.35) {
        label = `مدل سمت راست (${index + 1})`; // In RTL right is lower X or visual right
      } else if (centerX > w * 0.65) {
        label = `مدل سمت چپ (${index + 1})`;
      } else {
        label = `مدل مرکزی (${index + 1})`;
      }
    }

    subjects.push({
      id: `subj_${index + 1}`,
      label,
      bbox,
      garmentBbox,
      confidence: Math.min(0.98, 0.75 + (seg.peak / (maxEnergy + 1)) * 0.23),
      isPrimary: index === 0, // Segments can be sorted by peak energy
    });
  });

  // Sort by peak energy / central prominence
  subjects.sort((a, b) => b.bbox.width * b.bbox.height - a.bbox.width * a.bbox.height);
  if (subjects[0]) subjects[0].isPrimary = true;

  return subjects;
}

/**
 * Calculates strict 3:4 portrait crop around the subject
 * Ratio: width / height = 3 / 4 (0.75)
 */
export function calculateFashion3x4Crop(
  subjectBox: BoundingBox,
  imgWidth: number,
  imgHeight: number,
  garmentBox?: BoundingBox
): { crop: BoundingBox; fitWarning?: string } {
  const TARGET_RATIO = 3 / 4; // 0.75
  let fitWarning: string | undefined;

  // Target padding: Leave comfortable breathing room around the garment
  const paddingX = subjectBox.width * 0.15;
  const paddedW = subjectBox.width + paddingX * 2;
  const paddedH = subjectBox.height * 1.15;

  let cropW: number;
  let cropH: number;

  // Decide if width or height drives the 3:4 crop
  if (paddedW / paddedH > TARGET_RATIO) {
    // Subject is relatively wide
    cropW = paddedW;
    cropH = cropW / TARGET_RATIO;
  } else {
    // Subject is tall
    cropH = paddedH;
    cropW = cropH * TARGET_RATIO;
  }

  // Constrain to image boundaries while keeping 3:4 ratio strictly intact
  if (cropH > imgHeight) {
    cropH = imgHeight;
    cropW = Math.round(cropH * TARGET_RATIO);
    if (cropW > imgWidth) {
      cropW = imgWidth;
      cropH = Math.round(cropW / TARGET_RATIO);
    }
  }
  if (cropW > imgWidth) {
    cropW = imgWidth;
    cropH = Math.round(cropW / TARGET_RATIO);
  }

  // Ensure exact 3:4 integer dimensions
  cropW = Math.round(cropW);
  cropH = Math.round(cropW / TARGET_RATIO);
  if (cropH > imgHeight) {
    cropH = Math.round(imgHeight);
    cropW = Math.round(cropH * TARGET_RATIO);
  }

  // Position: Center horizontally on subject
  const subjectCenterX = subjectBox.x + subjectBox.width / 2;
  let cropX = Math.round(subjectCenterX - cropW / 2);

  // Position vertically: Fashion rule - head/top of model sits at ~15-20% from the top
  const subjectTopY = subjectBox.y;
  let cropY = Math.round(subjectTopY - cropH * 0.12);

  // Clamp within image bounds
  if (cropX < 0) cropX = 0;
  if (cropX + cropW > imgWidth) cropX = imgWidth - cropW;
  if (cropY < 0) cropY = 0;
  if (cropY + cropH > imgHeight) cropY = imgHeight - cropH;

  // Check if subject was clipped because of extreme aspect ratio
  if (subjectBox.width > cropW) {
    fitWarning =
      'عرض سوژه یا لباس بیش از کادر عمودی ۳:۴ است؛ کادر پیشنهادی روی بخش اصلی لباس و تنه متمرکز شد.';
  } else if (subjectBox.height > cropH) {
    fitWarning =
      'ارتفاع مدل بلندتر از کادر پیشنهادی است؛ کادر روی بالاتنه و لباس متمرکز شد.';
  }

  return {
    crop: {
      x: Math.max(0, cropX),
      y: Math.max(0, cropY),
      width: Math.max(10, cropW),
      height: Math.max(10, cropH),
    },
    fitWarning,
  };
}

export function createFallbackCrop(
  imgWidth: number,
  imgHeight: number
): DetectionResult {
  const TARGET_RATIO = 3 / 4;
  let cropW: number;
  let cropH: number;

  if (imgWidth / imgHeight > TARGET_RATIO) {
    cropH = imgHeight;
    cropW = Math.round(cropH * TARGET_RATIO);
  } else {
    cropW = imgWidth;
    cropH = Math.round(cropW / TARGET_RATIO);
  }

  const cropX = Math.round((imgWidth - cropW) / 2);
  const cropY = Math.round((imgHeight - cropH) / 2);

  const fallbackBox: BoundingBox = {
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH,
  };

  return {
    subjects: [
      {
        id: 'subj_center',
        label: 'کادر استاندارد پوشاک (مرکز)',
        bbox: fallbackBox,
        confidence: 0.7,
        isPrimary: true,
      },
    ],
    suggestedCrop: fallbackBox,
    confidence: 0.7,
    isMultipleSubjects: false,
  };
}
