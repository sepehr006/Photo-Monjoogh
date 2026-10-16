/**
 * HEIC decoding module
 * Decodes iPhone / Apple HEIC & HEIF photos client-side into standard JPEG/PNG blobs.
 * Features 5-tier fail-safe decoding strategies:
 * 1. Native browser hardware decoder (Safari iOS & macOS, browsers with OS-level HEIC codecs)
 * 2. High-performance WASM libheif 1.23.5 engine with libde265 (self-contained, works in all origins including GitHub Pages)
 * 3. Pure JavaScript libheif 1.23.5 fallback (zero WASM dependencies, runs anywhere)
 * 4. heic-to engine with fallback to bitmap / PNG
 * 5. heic2any fallback
 */
import { heicTo } from 'heic-to';
import heic2any from 'heic2any';

// Cached libheif instances
let wasmLibheifPromise: Promise<any> | null = null;
let pureJsLibheifPromise: Promise<any> | null = null;

async function getWasmLibheif(): Promise<any> {
  if (!wasmLibheifPromise) {
    wasmLibheifPromise = (async () => {
      // @ts-expect-error libheif-js module packaging
      const mod = await import('libheif-js/libheif-wasm/libheif-bundle.mjs');
      const factory = mod.default || mod;
      return typeof factory === 'function' ? await factory() : factory;
    })();
  }
  return wasmLibheifPromise;
}

async function getPureJsLibheif(): Promise<any> {
  if (!pureJsLibheifPromise) {
    pureJsLibheifPromise = (async () => {
      // @ts-expect-error libheif-js module packaging
      const mod = await import('libheif-js');
      return mod.default || mod;
    })();
  }
  return pureJsLibheifPromise;
}

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
 * Deep inspection of the first 36 bytes to identify HEIF / HEIC container ('ftyp' box).
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
 * Strategy 1: Native browser decoding via createImageBitmap or Image element.
 * Supported in Safari (iOS & macOS) and browsers with native HEIC codecs.
 */
async function tryNativeBrowserDecode(file: File | Blob): Promise<Blob | null> {
  let candidateBlob = file;
  if (!file.type || file.type === 'application/octet-stream') {
    candidateBlob = new Blob([file], { type: 'image/heic' });
  }

  // Strategy 1A: createImageBitmap (Hardware accelerated, automatically applies EXIF rotation)
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
          canvas.width = 1;
          canvas.height = 1;
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

  // Strategy 1B: Image element with Object URL
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
        canvas.width = 1;
        canvas.height = 1;
        if (blob && blob.size > 0) {
          return blob;
        }
      }
    }
    URL.revokeObjectURL(url);
  } catch {
    // Native img tag not supported
  }

  return null;
}

/**
 * Strategy 2 & 3: Decode using libheif instance (WASM or Pure JS)
 */
async function decodeWithLibheifInstance(libheif: any, arrayBuffer: ArrayBuffer): Promise<Blob> {
  const decoder = new libheif.HeifDecoder();
  const data = decoder.decode(arrayBuffer);

  if (!data || data.length === 0) {
    throw new Error('تصویری در کانتینر HEIC یافت نشد.');
  }

  try {
    // Select primary image or highest resolution frame (for Live Photos / burst shots)
    let targetImage = data.find((img: any) => typeof img.is_primary === 'function' && img.is_primary());
    if (!targetImage) {
      targetImage = data.reduce((largest: any, current: any) => {
        const largestArea = (largest.get_width() || 0) * (largest.get_height() || 0);
        const currentArea = (current.get_width() || 0) * (current.get_height() || 0);
        return currentArea > largestArea ? current : largest;
      }, data[0]);
    }

    const width = targetImage.get_width();
    const height = targetImage.get_height();

    if (!width || !height || width <= 0 || height <= 0) {
      throw new Error(`ابعاد نامعتبر تصویر HEIC: ${width}×${height}`);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('عدم دسترسی به بوم پردازش تصویر (Canvas 2D)');
    }

    const imgData = ctx.createImageData(width, height);

    await new Promise<void>((resolve, reject) => {
      targetImage.display(imgData, (displayData: any) => {
        if (!displayData) {
          return reject(new Error('خطا در پردازش داده‌های پیکسلی HEIC'));
        }
        resolve();
      });
    });

    ctx.putImageData(imgData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.98);
    });

    canvas.width = 1;
    canvas.height = 1;

    if (!blob || blob.size === 0) {
      throw new Error('خطا در تولید فایل خروجی تصویر');
    }

    return blob;
  } finally {
    data.forEach((img: any) => {
      try {
        if (typeof img.free === 'function') {
          img.free();
        }
      } catch {
        // ignore cleanup error
      }
    });
  }
}

