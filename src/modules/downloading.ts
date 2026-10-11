/**
 * Download utilities for WebP files
 */

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
