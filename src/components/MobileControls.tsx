/**
 * Mobile Controls & Bottom Navigation Bar
 * Optimized for touch devices (smartphones and small screens).
 * Simple, minimal, non-intrusive UI with live canvas feedback.
 */
import React, { useState } from 'react';
import {
  PhotoItem,
  ColorAdjustments,
  BoundingBox,
  ExportVariant,
} from '../types/image';
import {
  Crop as CropIcon,
  Sliders,
  Download,
  Images,
  X,
  RotateCcw,
  Eye,
  Sun,
  Contrast,
  Palette,
  Thermometer,
  CheckCircle2,
  Sparkles,
  Plus,
  Trash2,
  Maximize2,
  User,
  Users,
} from 'lucide-react';
import { triggerDownloadBlob, generateWebpFilename } from '../modules/downloading';
import { DEFAULT_COLOR_ADJUSTMENTS } from '../modules/colorAdjustment';
import { getLargest3x4Crop, getMediumShot3x4Crop } from '../modules/cropping';
import { calculateFashion3x4Crop } from '../modules/subjectDetection';

interface MobileControlsProps {
  photo: PhotoItem;
  photos: PhotoItem[];
  onSelectPhoto: (id: string) => void;
  onRemovePhoto: (id: string) => void;
  onAddMore: () => void;
  onUpdateColors: (colors: ColorAdjustments) => void;
  onSelectVariant: (variantKey: 'under200kb' | 'highQuality') => void;
  onToggleCompare: (isComparing: boolean) => void;
  isComparing: boolean;
  workspaceMode: 'preview' | 'crop';
  onToggleMode: (mode: 'preview' | 'crop') => void;
  onCropChange: (newCrop: BoundingBox) => void;
  onSelectSubject: (subjectId: string) => void;
}

type MobileTab = 'none' | 'crop' | 'color' | 'export' | 'photos';