/**
 * Strategy 4: Fallback to heic-to package
 */
async function tryHeicToDecode(file: File | Blob): Promise<Blob | null> {
  try {
    const converted = await heicTo({
      blob: file,
      type: 'image/jpeg',
      quality: 0.95,
    });
    if (converted && converted.size > 0) {
      return converted;
    }
  } catch (err) {
    console.warn('heic-to JPEG failed, trying bitmap:', err);
  }

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
        canvas.width = 1;
        canvas.height = 1;
        if (blob && blob.size > 0) {
          return blob;
        }
      }
      bitmap.close();
    }
  } catch (err) {
    console.warn('heic-to bitmap failed:', err);
  }

  return null;
}

/**
 * Strategy 5: Fallback to heic2any package
 */
async function tryHeic2AnyDecode(file: File | Blob): Promise<Blob | null> {
  try {
    const fn = (heic2any as unknown as { default?: typeof heic2any }).default || heic2any;
    const result = await fn({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.95,
      multiple: true,
    });

    if (Array.isArray(result) && result.length > 0) {
      return result[0];
    }
    if (result instanceof Blob) {
      return result;
    }
  } catch (err) {
    console.warn('heic2any decode failed:', err);
  }

  return null;
}

/**
 * Main decoding entry point for HEIC / HEIF images.
 * Uses 5 resilient tiers to guarantee iPhone photos decode smoothly across all browsers and platforms.
 */
export async function decodeHeicToBlob(file: File | Blob): Promise<Blob> {
  const fileName = file instanceof File ? file.name : 'image.heic';

  // Tier 1: Native browser hardware decoder (Safari iOS & macOS)
  try {
    const nativeBlob = await tryNativeBrowserDecode(file);
    if (nativeBlob) {
      return nativeBlob;
    }
  } catch (nativeErr) {
    console.warn('Native HEIC decoding attempt failed:', nativeErr);
  }

  // Pre-load arrayBuffer once for libheif decoders
  let arrayBuffer: ArrayBuffer | null = null;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (bufferErr) {
    console.warn('Could not read file as arrayBuffer:', bufferErr);
  }

  // Tier 2: WASM libheif 1.23.5 engine with libde265 (High speed, works everywhere including GitHub Pages)
  if (arrayBuffer) {
    try {
      const wasmLibheif = await getWasmLibheif();
      if (wasmLibheif) {
        const wasmBlob = await decodeWithLibheifInstance(wasmLibheif, arrayBuffer);
        if (wasmBlob && wasmBlob.size > 0) {
          return wasmBlob;
        }
      }
    } catch (wasmErr) {
      console.warn('WASM libheif decode failed, trying pure JS libheif:', wasmErr);
    }
  }

  // Tier 3: Pure JavaScript libheif 1.23.5 fallback (zero WASM requirements)
  if (arrayBuffer) {
    try {
      const pureJsLibheif = await getPureJsLibheif();
      if (pureJsLibheif) {
        const pureBlob = await decodeWithLibheifInstance(pureJsLibheif, arrayBuffer);
        if (pureBlob && pureBlob.size > 0) {
          return pureBlob;
        }
      }
    } catch (pureErr) {
      console.warn('Pure JS libheif decode failed, trying heic-to:', pureErr);
    }
  }

  // Tier 4: heic-to decoder
  try {
    const heicToBlob = await tryHeicToDecode(file);
    if (heicToBlob && heicToBlob.size > 0) {
      return heicToBlob;
    }
  } catch (heicToErr) {
    console.warn('heic-to decode failed:', heicToErr);
  }

  // Tier 5: heic2any decoder
  try {
    const heic2anyBlob = await tryHeic2AnyDecode(file);
    if (heic2anyBlob && heic2anyBlob.size > 0) {
      return heic2anyBlob;
    }
  } catch (heic2anyErr) {
    console.warn('heic2any decode failed:', heic2anyErr);
  }

  // If all decoders fail
  throw new Error(
    `خطا در رمزگشایی فایل HEIC (${fileName}): لطفاً مطمئن شوید فایل سالم است. همچنین می‌توانید در تنظیمات دوربین آیفون (Formats)، حالت Most Compatible را انتخاب کنید یا عکس را از طریق گالری به فرمت JPG به اشتراک بگذارید.`
  );
}
