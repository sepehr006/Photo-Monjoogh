/**
 * Download utilities for WebP files
 * Supports individual downloads and batch ZIP packaging.
 */
import JSZip from 'jszip';

export function generateWebpFilename(
  originalName: string,
  variantSuffix?: string
): string {
  // Strip existing extension (.jpg, .jpeg, .heic, .png, etc.)
  const lastDotIndex = originalName.lastIndexOf('.');
  const baseName =
    lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;

  // Clean filename: remove illegal filesystem characters
  const cleanBase = baseName.replace(/[/\\?%*:|"<>]/g, '_');

  const suffix = variantSuffix ? `_${variantSuffix}` : '';
  return `${cleanBase}_3x4${suffix}.webp`;
}

export function triggerDownloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Free memory after short delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 4000);
}

/**
 * Downloads multiple WebP blobs bundled into a single ZIP archive.
 * Avoids browser popup blocking that happens with multiple simultaneous triggers.
 */
export async function downloadPhotosAsZip(
  items: { blob: Blob; filename: string }[],
  zipFilename = 'fashion_photos_webp.zip',
  onProgress?: (percent: number) => void
): Promise<void> {
  if (items.length === 0) return;

  // If only 1 file, download directly without ZIP overhead
  if (items.length === 1) {
    triggerDownloadBlob(items[0].blob, items[0].filename);
    onProgress?.(100);
    return;
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const item of items) {
    let name = item.filename;
    // Handle filename collisions safely
    if (usedNames.has(name)) {
      const dotIndex = name.lastIndexOf('.');
      const base = dotIndex > 0 ? name.substring(0, dotIndex) : name;
      const ext = dotIndex > 0 ? name.substring(dotIndex) : '';
      let counter = 1;
      while (usedNames.has(`${base}_(${counter})${ext}`)) {
        counter++;
      }
      name = `${base}_(${counter})${ext}`;
    }
    usedNames.add(name);
    zip.file(name, item.blob);
  }

  // Generate ZIP blob (using STORE compression because WebP is already compressed)
  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'STORE' },
    (metadata) => {
      onProgress?.(Math.round(metadata.percent));
    }
  );

  triggerDownloadBlob(zipBlob, zipFilename);
}
