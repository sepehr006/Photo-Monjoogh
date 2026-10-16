/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { PhotoItem, BoundingBox, ColorAdjustments } from './types/image';
import { validateAndLoadImage } from './modules/fileValidation';
import { detectSubjectsAndSuggestCrop } from './modules/subjectDetection';
import { executeRenderPipeline } from './modules/pipeline';
import { DEFAULT_COLOR_ADJUSTMENTS } from './modules/colorAdjustment';
import { downloadPhotosAsZip, generateWebpFilename } from './modules/downloading';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Header';
import { UploadDropzone } from './components/UploadDropzone';
import { PhotoQueue } from './components/PhotoQueue';
import { CropWorkspace } from './components/CropWorkspace';
import { AdjustmentsPanel } from './components/AdjustmentsPanel';
import { RatioInfoModal } from './components/RatioInfoModal';
import { MobileControls } from './components/MobileControls';
import { MobilePhotoStrip } from './components/MobilePhotoStrip';

function AppContent() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<'preview' | 'crop'>('preview');

  const [isRatioInfoOpen, setIsRatioInfoOpen] = useState<boolean>(false);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [, setZipProgress] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderTimeoutRef = useRef<Record<string, number>>({});

  // Active photo object
  const activePhoto = photos.find((p) => p.id === activePhotoId) || null;
  const readyPhotosCount = photos.filter((p) => p.status === 'ready' && p.exportResult).length;

  // Process a single photo through the validation and pipeline
  const processSinglePhotoItem = useCallback(async (initialItem: PhotoItem) => {
    try {
      const loaded = await validateAndLoadImage(initialItem.file);
      const detectionResult = detectSubjectsAndSuggestCrop(loaded.imageElement);

      const loadedItem: PhotoItem = {
        ...initialItem,
        originalName: loaded.originalName,
        originalExtension: loaded.originalExtension,
        fileSizeBytes: loaded.fileSizeBytes,
        originalWidth: loaded.width,
        originalHeight: loaded.height,
        objectUrl: loaded.objectUrl,
        imageElement: loaded.imageElement,
        cropRect: detectionResult.suggestedCrop,
        detectionResult,
        selectedSubjectId: detectionResult.subjects[0]?.id,
        status: 'rendering',
      };

      // Update state with loaded element and dimensions
      setPhotos((prev) =>
        prev.map((p) => (p.id === initialItem.id ? loadedItem : p))
      );

      // Execute render pipeline to WebP
      const exportResult = await executeRenderPipeline(loadedItem);

      // Mark ready with WebP export result
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === initialItem.id
            ? { ...p, exportResult, status: 'ready' }
            : p
        )
      );
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'خطا در بارگذاری تصویر';
      console.error(`Error loading image ${initialItem.file.name}:`, err);

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === initialItem.id
            ? { ...p, status: 'error', errorMessage }
            : p
        )
      );
    }
  }, []);

  // Process incoming files (supports multiple files of same or different formats)
  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    // 1. Create immediate placeholder items for all files so user sees immediate feedback
    const baseTimestamp = Date.now();
    const newItems: PhotoItem[] = files.map((file, idx) => {
      const ext = file.name.split('.').pop() || '';
      const id = `photo-${baseTimestamp}-${idx}-${Math.floor(Math.random() * 100000)}`;
      return {
        id,
        file,
        originalName: file.name,
        originalExtension: ext,
        fileSizeBytes: file.size,
        originalWidth: 0,
        originalHeight: 0,
        imageElement: null,
        objectUrl: '',
        cropRect: { x: 0, y: 0, width: 0, height: 0 },
        selectedSubjectId: undefined,
        colorAdjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
        status: 'decoding',
        activeVariant: 'under200kb',
      };
    });

    // Append all items to queue
    setPhotos((prev) => [...prev, ...newItems]);

    // Select the first newly added photo if nothing was active
    setActivePhotoId((prevActive) => prevActive || newItems[0]?.id || null);

    // 2. Controlled concurrency queue (2 workers) to safely process heavy images without browser crash
    const queue = [...newItems];
    const concurrency = 2;

    const runWorker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        await processSinglePhotoItem(item);
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, queue.length) },
      () => runWorker()
    );
    await Promise.all(workers);
  };

  const triggerPipelineRender = useCallback((id: string, overridePhoto?: PhotoItem) => {
    if (renderTimeoutRef.current[id]) {
      window.clearTimeout(renderTimeoutRef.current[id]);
    }

    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'rendering' } : p))
    );

    renderTimeoutRef.current[id] = window.setTimeout(async () => {
      let target: PhotoItem | undefined = overridePhoto;
      if (!target) {
        setPhotos((current) => {
          target = current.find((p) => p.id === id);
          return current;
        });
      }

      if (!target || !target.imageElement) return;

      try {
        const result = await executeRenderPipeline(target);
        setPhotos((latest) =>
          latest.map((p) => {
            if (p.id !== id) return p;
            return {
              ...p,
              exportResult: result,
              status: 'ready',
            };
          })
        );
      } catch (err) {
        console.error('Pipeline error:', err);
        setPhotos((latest) =>
          latest.map((p) => {
            if (p.id !== id) return p;
            return {
              ...p,
              status: 'error',
              errorMessage: 'خطا در فشرده‌سازی خروجی WebP',
            };
          })
        );
      }
    }, 150);
  }, []);

  const handleCropChange = (newCrop: BoundingBox) => {
    if (!activePhotoId) return;
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== activePhotoId) return p;
        const updated = { ...p, cropRect: newCrop };
        triggerPipelineRender(activePhotoId, updated);
        return updated;
      })
    );
  };

  const handleSelectSubject = (subjectId: string) => {
    if (!activePhotoId) return;
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== activePhotoId) return p;
        return { ...p, selectedSubjectId: subjectId };
      })
    );
  };

  const handleUpdateColors = (newColors: ColorAdjustments) => {
    if (!activePhotoId) return;
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== activePhotoId) return p;
        const updated = { ...p, colorAdjustments: newColors };
        triggerPipelineRender(activePhotoId, updated);
        return updated;
      })
    );
  };

  const handleSelectVariant = (variantKey: 'under200kb' | 'highQuality') => {
    if (!activePhotoId) return;
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== activePhotoId) return p;
        return { ...p, activeVariant: variantKey };
      })
    );
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.objectUrl) {
        try {
          URL.revokeObjectURL(target.objectUrl);
        } catch {
          // Ignore
        }
      }
      const filtered = prev.filter((p) => p.id !== id);
      if (activePhotoId === id) {
        setActivePhotoId(filtered[0]?.id || null);
      }
      return filtered;
    });
  };

  const handleRetryPhoto = useCallback(
    (photoId: string) => {
      const target = photos.find((p) => p.id === photoId);
      if (!target) return;

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, status: 'decoding', errorMessage: undefined }
            : p
        )
      );

      processSinglePhotoItem(target);
    },
    [photos, processSinglePhotoItem]
  );

  const handleDownloadAllWebp = async () => {
    const readyPhotos = photos.filter(
      (p) => p.status === 'ready' && p.exportResult
    );
    if (readyPhotos.length === 0) return;

    try {
      setIsZipping(true);
      setZipProgress(0);

      const itemsToZip = readyPhotos.map((p) => {
        const variant =
          p.activeVariant === 'highQuality' && p.exportResult?.secondary
            ? p.exportResult.secondary
            : p.exportResult!.primary;
        return {
          blob: variant.blob,
          filename: generateWebpFilename(p.originalName),
        };
      });

      await downloadPhotosAsZip(
        itemsToZip,
        `fashion_photos_webp_${Date.now()}.zip`,
        (pct) => setZipProgress(pct)
      );
    } catch (err) {
      console.error('Failed to bundle zip:', err);
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  return (
    <div className="h-screen max-h-screen bg-neutral-100 dark:bg-[#0d0f15] text-neutral-800 dark:text-neutral-100 flex flex-col overflow-hidden font-sans selection:bg-sky-500/20 selection:text-sky-700 dark:selection:text-sky-200 transition-colors duration-200">
      {/* Hidden File Input for header trigger */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.jpe,.jfif,.png,.webp,.heic,.heif,.hif,.avif,.bmp,.gif,image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Top Bar Header */}
      <Header
        onOpenRatioInfo={() => setIsRatioInfoOpen(true)}
        onTriggerUpload={() => fileInputRef.current?.click()}
        photosCount={photos.length}
        readyPhotosCount={readyPhotosCount}
        onDownloadAll={handleDownloadAllWebp}
        isZipping={isZipping}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {photos.length === 0 ? (
          /* Empty State: Upload Dropzone */
          <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
            <UploadDropzone onFilesSelected={handleFilesSelected} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
            {/* DESKTOP LAYOUT (Screen size >= lg) */}
            <div className="hidden lg:flex flex-1 flex-row min-h-0 h-full overflow-hidden">
              {/* Queue Sidebar */}
              <PhotoQueue
                photos={photos}
                activeId={activePhotoId}
                onSelectPhoto={(id) => setActivePhotoId(id)}
                onRemovePhoto={handleRemovePhoto}
                onAddMore={() => fileInputRef.current?.click()}
                onDownloadAll={handleDownloadAllWebp}
                isZipping={isZipping}
              />

              {/* Center Workspace */}
              {activePhoto ? (
                <CropWorkspace
                  photo={activePhoto}
                  onCropChange={handleCropChange}
                  onSelectSubject={handleSelectSubject}
                  isComparing={isComparing}
                  workspaceMode={workspaceMode}
                  onToggleMode={setWorkspaceMode}
                  onRetry={handleRetryPhoto}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">
                  یک تصویر را از لیست انتخاب فرمایید
                </div>
              )}

              {/* Adjustments Panel */}
              {activePhoto && (
                <AdjustmentsPanel
                  photo={activePhoto}
                  onUpdateColors={handleUpdateColors}
                  onSelectVariant={handleSelectVariant}
                  onToggleCompare={setIsComparing}
                  isComparing={isComparing}
                />
              )}
            </div>

            {/* MOBILE & TABLET LAYOUT (Screen size < lg) */}
            <div className="flex lg:hidden flex-1 flex-col min-h-0 h-full relative overflow-hidden">
              {/* Top Photo Strip for mobile */}
              <MobilePhotoStrip
                photos={photos}
                activeId={activePhotoId}
                onSelectPhoto={(id) => setActivePhotoId(id)}
                onRemovePhoto={handleRemovePhoto}
                onAddMore={() => fileInputRef.current?.click()}
              />

              {/* Mobile Main Canvas Viewport */}
              <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
                {activePhoto ? (
                  <CropWorkspace
                    photo={activePhoto}
                    onCropChange={handleCropChange}
                    onSelectSubject={handleSelectSubject}
                    isComparing={isComparing}
                    workspaceMode={workspaceMode}
                    onToggleMode={setWorkspaceMode}
                    onRetry={handleRetryPhoto}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">
                    تصویری انتخاب نشده است
                  </div>
                )}
              </div>

              {/* Mobile Bottom Navigation & Controls */}
              {activePhoto && (
                <MobileControls
                  photo={activePhoto}
                  photos={photos}
                  onSelectPhoto={(id) => setActivePhotoId(id)}
                  onRemovePhoto={handleRemovePhoto}
                  onAddMore={() => fileInputRef.current?.click()}
                  onUpdateColors={handleUpdateColors}
                  onSelectVariant={handleSelectVariant}
                  onToggleCompare={setIsComparing}
                  isComparing={isComparing}
                  workspaceMode={workspaceMode}
                  onToggleMode={setWorkspaceMode}
                  onCropChange={handleCropChange}
                  onSelectSubject={handleSelectSubject}
                  onDownloadAll={handleDownloadAllWebp}
                  isZipping={isZipping}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <RatioInfoModal
        isOpen={isRatioInfoOpen}
        onClose={() => setIsRatioInfoOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
