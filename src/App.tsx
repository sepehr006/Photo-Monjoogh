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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderTimeoutRef = useRef<Record<string, number>>({});

  // Active photo object
  const activePhoto = photos.find((p) => p.id === activePhotoId) || null;

  // Process incoming files
  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const loaded = await validateAndLoadImage(file);
        const id = `photo-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const detectionResult = detectSubjectsAndSuggestCrop(loaded.imageElement);

        const newPhotoItem: PhotoItem = {
          id,
          file,
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
          colorAdjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
          status: 'decoding',
          activeVariant: 'under200kb',
        };

        setPhotos((prev) => [...prev, newPhotoItem]);

        if (!activePhotoId) {
          setActivePhotoId(id);
        }

        triggerPipelineRender(id, newPhotoItem);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'نامشخص';
        console.error(`Error loading image ${file.name}:`, err);
        const errorItem: PhotoItem = {
          id: `error-${Date.now()}-${Math.random()}`,
          file,
          originalName: file.name,
          originalExtension: file.name.split('.').pop() || '',
          fileSizeBytes: file.size,
          originalWidth: 0,
          originalHeight: 0,
          objectUrl: '',
          imageElement: null as unknown as HTMLImageElement,
          cropRect: { x: 0, y: 0, width: 0, height: 0 },
          selectedSubjectId: undefined,
          colorAdjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
          status: 'error',
          errorMessage,
          activeVariant: 'under200kb',
        };
        setPhotos((prev) => [...prev, errorItem]);
      }
    }
  };

  const triggerPipelineRender = useCallback((id: string, overridePhoto?: PhotoItem) => {
    if (renderTimeoutRef.current[id]) {
      window.clearTimeout(renderTimeoutRef.current[id]);
    }

    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'rendering' } : p))
    );

    renderTimeoutRef.current[id] = window.setTimeout(async () => {
      setPhotos((prev) => {
        const target = overridePhoto || prev.find((p) => p.id === id);
        if (!target || !target.imageElement) return prev;

        executeRenderPipeline(target).then((result) => {
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
        });

        return prev;
      });
    }, 200);
  }, []);

  const handleCropChange = (newCrop: BoundingBox) => {
    if (!activePhotoId) return;
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== activePhotoId) return p;
        return { ...p, cropRect: newCrop };
      })
    );
    triggerPipelineRender(activePhotoId);
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
        return { ...p, colorAdjustments: newColors };
      })
    );
    triggerPipelineRender(activePhotoId);
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

  return (
    <div className="h-screen max-h-screen bg-neutral-100 dark:bg-[#0d0f15] text-neutral-800 dark:text-neutral-100 flex flex-col overflow-hidden font-sans selection:bg-sky-500/20 selection:text-sky-700 dark:selection:text-sky-200 transition-colors duration-200">
      {/* Hidden File Input for header trigger */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.avif,image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/*"
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
