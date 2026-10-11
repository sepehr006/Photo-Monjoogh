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
import { HostingGuideModal } from './components/HostingGuideModal';
import { RatioInfoModal } from './components/RatioInfoModal';

function AppContent() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<'preview' | 'crop'>('preview');

  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isRatioInfoOpen, setIsRatioInfoOpen] = useState<boolean>(false);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderTimeoutRef = useRef<Record<string, number>>({});

  // Active photo object
  const activePhoto = photos.find((p) => p.id === activePhotoId) || null;

  // Process incoming files (HEIC, JPG, JPEG)
  const handleFilesSelected = async (files: File[]) => {
    for (const file of files) {
      const tempId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newItem: PhotoItem = {
        id: tempId,
        file,
        originalName: file.name,
        originalExtension: file.name.split('.').pop()?.toLowerCase() || 'jpg',
        fileSizeBytes: file.size,
        originalWidth: 0,
        originalHeight: 0,
        imageElement: null,
        objectUrl: '',
        status: 'decoding',
        cropRect: { x: 0, y: 0, width: 300, height: 400 },
        colorAdjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
        activeVariant: 'under200kb',
      };

      setPhotos((prev) => [...prev, newItem]);
      setActivePhotoId(tempId);

      // Async validation & detection
      processNewPhoto(tempId, file);
    }
  };

  const processNewPhoto = async (id: string, file: File) => {
    try {
      // 1. Validation & HEIC decoding & Image loading
      const validated = await validateAndLoadImage(file);

      // 2. Client-side subject & clothing detection
      const detection = detectSubjectsAndSuggestCrop(validated.imageElement);

      const initialCrop = detection.suggestedCrop;
      const primarySubj = detection.subjects.find((s) => s.isPrimary);

      // Update photo state to ready
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            status: 'rendering',
            imageElement: validated.imageElement,
            objectUrl: validated.objectUrl,
            originalWidth: validated.width,
            originalHeight: validated.height,
            detectionResult: detection,
            selectedSubjectId: primarySubj?.id,
            cropRect: initialCrop,
          };
        })
      );

      // 3. Initial pipeline execution (crop, colors, 200KB compression)
      triggerPipelineRender(id);
    } catch (err: any) {
      console.error('Error processing photo:', err);
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            status: 'error',
            errorMessage: err.message || 'خطا در بارگذاری تصویر',
          };
        })
      );
    }
  };

  // Re-run pipeline with debounce when crop, colors or background change
  const triggerPipelineRender = useCallback((photoId: string) => {
    if (renderTimeoutRef.current[photoId]) {
      window.clearTimeout(renderTimeoutRef.current[photoId]);
    }

    renderTimeoutRef.current[photoId] = window.setTimeout(async () => {
      setPhotos((currentPhotos) => {
        const item = currentPhotos.find((p) => p.id === photoId);
        if (!item || !item.imageElement) return currentPhotos;

        executeRenderPipeline(item)
          .then((exportResult) => {
            setPhotos((latest) =>
              latest.map((p) => {
                if (p.id !== photoId) return p;
                if (p.exportResult) {
                  try {
                    if (p.exportResult.primary?.dataUrl) {
                      URL.revokeObjectURL(p.exportResult.primary.dataUrl);
                    }
                    if (p.exportResult.secondary?.dataUrl) {
                      URL.revokeObjectURL(p.exportResult.secondary.dataUrl);
                    }
                  } catch {
                    // Ignore
                  }
                }
                return {
                  ...p,
                  status: 'ready',
                  exportResult,
                };
              })
            );
          })
          .catch((err) => {
            console.error('Pipeline error:', err);
          });

        return currentPhotos;
      });
    }, 250);
  }, []);

  // Handlers for adjustments
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
    <div className="h-screen max-h-screen bg-neutral-100 dark:bg-[#0d0f15] text-neutral-800 dark:text-neutral-100 flex flex-col overflow-hidden font-sans selection:bg-amber-500/20 selection:text-amber-700 dark:selection:text-amber-200 transition-colors duration-200">
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

      {/* Top Bar Contract (1 Row, 3 Zones) */}
      <Header
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenRatioInfo={() => setIsRatioInfoOpen(true)}
        onTriggerUpload={() => fileInputRef.current?.click()}
        photosCount={photos.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {photos.length === 0 ? (
          /* Empty State: Dropzone & Sample Fashion Shoots */
          <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
            <UploadDropzone onFilesSelected={handleFilesSelected} />
          </div>
        ) : (
          /* Workspace Layout for Laptop Team */
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 h-full overflow-hidden">
            {/* 1. Queue Sidebar */}
            <PhotoQueue
              photos={photos}
              activeId={activePhotoId}
              onSelectPhoto={(id) => setActivePhotoId(id)}
              onRemovePhoto={handleRemovePhoto}
              onAddMore={() => fileInputRef.current?.click()}
            />

            {/* 2. Center: Large Interactive 3:4 Crop Workspace */}
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

            {/* 3. Adjustments and WebP Export Panel */}
            {activePhoto && (
              <AdjustmentsPanel
                photo={activePhoto}
                onUpdateColors={handleUpdateColors}
                onSelectVariant={handleSelectVariant}
                onToggleCompare={setIsComparing}
                isComparing={isComparing}
                onFocusPreview={() => setWorkspaceMode('preview')}
                onFocusCrop={() => setWorkspaceMode('crop')}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <HostingGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

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
