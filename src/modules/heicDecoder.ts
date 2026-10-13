/**
 * HEIC decoding module
 * Decodes iPhone / Apple HEIC & HEIF photos client-side into standard JPEG/PNG blobs.
 * Features multi-tier decoding strategies:
 * 1. Native browser hardware decoder (Safari iOS & macOS, browsers with OS-level HEIC codecs)
 * 2. Modern libheif-based engine (heic-to with libheif 1.23+ and libde265, supports iOS 17/18, HEVC, HDR)
 * 3. Bitmap & PNG rendering fallback
 * 4. Auxiliary container / multi-frame fallback via heic2any
 */
import { heicTo } from 'heic-to';
import heic2any from 'heic2any';

/**
 * Fast synchronous check using file name extension and MIME type.
 */
export function isHeicFile(file: File | Blob, filename?: string): boolean {
  const name = (file instanceof File ? file.name : filename) || '';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const mime = file.type ? file.type.toLowerCase() : '';
  return (
    ext === 'heic' ||
    ext === 'heif' ||
    ext === 'hif' ||
    mime.includes('heic') ||
    mime.includes('heif')
  );
}

/**
 * Deep inspection of the first 32 bytes to identify HEIF / HEIC container ('ftyp' box).
 * Useful when an iPhone image was saved without extension, with generic MIME, or renamed to .jpg.
 */
export async function isHeicBlobAsync(blob: Blob): Promise<boolean> {
  if (isHeicFile(blob)) return true;
  if (!blob || blob.size < 12) return false;

  try {
    const slice = await blob.slice(0, 36).arrayBuffer();
    const bytes = new Uint8Array(slice);

    // Bytes 4..7 must be ASCII 'ftyp' (0x66, 0x74, 0x79, 0x70)
    if (
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    ) {
      const brand = String.fromCharCode(...Array.from(bytes.slice(8, 12))).toLowerCase();
      const validBrands = [
        'heic',
        'heix',
        'hevc',
        'hevx',
        'heim',
        'heis',
        'mif1',
        'msf1',
      ];
      if (validBrands.includes(brand)) return true;

      // Check compatible brands in the rest of ftyp box
      for (let i = 12; i + 4 <= bytes.length; i += 4) {
        const comp = String.fromCharCode(...Array.from(bytes.slice(i, i + 4))).toLowerCase();
        if (validBrands.includes(comp)) return true;
      }
    }
  } catch {
    // Ignore read errors
  }

  return false;
}

/**
 * Attempt native browser decoding via createImageBitmap or Image element.
 * Supported in Safari (iOS & macOS) and browsers with native HEIC codecs.
 */
async function tryNativeBrowserDecode(file: File | Blob): Promise<Blob | null> {
  // Ensure the blob has an explicit HEIC MIME type so browser knows to use native HEIC codec
  let candidateBlob = file;
  if (!file.type || file.type === 'application/octet-stream') {
    candidateBlob = new Blob([file], { type: 'image/heic' });
  }

  // Strategy A: createImageBitmap (Hardware accelerated, automatically applies EXIF rotation)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(candidateBlob);
      if (bitmap.width > 0 && bitmap.height > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.98);
          });
          if (blob && blob.size > 0) {
            return blob;
          }
        }
        bitmap.close();
      }
    } catch {
      // Native createImageBitmap not supported for this file
    }
  }

  // Strategy B: Image element with Object URL
  try {
    const url = URL.createObjectURL(candidateBlob);
    const img = new Image();
    img.decoding = 'async';
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });

    if (loaded && img.naturalWidth > 0 && img.naturalHeight > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.98);
        });
        if (blob && blob.size > 0) {
          return blob;
        }
      }
    }
    URL.revokeObjectURL(url);
  } catch {
    // Native img tag not supported for this file
  }

  return null;
}

/**
 * Main decoding entry point for HEIC / HEIF images.
 * Returns a universally-loadable JPEG or PNG Blob.
 */
export async function decodeHeicToBlob(file: File | Blob): Promise<Blob> {
  const fileName = file instanceof File ? file.name : 'image.heic';

  // 1. First, attempt native browser decoding (zero overhead, fast, works on Safari & iOS)
  try {
    const nativeBlob = await tryNativeBrowserDecode(file);
    if (nativeBlob) {
      return nativeBlob;
    }
  } catch (nativeErr) {
    console.warn('Native HEIC decoding attempt failed:', nativeErr);
  }

  // 2. Primary decoder: modern 'heic-to' with updated libheif 1.23+ and libde265 engine
  try {
    const converted = await heicTo({
      blob: file,
      type: 'image/jpeg',
      quality: 0.95,
    });
    if (converted && converted.size > 0) {
      return converted;
    }
  } catch (heicToErr: unknown) {
    console.warn('heic-to direct JPEG conversion failed, trying bitmap conversion:', heicToErr);

    // 2b. Try bitmap variant if direct JPEG failed
    try {
      const bitmap = await heicTo({
        blob: file,
        type: 'bitmap',
      });
      if (bitmap && bitmap.width > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
          });
          if (blob && blob.size > 0) {
            return blob;
          }
        }
        bitmap.close();
      }
    } catch (bitmapErr) {
      console.warn('heic-to bitmap conversion failed, trying PNG:', bitmapErr);

      // 2c. Try PNG output in heic-to
      try {
        const pngBlob = await heicTo({
          blob: file,
          type: 'image/png',
        });
        if (pngBlob && pngBlob.size > 0) {
          return pngBlob;
        }
      } catch (pngErr) {
        console.warn('heic-to PNG conversion failed:', pngErr);
      }
    }
  }

  // 3. Fallback decoder: 'heic2any' (single or multiple items)
  try {
    const fn = (heic2any as unknown as { default?: typeof heic2any }).default || heic2any;
    const result = await fn({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.95,
    });

    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    }
    if (result instanceof Blob) {
      return result;
    }
  } catch (heic2anyErr: unknown) {
    console.warn('heic2any single item failed, trying multiple items mode:', heic2anyErr);

    // Try multiple items mode (common for Apple Live Photos or HDR burst files)
    try {
      const fn = (heic2any as unknown as { default?: typeof heic2any }).default || heic2any;
      const multiResult = await fn({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.95,
        multiple: true,
      });

      if (Array.isArray(multiResult) && multiResult.length > 0) {
        return multiResult[0];
      }
      if (multiResult instanceof Blob) {
        return multiResult;
      }
    } catch (multiErr) {
      console.warn('heic2any multiple mode also failed:', multiErr);
    }
  }

  // If all client-side decoders fail, report a clear error message in Persian
  throw new Error(
    `خطا در رمزگشایی فایل HEIC (${fileName}): این فایل از لایه‌های پیشرفته متحرک (Live Photo) یا فشرده‌سازی غیرمعمول استفاده می‌کند. در آیفون می‌توانید عکس را در گالری با فرمت JPG ذخیره نمایید.`
  );
}
