/**
 * Data structures and types for Fashion Studio 3:4
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedSubject {
  id: string;
  label: string; // e.g., 'مدل اصلی (مرکز)', 'مدل سمت راست'
  bbox: BoundingBox; // Pixel coordinates on original image
  garmentBbox?: BoundingBox; // Specific clothing area if detected
  confidence: number;
  isPrimary: boolean;
}

export interface DetectionResult {
  subjects: DetectedSubject[];
  suggestedCrop: BoundingBox;
  confidence: number;
  fitWarning?: string; // Persian warning if subject doesn't fit 3:4 comfortably
  isMultipleSubjects: boolean;
}

export interface ColorAdjustments {
  brightness: number; // -50 to 50, default 0
  contrast: number; // -50 to 50, default 0
  saturation: number; // -50 to 50, default 0
  warmth: number; // -30 to 30, default 0
  style: 'natural' | 'enhanced';
  autoCorrect: boolean;
}

export interface ExportVariant {
  label: string;
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  sizeKb: number;
  quality: number;
  isUnder200Kb: boolean;
  aspectRatioNotice: string;
}

export interface ExportResult {
  primary: ExportVariant;
  secondary?: ExportVariant; // Alternative variant (e.g. Higher Quality vs Under 200KB)
  isTargetMetDirectly: boolean;
  originalCropDataUrl?: string; // Raw unadjusted crop data URL for before/after comparison
}

export type ProcessingStatus =
  | 'idle'
  | 'decoding'
  | 'analyzing'
  | 'ready'
  | 'rendering'
  | 'error';

export interface PhotoItem {
  id: string;
  file: File;
  originalName: string;
  originalExtension: string;
  fileSizeBytes: number;
  originalWidth: number;
  originalHeight: number;
  imageElement: HTMLImageElement | null;
  objectUrl: string;
  status: ProcessingStatus;
  errorMessage?: string;
  progressPercent?: number;

  // Analysis & crop
  detectionResult?: DetectionResult;
  selectedSubjectId?: string;
  cropRect: BoundingBox; // Current 3:4 crop rect in image pixel coordinates

  // Edits
  colorAdjustments: ColorAdjustments;

  // Output
  exportResult?: ExportResult;
  activeVariant: 'under200kb' | 'highQuality';
}
