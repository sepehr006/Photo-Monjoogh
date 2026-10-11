/**
 * Interactive 3:4 Workspace
 * Two core modes:
 * 1. "preview": The WebP output preview centered and occupying ~two-thirds (2/3) of the middle monitor space
 * 2. "crop": User-adjustable 3:4 crop box with 8 handles and intuitive dragging
 * Fully supports Day & Night mode, Vazirmatn typography, responsive and laptop-optimized.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PhotoItem, BoundingBox, ExportVariant } from '../types/image';
import {
  ASPECT_RATIO,
  clampCropToImage,
  getLargest3x4Crop,
  getMediumShot3x4Crop,
} from '../modules/cropping';
import { calculateFashion3x4Crop } from '../modules/subjectDetection';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Users,
  User,
  Sparkles,
  AlertTriangle,
  Move,
  Crop as CropIcon,
  Download,
  Eye,
  RotateCcw,
  CheckCircle2,
  Maximize,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { triggerDownloadBlob, generateWebpFilename } from '../modules/downloading';
import { formatFileSize } from '../modules/fileValidation';

interface CropWorkspaceProps {
  photo: PhotoItem;
  onCropChange: (newCrop: BoundingBox) => void;
  onSelectSubject: (subjectId: string) => void;
  isComparing?: boolean;
  workspaceMode?: 'preview' | 'crop';
  onToggleMode?: (mode: 'preview' | 'crop') => void;
}

type DragMode =
  | 'none'
  | 'move'
  | 'nw'
  | 'ne'
  | 'sw'
  | 'se'
  | 'n'
  | 's'
  | 'e'
  | 'w';

export const CropWorkspace: React.FC<CropWorkspaceProps> = ({
  photo,
  onCropChange,
  onSelectSubject,
  isComparing,
  workspaceMode = 'preview',
  onToggleMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { theme } = useTheme();

  // Internal mode fallback if not controlled by parent
  const [internalMode, setInternalMode] = useState<'preview' | 'crop'>('preview');
  const activeMode = onToggleMode ? workspaceMode : internalMode;
  const setMode = (mode: 'preview' | 'crop') => {
    if (onToggleMode) onToggleMode(mode);
    else setInternalMode(mode);
  };

  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialCrop, setInitialCrop] = useState<BoundingBox>(photo.cropRect);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = fit

  const imgW = photo.originalWidth || 1200;
  const imgH = photo.originalHeight || 1600;

  // Selected export variant (under 200kb or high quality)
  const selectedVariant: ExportVariant | undefined =
    photo.activeVariant === 'highQuality' && photo.exportResult?.secondary
      ? photo.exportResult.secondary
      : photo.exportResult?.primary;

  // Geometry of the source image as rendered on screen
  const [displayedImgRect, setDisplayedImgRect] = useState<{
    width: number;
    height: number;
    left: number;
    top: number;
  }>({ width: 0, height: 0, left: 0, top: 0 });

  // Update geometry directly from the rendered <img> element
  const updateGeometryFromImage = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return;
    const contRect = containerRef.current.getBoundingClientRect();
    const imgRect = imageRef.current.getBoundingClientRect();

    if (imgRect.width > 20 && imgRect.height > 20) {
      setDisplayedImgRect({
        width: imgRect.width,
        height: imgRect.height,
        left: imgRect.left - contRect.left,
        top: imgRect.top - contRect.top,
      });
    }
  }, []);

  // Monitor resizes of container or image
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      updateGeometryFromImage();
    });
    observer.observe(el);

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    updateGeometryFromImage();
    const t = setTimeout(updateGeometryFromImage, 80);

    return () => {
      observer.disconnect();
      clearTimeout(t);
    };
  }, [updateGeometryFromImage, photo.id, activeMode, zoomLevel]);

  // Convert crop rect from original image pixels to displayed screen coordinates
  const scaleToScreen = (val: number, axis: 'x' | 'y') => {
    if (!displayedImgRect.width || !displayedImgRect.height) return val;
    const scale =
      axis === 'x' ? displayedImgRect.width / imgW : displayedImgRect.height / imgH;
    return val * scale;
  };

  const screenCrop = {
    left: displayedImgRect.left + scaleToScreen(photo.cropRect.x, 'x'),
    top: displayedImgRect.top + scaleToScreen(photo.cropRect.y, 'y'),
    width: scaleToScreen(photo.cropRect.width, 'x'),
    height: scaleToScreen(photo.cropRect.height, 'y'),
  };

  // Drag handlers for completely adjustable crop box
  const handlePointerDown = (mode: DragMode, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Safe fallback
    }
    setDragMode(mode);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialCrop({ ...photo.cropRect });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragMode === 'none') return;
    e.preventDefault();

    if (!displayedImgRect.width || !displayedImgRect.height) return;

    const scaleX = imgW / displayedImgRect.width;
    const scaleY = imgH / displayedImgRect.height;
    const dx = (e.clientX - dragStart.x) * scaleX;
    const dy = (e.clientY - dragStart.y) * scaleY;

    let newCrop = { ...initialCrop };

    if (dragMode === 'move') {
      newCrop.x = initialCrop.x + dx;
      newCrop.y = initialCrop.y + dy;
    } else {
      // Handles strictly locked to 3:4 ratio (width = height * 0.75)
      let targetH = initialCrop.height;
      let targetW = initialCrop.width;

      if (dragMode === 'se') {
        targetH = Math.max(80, initialCrop.height + dy);
        targetW = targetH * ASPECT_RATIO;
        newCrop.width = targetW;
        newCrop.height = targetH;
      } else if (dragMode === 'sw') {
        targetH = Math.max(80, initialCrop.height + dy);
        targetW = targetH * ASPECT_RATIO;
        const dw = targetW - initialCrop.width;
        newCrop.x = initialCrop.x - dw;
        newCrop.width = targetW;
        newCrop.height = targetH;
      } else if (dragMode === 'ne') {
        targetH = Math.max(80, initialCrop.height - dy);
        targetW = targetH * ASPECT_RATIO;
        newCrop.y = initialCrop.y + (initialCrop.height - targetH);
        newCrop.width = targetW;
        newCrop.height = targetH;
      } else if (dragMode === 'nw') {
        targetH = Math.max(80, initialCrop.height - dy);
        targetW = targetH * ASPECT_RATIO;
        const dw = targetW - initialCrop.width;
        newCrop.x = initialCrop.x - dw;
        newCrop.y = initialCrop.y + (initialCrop.height - targetH);
        newCrop.width = targetW;
        newCrop.height = targetH;
      } else if (dragMode === 's') {
        targetH = Math.max(80, initialCrop.height + dy);
        targetW = targetH * ASPECT_RATIO;
        newCrop.height = targetH;
        newCrop.width = targetW;
      } else if (dragMode === 'n') {
        targetH = Math.max(80, initialCrop.height - dy);
        targetW = targetH * ASPECT_RATIO;
        newCrop.y = initialCrop.y + (initialCrop.height - targetH);
        newCrop.height = targetH;
        newCrop.width = targetW;
      } else if (dragMode === 'e') {
        targetW = Math.max(60, initialCrop.width + dx);
        targetH = targetW / ASPECT_RATIO;
        newCrop.width = targetW;
        newCrop.height = targetH;
      } else if (dragMode === 'w') {
        targetW = Math.max(60, initialCrop.width - dx);
        targetH = targetW / ASPECT_RATIO;
        newCrop.x = initialCrop.x + (initialCrop.width - targetW);
        newCrop.width = targetW;
        newCrop.height = targetH;
      }
    }

    const clamped = clampCropToImage(newCrop, imgW, imgH);
    onCropChange(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragMode !== 'none') {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
      setDragMode('none');
    }
  };

  // Preset button actions
  const applyAutoSubjectCrop = () => {
    if (photo.detectionResult?.suggestedCrop) {
      onCropChange(photo.detectionResult.suggestedCrop);
    }
  };

  const applyFullBodyCrop = () => {
    const largest = getLargest3x4Crop(imgW, imgH);
    onCropChange(largest);
  };

  const applyMediumShotCrop = () => {
    const primarySubj = photo.detectionResult?.subjects.find((s) => s.isPrimary);
    const medium = getMediumShot3x4Crop(imgW, imgH, primarySubj?.bbox);
    onCropChange(medium);
  };

  const applyCenterCrop = () => {
    const largest = getLargest3x4Crop(imgW, imgH);
    onCropChange(largest);
  };

  const handleSelectSubjectPill = (subjId: string) => {
    onSelectSubject(subjId);
    const subj = photo.detectionResult?.subjects.find((s) => s.id === subjId);
    if (subj) {
      const { crop } = calculateFashion3x4Crop(subj.bbox, imgW, imgH, subj.garmentBbox);
      onCropChange(crop);
    }
  };

  const handleQuickDownload = () => {
    if (!selectedVariant) return;
    const filename = generateWebpFilename(photo.originalName);
    triggerDownloadBlob(selectedVariant.blob, filename);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 bg-neutral-100 dark:bg-[#0a0c10] select-none relative overflow-hidden transition-colors duration-200">
      {/* Top Workspace Controls: Mode Switcher, Presets, Multi-model Bar & Zoom */}
      <div className="px-4 py-2.5 bg-white/95 dark:bg-[#12141c]/90 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20 shadow-xs">
        {/* Left Side: View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'preview'
                  ? 'bg-sky-400 text-neutral-950 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Maximize className="w-3.5 h-3.5" />
              <span>پیش‌نمایش خروجی WebP</span>
              {photo.status === 'ready' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMode('crop')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'crop'
                  ? 'bg-sky-400 text-neutral-950 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <CropIcon className="w-3.5 h-3.5" />
              <span>تنظیم کادر برش (۳:۴)</span>
            </button>
          </div>

          {/* Quick preset crop buttons (shown when in crop mode) */}
          {activeMode === 'crop' && (
            <div className="hidden lg:flex items-center gap-1">
              <button
                type="button"
                onClick={applyAutoSubjectCrop}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300 hover:bg-sky-500/25 border border-sky-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                title="تشخیص هوشمند مدل و کادربندی پیشنهادی"
              >
                <Sparkles className="w-3 h-3 text-sky-500" />
                <span>هوشمند</span>
              </button>

              <button
                type="button"
                onClick={applyMediumShotCrop}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="کادر پرتره و لباس (نیم‌تنه)"
              >
                <User className="w-3 h-3 text-neutral-500" />
                <span>پرتره و لباس</span>
              </button>

              <button
                type="button"
                onClick={applyFullBodyCrop}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="حداکثر کادر ۳:۴ برای نمایش تمام‌قد"
              >
                <Maximize2 className="w-3 h-3 text-neutral-500" />
                <span>تمام‌قد</span>
              </button>

              <button
                type="button"
                onClick={applyCenterCrop}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="تنظیم کادر در مرکز تصویر"
              >
                <RotateCcw className="w-3 h-3 text-neutral-500" />
                <span>وسط‌چین</span>
              </button>
            </div>
          )}
        </div>

        {/* Multi-model selection bar if multiple subjects detected */}
        {activeMode === 'crop' &&
          photo.detectionResult &&
          photo.detectionResult.subjects.length > 1 && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
              <span className="text-[11px] text-neutral-600 dark:text-neutral-400 flex items-center gap-1 px-1 font-bold">
                <Users className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                <span>انتخاب مدل:</span>
              </span>
              {photo.detectionResult.subjects.map((subj) => {
                const isSelected = photo.selectedSubjectId === subj.id;
                return (
                  <button
                    key={subj.id}
                    onClick={() => handleSelectSubjectPill(subj.id)}
                    className={`px-2 py-0.5 text-xs rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {subj.label}
                  </button>
                );
              })}
            </div>
          )}

        {/* Right Side: Telemetry & Zoom Controls */}
        <div className="flex items-center gap-3">
          {activeMode === 'crop' ? (
            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 tabular-nums font-bold">
              <span className="text-sky-600 dark:text-sky-400">
                {Math.round(photo.cropRect.width)} × {Math.round(photo.cropRect.height)}
              </span>
              <span className="text-neutral-400">px</span>
              <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/40">
                ۳:۴ ✓
              </span>
            </div>
          ) : selectedVariant ? (
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold tabular-nums">
              <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/40">
                {selectedVariant.width} × {selectedVariant.height} px
              </span>
              <span className="text-sky-700 dark:text-sky-400">
                {selectedVariant.sizeKb} KB
              </span>
            </div>
          ) : null}

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
              className="p-1 hover:text-neutral-900 dark:hover:text-white text-neutral-500 dark:text-neutral-400 transition-colors"
              title="کوچک‌نمایی"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="text-[11px] px-1 text-neutral-700 dark:text-neutral-300 font-bold hover:text-sky-500 cursor-pointer"
              title="بازنشانی اندازه کادر"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
              className="p-1 hover:text-neutral-900 dark:hover:text-white text-neutral-500 dark:text-neutral-400 transition-colors"
              title="بزرگ‌نمایی"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Warning Notice if Subject is wider/taller than 3:4 */}
      {activeMode === 'crop' && photo.detectionResult?.fitWarning && (
        <div className="bg-sky-100 dark:bg-sky-950/40 border-b border-sky-300 dark:border-sky-800/40 px-4 py-1.5 flex items-center gap-2 text-xs text-sky-900 dark:text-sky-200 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>{photo.detectionResult.fitWarning}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: HERO WEBP OUTPUT PREVIEW (Center of monitor, ~2/3 of space)      */}
      {/* ========================================================================= */}
      {activeMode === 'preview' && (
        <div
          className={`flex-1 min-h-0 w-full relative overflow-hidden flex flex-col items-center justify-center p-4 md:p-6 ${
            theme === 'dark' ? 'bg-transparency-grid' : 'bg-transparency-grid-light'
          }`}
        >
          {/* Comparison indicator banner */}
          {isComparing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-sky-400 text-neutral-950 font-bold text-xs shadow-lg flex items-center gap-2 border border-sky-500 animate-pulse pointer-events-none">
              <Eye className="w-4 h-4 text-neutral-950" />
              <span>حالت مقایسه: نمایش تصویر خام اولیه (بدون افکت و روتوش)</span>
            </div>
          )}

          {/* Central 2/3 Monitor Preview Card */}
          <div className="flex-1 w-full flex items-center justify-center relative min-h-0">
            {selectedVariant ? (
              <div
                className="relative aspect-[3/4] h-[66vh] max-h-[72vh] rounded-2xl overflow-hidden shadow-2xl border-2 transition-all flex items-center justify-center bg-white border-neutral-300 dark:border-neutral-800"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src={
                    isComparing && photo.exportResult?.originalCropDataUrl
                      ? photo.exportResult.originalCropDataUrl
                      : selectedVariant.dataUrl
                  }
                  alt="WebP Output Preview 3:4"
                  className="w-full h-full object-contain select-none"
                />

                {/* Overlaid Badges on Image */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {isComparing ? (
                    <span className="bg-sky-400 text-neutral-950 text-xs font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      عکس خام اولیه
                    </span>
                  ) : (
                    <span className="bg-black/75 backdrop-blur-md text-sky-300 text-xs font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      پیش‌نمایش خروجی WebP (۳:۴)
                    </span>
                  )}
                </div>

                <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-2 tabular-nums">
                  <span>
                    {selectedVariant.width} × {selectedVariant.height} px
                  </span>
                  <span className="text-neutral-400">·</span>
                  <span
                    className={
                      selectedVariant.isUnder200Kb ? 'text-emerald-400' : 'text-sky-300'
                    }
                  >
                    {selectedVariant.sizeKb} KB
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 bg-white/80 dark:bg-neutral-900/80 rounded-2xl border border-neutral-300 dark:border-neutral-700">
                <div className="w-10 h-10 rounded-full border-4 border-sky-400 border-t-transparent animate-spin mb-4" />
                <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  در حال آماده‌سازی و بهینه‌سازی عکس...
                </span>
              </div>
            )}
          </div>

          {/* Action Toolbar Below Centered 2/3 Preview */}
          <div className="mt-3 py-2 px-4 bg-white/95 dark:bg-[#12141c]/95 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl flex items-center justify-between gap-4 z-20 shrink-0 max-w-2xl w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode('crop')}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CropIcon className="w-3.5 h-3.5 text-sky-500" />
                <span>تنظیم کادر برش (کراپ)</span>
              </button>

              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="تنظیم خودکار با اندازه صفحه"
              >
                اندازه ۱۰۰٪
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!selectedVariant}
                onClick={handleQuickDownload}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-95 text-neutral-950 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-neutral-950" />
                <span>دانلود فوری فایل WebP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CROP & FRAME ADJUSTMENT (Original photo + Adjustable 3:4 Box)     */}
      {/* ========================================================================= */}
      {activeMode === 'crop' && (
        <div
          ref={containerRef}
          className={`flex-1 min-h-0 w-full relative overflow-hidden flex items-center justify-center p-4 ${
            theme === 'dark' ? 'bg-transparency-grid' : 'bg-transparency-grid-light'
          }`}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Comparison indicator */}
          {isComparing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-sky-400 text-neutral-950 font-bold text-xs shadow-lg flex items-center gap-2 border border-sky-500 animate-pulse pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-neutral-950 animate-ping" />
              <span>حالت مقایسه: نمایش تصویر خام اولیه (بدون افکت)</span>
            </div>
          )}

          {/* Source Image - cleanly centered with object-contain */}
          {photo.objectUrl && (
            <img
              ref={imageRef}
              src={photo.objectUrl}
              alt={photo.originalName}
              onLoad={updateGeometryFromImage}
              style={{
                maxWidth: 'calc(100% - 32px)',
                maxHeight: 'calc(100vh - 12rem)',
                objectFit: 'contain',
                display: 'block',
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
              className="shadow-2xl select-none"
            />
          )}

          {/* Dimmer Mask Outside Crop */}
          {displayedImgRect.width > 0 && (
            <div
              style={{
                position: 'absolute',
                left: `${displayedImgRect.left}px`,
                top: `${displayedImgRect.top}px`,
                width: `${displayedImgRect.width}px`,
                height: `${displayedImgRect.height}px`,
                pointerEvents: 'none',
              }}
            >
              <svg
                className="w-full h-full"
                style={{ position: 'absolute', inset: 0 }}
              >
                <defs>
                  <mask id="cropMask">
                    <rect width="100%" height="100%" fill="white" />
                    <rect
                      x={scaleToScreen(photo.cropRect.x, 'x')}
                      y={scaleToScreen(photo.cropRect.y, 'y')}
                      width={screenCrop.width}
                      height={screenCrop.height}
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  width="100%"
                  height="100%"
                  fill="rgba(0, 0, 0, 0.65)"
                  mask="url(#cropMask)"
                />
              </svg>
            </div>
          )}

          {/* Interactive, Completely User-Adjustable 3:4 Crop Frame */}
          {displayedImgRect.width > 0 && (
            <div
              style={{
                position: 'absolute',
                left: `${screenCrop.left}px`,
                top: `${screenCrop.top}px`,
                width: `${screenCrop.width}px`,
                height: `${screenCrop.height}px`,
                cursor: dragMode === 'move' ? 'grabbing' : 'grab',
              }}
              onPointerDown={(e) => handlePointerDown('move', e)}
              className="border-2 border-sky-400 ring-2 ring-black/50 group shadow-2xl transition-shadow select-none"
            >
              {/* Rule of Thirds Grid Lines */}
              <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="w-full h-1/3 border-b border-dashed border-sky-300/70" />
                <div className="w-full h-2/3 border-b border-dashed border-sky-300/70" />
                <div
                  className="h-full border-r border-dashed border-sky-300/70"
                  style={{ position: 'absolute', top: 0, left: '33.333%' }}
                />
                <div
                  className="h-full border-r border-dashed border-sky-300/70"
                  style={{ position: 'absolute', top: 0, left: '66.666%' }}
                />
              </div>

              {/* Center Move Icon Indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-60 transition-opacity">
                <div className="p-2 rounded-full bg-black/75 text-sky-300 shadow-xl">
                  <Move className="w-5 h-5" />
                </div>
              </div>

              {/* 4 Corner Handles (NW, NE, SW, SE) */}
              <div
                onPointerDown={(e) => handlePointerDown('nw', e)}
                className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-sky-400 border-2 border-neutral-900 rounded-md cursor-nwse-resize shadow-lg hover:scale-125 transition-transform"
                title="تغییر اندازه از گوشه بالا-چپ"
              />
              <div
                onPointerDown={(e) => handlePointerDown('ne', e)}
                className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-sky-400 border-2 border-neutral-900 rounded-md cursor-nesw-resize shadow-lg hover:scale-125 transition-transform"
                title="تغییر اندازه از گوشه بالا-راست"
              />
              <div
                onPointerDown={(e) => handlePointerDown('sw', e)}
                className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-sky-400 border-2 border-neutral-900 rounded-md cursor-nesw-resize shadow-lg hover:scale-125 transition-transform"
                title="تغییر اندازه از گوشه پایین-چپ"
              />
              <div
                onPointerDown={(e) => handlePointerDown('se', e)}
                className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-sky-400 border-2 border-neutral-900 rounded-md cursor-nwse-resize shadow-lg hover:scale-125 transition-transform"
                title="تغییر اندازه از گوشه پایین-راست"
              />

              {/* 4 Edge Handles (N, S, E, W) */}
              <div
                onPointerDown={(e) => handlePointerDown('n', e)}
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-3.5 bg-sky-400 border-2 border-neutral-900 rounded-full cursor-ns-resize shadow-md hover:scale-110 transition-transform"
                title="تغییر اندازه از لبه بالایی"
              />
              <div
                onPointerDown={(e) => handlePointerDown('s', e)}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-3.5 bg-sky-400 border-2 border-neutral-900 rounded-full cursor-ns-resize shadow-md hover:scale-110 transition-transform"
                title="تغییر اندازه از لبه پایینی"
              />
              <div
                onPointerDown={(e) => handlePointerDown('e', e)}
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-8 bg-sky-400 border-2 border-neutral-900 rounded-full cursor-ew-resize shadow-md hover:scale-110 transition-transform"
                title="تغییر اندازه از لبه راست"
              />
              <div
                onPointerDown={(e) => handlePointerDown('w', e)}
                className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-8 bg-sky-400 border-2 border-neutral-900 rounded-full cursor-ew-resize shadow-md hover:scale-110 transition-transform"
                title="تغییر اندازه از لبه چپ"
              />

              {/* Edge Pill Tag: 3:4 */}
              <div className="absolute bottom-2 right-2 bg-neutral-950/90 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-neutral-700 pointer-events-none shadow-md">
                نسبت پرتره ۳:۴
              </div>
            </div>
          )}

          {/* Quick Floating Button to Return to WebP Output Preview */}
          <button
            type="button"
            onClick={() => setMode('preview')}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-95 text-neutral-950 font-bold text-xs shadow-xl flex items-center gap-2 border border-sky-500 cursor-pointer transition-all"
          >
            <Maximize className="w-4 h-4 text-neutral-950" />
            <span>مشاهده پیش‌نمایش خروجی WebP</span>
          </button>
        </div>
      )}
    </div>
  );
};