export const MobileControls: React.FC<MobileControlsProps> = ({
  photo,
  photos,
  onSelectPhoto,
  onRemovePhoto,
  onAddMore,
  onUpdateColors,
  onSelectVariant,
  onToggleCompare,
  isComparing,
  workspaceMode,
  onToggleMode,
  onCropChange,
  onSelectSubject,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('none');

  const { colorAdjustments, exportResult, activeVariant } = photo;
  const imgW = photo.originalWidth || 1200;
  const imgH = photo.originalHeight || 1600;

  const selectedVariant: ExportVariant | undefined =
    activeVariant === 'highQuality' && exportResult?.secondary
      ? exportResult.secondary
      : exportResult?.primary;

  const handleDownload = () => {
    if (!selectedVariant) return;
    const filename = generateWebpFilename(photo.originalName);
    triggerDownloadBlob(selectedVariant.blob, filename);
  };

  const handleApplyFullCrop = () => {
    const crop = getLargest3x4Crop(imgW, imgH);
    onCropChange(crop);
  };

  const handleApplyMediumCrop = () => {
    const crop = getMediumShot3x4Crop(imgW, imgH);
    onCropChange(crop);
  };

  const handleApplySmartSubject = () => {
    if (photo.detectionResult?.subjects && photo.detectionResult.subjects.length > 0) {
      const topSub = photo.detectionResult.subjects[0];
      const { crop } = calculateFashion3x4Crop(topSub.bbox, imgW, imgH);
      onCropChange(crop);
      onSelectSubject(topSub.id);
    }
  };

  const resetColors = () => {
    onUpdateColors({ ...DEFAULT_COLOR_ADJUSTMENTS });
  };

  const toggleTab = (tab: MobileTab) => {
    if (activeTab === tab) {
      setActiveTab('none');
    } else {
      setActiveTab(tab);
      // Automatically toggle workspace mode when tapping crop tab
      if (tab === 'crop' && workspaceMode === 'preview') {
        onToggleMode('crop');
      }
    }
  };

  return (
    <div className="lg:hidden shrink-0 z-30">
      {/* Sliding Drawer for Active Tool */}
      {activeTab !== 'none' && (
        <div className="bg-white/95 dark:bg-[#12141c]/95 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800 shadow-2xl transition-all duration-200 max-h-[45vh] flex flex-col">
          {/* Drawer Header */}
          <div className="px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              {activeTab === 'crop' && (
                <>
                  <CropIcon className="w-4 h-4 text-sky-500" />
                  <span>تنظیم کادر و کراپ تصویر</span>
                </>
              )}
              {activeTab === 'color' && (
                <>
                  <Sliders className="w-4 h-4 text-sky-500" />
                  <span>تنظیم نور و رنگ پوشاک</span>
                </>
              )}
              {activeTab === 'export' && (
                <>
                  <Download className="w-4 h-4 text-sky-500" />
                  <span>دانلود و فرمت WebP</span>
                </>
              )}
              {activeTab === 'photos' && (
                <>
                  <Images className="w-4 h-4 text-sky-500" />
                  <span>لیست تصاویر ({photos.length})</span>
                </>
              )}
            </span>

            <button
              onClick={() => setActiveTab('none')}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-4 overflow-y-auto space-y-4 text-xs">
            {/* ----------------- CROP TAB ----------------- */}
            {activeTab === 'crop' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleMode('preview')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                      workspaceMode === 'preview'
                        ? 'bg-sky-400 text-neutral-950 shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    پیش‌نمایش خروجی
                  </button>

                  <button
                    onClick={() => onToggleMode('crop')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                      workspaceMode === 'crop'
                        ? 'bg-sky-400 text-neutral-950 shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    ویرایش کادر برش (۳:۴)
                  </button>
                </div>

                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 block mb-2">
                    میانبرهای برش هوشمند:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={handleApplyFullCrop}
                      className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-center"
                    >
                      <Maximize2 className="w-3.5 h-3.5 mx-auto mb-1 text-sky-500" />
                      کادر کامل
                    </button>

                    <button
                      onClick={handleApplyMediumCrop}
                      className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-center text-ellipsis overflow-hidden"
                    >
                      <User className="w-3.5 h-3.5 mx-auto mb-1 text-sky-500" />
                      کادر متوسط
                    </button>

                    <button
                      onClick={handleApplySmartSubject}
                      className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-center"
                    >
                      <Sparkles className="w-3.5 h-3.5 mx-auto mb-1 text-sky-500" />
                      هوشمند سوژه
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- COLOR TAB ----------------- */}
            {activeTab === 'color' && (
              <div className="space-y-3.5">
                {/* Auto correct */}
                <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    اصلاح هوشمند نور
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateColors({
                        ...colorAdjustments,
                        autoCorrect: !colorAdjustments.autoCorrect,
                      })
                    }
                    className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${
                      colorAdjustments.autoCorrect ? 'bg-sky-400' : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white dark:bg-neutral-950 absolute top-1 transition-transform ${
                        colorAdjustments.autoCorrect ? 'right-5.5' : 'right-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Sliders Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Brightness */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-600 dark:text-neutral-400 font-medium">روشنایی</span>
                      <span className="font-bold tabular-nums">{colorAdjustments.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={colorAdjustments.brightness}
                      onChange={(e) =>
                        onUpdateColors({ ...colorAdjustments, brightness: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-sky-500 cursor-pointer h-1.5"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-600 dark:text-neutral-400 font-medium">کنتراست</span>
                      <span className="font-bold tabular-nums">{colorAdjustments.contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={colorAdjustments.contrast}
                      onChange={(e) =>
                        onUpdateColors({ ...colorAdjustments, contrast: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-sky-500 cursor-pointer h-1.5"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-600 dark:text-neutral-400 font-medium">اشباع رنگ</span>
                      <span className="font-bold tabular-nums">{colorAdjustments.saturation}</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={colorAdjustments.saturation}
                      onChange={(e) =>
                        onUpdateColors({ ...colorAdjustments, saturation: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-sky-500 cursor-pointer h-1.5"
                    />
                  </div>

                  {/* Warmth */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-600 dark:text-neutral-400 font-medium">دمای رنگ</span>
                      <span className="font-bold tabular-nums">{colorAdjustments.warmth}</span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      value={colorAdjustments.warmth}
                      onChange={(e) =>
                        onUpdateColors({ ...colorAdjustments, warmth: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-sky-500 cursor-pointer h-1.5"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={resetColors}
                    className="flex-1 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 font-bold text-center"
                  >
                    بازنشانی
                  </button>

                  <button
                    onMouseDown={() => onToggleCompare(true)}
                    onMouseUp={() => onToggleCompare(false)}
                    onTouchStart={() => onToggleCompare(true)}
                    onTouchEnd={() => onToggleCompare(false)}
                    className={`flex-1 py-1.5 rounded-lg border font-bold text-center ${
                      isComparing
                        ? 'bg-sky-400 text-neutral-950 border-sky-400'
                        : 'border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800'
                    }`}
                  >
                    نگه‌دارید برای مقایسه
                  </button>
                </div>
              </div>
            )}

            {/* ----------------- EXPORT TAB ----------------- */}
            {activeTab === 'export' && (
              <div className="space-y-3">
                {selectedVariant && (
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
                    <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                      <span>حجم نهایی:</span>
                      <span className="font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                        {selectedVariant.sizeKb} کیلوبایت
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                      <span>ابعاد پرتره:</span>
                      <span className="font-bold tabular-nums">
                        {selectedVariant.width} × {selectedVariant.height} px
                      </span>
                    </div>
                  </div>
                )}

                {/* Choice if dual options exist */}
                {exportResult && !exportResult.isTargetMetDirectly && exportResult.secondary && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectVariant('under200kb')}
                      className={`p-2 rounded-xl border text-right cursor-pointer ${
                        activeVariant === 'under200kb'
                          ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-500 ring-1 ring-sky-500/40'
                          : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">زیر ۲۰۰KB</div>
                      <div className="font-bold tabular-nums">{exportResult.primary.sizeKb} KB</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectVariant('highQuality')}
                      className={`p-2 rounded-xl border text-right cursor-pointer ${
                        activeVariant === 'highQuality'
                          ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-500 ring-1 ring-sky-500/40'
                          : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400">کیفیت بالا</div>
                      <div className="font-bold tabular-nums">{exportResult.secondary.sizeKb} KB</div>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!selectedVariant}
                  onClick={handleDownload}
                  className="w-full py-3 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-95 text-neutral-950 font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-neutral-950" />
                  <span>دانلود فایل WebP</span>
                </button>
              </div>
            )}

            {/* ----------------- PHOTOS TAB ----------------- */}
            {activeTab === 'photos' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-700 dark:text-neutral-300">تصاویر آپلود شده</span>
                  <button
                    onClick={onAddMore}
                    className="px-2.5 py-1 rounded-lg bg-sky-400 text-neutral-950 font-bold flex items-center gap-1 text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {photos.map((item) => {
                    const isActive = item.id === photo.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectPhoto(item.id)}
                        className={`relative w-16 h-20 shrink-0 rounded-xl overflow-hidden border-2 cursor-pointer ${
                          isActive ? 'border-sky-500 ring-2 ring-sky-500/30' : 'border-neutral-300 dark:border-neutral-700'
                        }`}
                      >
                        {item.objectUrl && (
                          <img
                            src={item.objectUrl}
                            alt={item.originalName}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemovePhoto(item.id);
                          }}
                          className="absolute top-1 left-1 p-0.5 rounded-full bg-black/70 text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Primary Fixed Bottom Navigation Bar */}
      <nav className="bg-white/95 dark:bg-[#12141c]/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 px-3 py-2 flex items-center justify-around gap-1 text-[11px] font-bold">
        <button
          onClick={() => toggleTab('crop')}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'crop'
              ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10'
              : 'text-neutral-600 dark:text-neutral-400'
          }`}
        >
          <CropIcon className="w-4 h-4" />
          <span>کادر و کراپ</span>
        </button>

        <button
          onClick={() => toggleTab('color')}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'color'
              ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10'
              : 'text-neutral-600 dark:text-neutral-400'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>تنظیم نور و رنگ</span>
        </button>

        <button
          onClick={() => toggleTab('export')}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'export'
              ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10'
              : 'text-neutral-600 dark:text-neutral-400'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>دانلود WebP</span>
        </button>

        {photos.length > 1 && (
          <button
            onClick={() => toggleTab('photos')}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center gap-1 transition-colors relative ${
              activeTab === 'photos'
                ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Images className="w-4 h-4" />
            <span>عکس‌ها</span>
            <span className="absolute top-1 right-2 bg-sky-500 text-neutral-950 font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
              {photos.length}
            </span>
          </button>
        )}
      </nav>
    </div>
  );
};
