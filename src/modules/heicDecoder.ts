/**
 * HEIC decoding module
 * Decodes iPhone / Apple HEIC & HEIF photos client-side into standard JPEG/PNG blobs.
 */
import heic2any from 'heic2any';

export function isHeicFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mime = file.type.toLowerCase();
  return (
    extension === 'heic' ||
    extension === 'heif' ||
    mime.includes('heic') ||
    mime.includes('heif')
  );
}

export async function decodeHeicToBlob(file: File): Promise<Blob> {
  if (!isHeicFile(file)) {
    return file;
  }

  try {
    const fn = (heic2any as any).default || heic2any;
    const result = await fn({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.95,
    });

    if (Array.isArray(result)) {
      return result[0];
    }
    return result as Blob;
  } catch (err: any) {
    console.error('HEIC decode error:', err);
    throw new Error(
      `خطا در رمزگشایی فایل HEIC (${file.name}): فایل ممکن است آسیب‌دیده باشد یا فشرده‌سازی آن استاندارد نباشد.`
    );
  }
}
