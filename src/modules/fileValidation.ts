/**
 * File validation and metadata extraction module
 */
import { decodeHeicToBlob, isHeicFile } from './heicDecoder';

export interface ValidatedFileResult {
  file: File;
  originalName: string;
  originalExtension: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  imageElement: HTMLImageElement;
  objectUrl: string;
}

const ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'heic',
  'heif',
  'png',
  'webp',
  'avif',
  'bmp',
  'tif',
  'tiff',
];
const MAX_DIMENSION_LIMIT = 10000; // Limit to prevent browser memory exhaustion (100MP)
const WARN_MEGAPIXELS = 45; // 45MP+ might be sluggish on older laptops

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} بایت`;
  } else if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(1);
    return `${kb} کیلوبایت`;
  } else {
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return `${mb} مگابایت`;
  }
}

export function formatDimensions(width: number, height: number): string {
  return `${width} × ${height} پیکسل`;
}

export async function validateAndLoadImage(
  file: File,
  onProgress?: (msg: string) => void
): Promise<ValidatedFileResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext) && !file.type.startsWith('image/')) {
    throw new Error(
      `فرمت فایل «${file.name}» پشتیبانی نمی‌شود. لطفاً فایل‌های JPG، JPEG یا HEIC انتخاب فرمایید.`
    );
  }

  // 1. HEIC conversion if needed
  let displayBlob: Blob = file;
  if (isHeicFile(file)) {
    if (onProgress) onProgress('در حال رمزگشایی تصویر HEIC درون مرورگر...');
    displayBlob = await decodeHeicToBlob(file);
  }

  // 2. Load into HTMLImageElement
  if (onProgress) onProgress('در حال بارگذاری و خواندن ابعاد تصویر...');
  const objectUrl = URL.createObjectURL(displayBlob);

  const img = new Image();
  img.decoding = 'async';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          `فایل تصویر «${file.name}» خوانده نشد. ممکن است فایل خراب، ناقص یا فاقد داده تصویری معتبر باشد.`
        )
      );
    };
    img.src = objectUrl;
  });

  const width = img.naturalWidth;
  const height = img.naturalHeight;

  if (!width || !height || width <= 0 || height <= 0) {
    URL.revokeObjectURL(objectUrl);
    throw new Error(`ابعاد تصویر «${file.name}» نامعتبر است.`);
  }

  if (width > MAX_DIMENSION_LIMIT || height > MAX_DIMENSION_LIMIT) {
    URL.revokeObjectURL(objectUrl);
    throw new Error(
      `ابعاد تصویر (${width}×${height}) بیش از حد مجاز مرورگر است و حافظه رم سیستم را دچار مشکل می‌کند.`
    );
  }

  const megaPixels = (width * height) / 1000000;
  if (megaPixels > WARN_MEGAPIXELS) {
    console.warn(`Image is very large (${megaPixels.toFixed(1)} MP). Processing may take extra memory.`);
  }

  return {
    file,
    originalName: file.name,
    originalExtension: ext,
    fileSizeBytes: file.size,
    width,
    height,
    imageElement: img,
    objectUrl,
  };
}
