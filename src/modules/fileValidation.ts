/**
 * File validation and metadata extraction module
 * Supports iPhone HEIC/HEIF photos, JPEG/JPG, PNG, WebP, AVIF, BMP, GIF, and standard image formats.
 * Enforces security limits and extracts dimensions safely client-side.
 */
import { decodeHeicToBlob, isHeicFile, isHeicBlobAsync } from './heicDecoder';

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
  'jpe',
  'jfif',
  'pjpeg',
  'pjp',
  'heic',
  'heif',
  'hif',
  'png',
  'webp',
  'avif',
  'bmp',
  'tif',
  'tiff',
  'gif',
];
const MAX_DIMENSION_LIMIT = 10000; // Limit to prevent browser memory exhaustion (100MP)
const WARN_MEGAPIXELS = 45; // 45MP+ might take extra memory on mobile devices

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

/**
 * Loads a Blob/File into an HTMLImageElement with async decoding.
 */
function loadImageElement(blob: Blob, fileName: string): Promise<{ img: HTMLImageElement; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = 'async';

    img.onload = () => {
      resolve({ img, objectUrl });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          `فایل تصویر «${fileName}» خوانده نشد. ممکن است فایل خراب باشد یا فرمت آن توسط مرورگر پشتیبانی نشود.`
        )
      );
    };

    img.src = objectUrl;
  });
}

export async function validateAndLoadImage(
  file: File,
  onProgress?: (msg: string) => void
): Promise<ValidatedFileResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isImageMime = file.type.startsWith('image/');
  const isKnownExtension = ALLOWED_EXTENSIONS.includes(ext);

  // Check if it's an HEIC/HEIF file by name, mime, or magic bytes
  let isHeic = isHeicFile(file);
  if (!isHeic && (!isKnownExtension || !isImageMime)) {
    isHeic = await isHeicBlobAsync(file);
  }

  // Disallow non-image files
  if (!isKnownExtension && !isImageMime && !isHeic) {
    throw new Error(
      `فرمت فایل «${file.name}» پشتیبانی نمی‌شود. لطفاً فایل‌های تصویری رایج (JPG، PNG، HEIC، WebP) را انتخاب فرمایید.`
    );
  }

  // 1. HEIC conversion if needed (iPhone camera native format)
  let displayBlob: Blob = file;
  if (isHeic) {
    if (onProgress) onProgress('در حال تبدیل تصویر HEIC آیفون به فرمت سازگار مرورگر...');
    displayBlob = await decodeHeicToBlob(file);
  }

  // 2. Load into HTMLImageElement
  if (onProgress) onProgress('در حال خواندن و بررسی ابعاد تصویر...');

  let img: HTMLImageElement;
  let objectUrl: string;

  try {
    const loaded = await loadImageElement(displayBlob, file.name);
    img = loaded.img;
    objectUrl = loaded.objectUrl;
  } catch (initialErr: unknown) {
    // If loading failed and we haven't tried HEIC decoding yet, check if it was an HEIC file with .jpg/.png extension
    if (!isHeic) {
      const isHeicContainer = await isHeicBlobAsync(file);
      if (isHeicContainer) {
        if (onProgress) onProgress('شناسایی کانتینر HEIC آیفون؛ در حال رمزگشایی مجدد...');
        try {
          displayBlob = await decodeHeicToBlob(file);
          const loaded = await loadImageElement(displayBlob, file.name);
          img = loaded.img;
          objectUrl = loaded.objectUrl;
        } catch {
          throw initialErr;
        }
      } else if (ext === 'tif' || ext === 'tiff') {
        throw new Error(
          `فرمت TIFF در این مرورگر پشتیبانی نمی‌شود. لطفاً عکس را با فرمت JPG، PNG یا HEIC بارگذاری فرمایید.`
        );
      } else {
        throw initialErr;
      }
    } else {
      throw initialErr;
    }
  }

  const width = img.naturalWidth;
  const height = img.naturalHeight;

  if (!width || !height || width <= 0 || height <= 0) {
    URL.revokeObjectURL(objectUrl);
    throw new Error(`ابعاد تصویر «${file.name}» نامعتبر یا صفر است.`);
  }

  if (width > MAX_DIMENSION_LIMIT || height > MAX_DIMENSION_LIMIT) {
    URL.revokeObjectURL(objectUrl);
    throw new Error(
      `ابعاد تصویر (${width}×${height}) بیش از حد مجاز مرورگر (۱۰,۰۰۰ پیکسل) است.`
    );
  }

  const megaPixels = (width * height) / 1000000;
  if (megaPixels > WARN_MEGAPIXELS) {
    console.warn(`Image is very large (${megaPixels.toFixed(1)} MP). Processing may take extra memory.`);
  }

  return {
    file,
    originalName: file.name,
    originalExtension: ext || (isHeic ? 'heic' : 'jpg'),
    fileSizeBytes: file.size,
    width,
    height,
    imageElement: img,
    objectUrl,
  };
}
