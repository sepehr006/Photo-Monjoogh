/**
 * Adjustments Panel
 * Controls for Background Removal, Color & Lighting, and WebP Export options.
 * Fully supports Day (Light) and Night (Dark) mode with Vazirmatn typography.
 */
import React, { useState } from 'react';
import {
  PhotoItem,
  ColorAdjustments,
  ExportVariant,
} from '../types/image';
import { DEFAULT_COLOR_ADJUSTMENTS } from '../modules/colorAdjustment';
import {
  Sun,
  Contrast,
  Palette,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  Sliders,
  Thermometer,
  Maximize,
} from 'lucide-react';
import { triggerDownloadBlob, generateWebpFilename } from '../modules/downloading';
import { formatFileSize } from '../modules/fileValidation';

interface AdjustmentsPanelProps {
  photo: PhotoItem;
  onUpdateColors: (colors: ColorAdjustments) => void;
  onSelectVariant: (variantKey: 'under200kb' | 'highQuality') => void;
  onToggleCompare: (isComparing: boolean) => void;
  isComparing: boolean;
  onFocusPreview?: () => void;
  onFocusCrop?: () => void;
}

export const AdjustmentsPanel: React.FC<AdjustmentsPanelProps> = ({
  photo,
  onUpdateColors,
  onSelectVariant,
  onToggleCompare,
  isComparing,
  onFocusPreview,
  onFocusCrop,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'color'>('export');

  const { colorAdjustments, exportResult, activeVariant } = photo;

  // Selected export variant
  const selectedVariant: ExportVariant | undefined =
    activeVariant === 'highQuality' && exportResult?.secondary
      ? exportResult.secondary
      : exportResult?.primary;

  const handleDownload = () => {
    if (!selectedVariant) return;
    const filename = generateWebpFilename(photo.originalName);
    triggerDownloadBlob(selectedVariant.blob, filename);
  };

  const resetColors = () => {
    onUpdateColors({ ...DEFAULT_COLOR_ADJUSTMENTS });
  };

  return (
    <div className="w-full lg:w-80 shrink-0 bg-white dark:bg-[#12141c] border-t lg:border-t-0 lg:border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-auto lg:h-full min-h-0 transition-colors">
      {/* Tab Navigation */}
      <div className="p-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-1 bg-neutral-100/70 dark:bg-[#0e1017]">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'export'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span>خروجی و دانلود</span>
        </button>

        <button
          onClick={() => setActiveTab('color')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'color'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span>رنگ و نور</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* ================= TAB 1: EXPORT & COMPRESSION ================= */}
        {activeTab === 'export' && (
          <div className="space-y-5">
            {/* WebP Status & Center Focus Banner */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-200 flex items-center gap-1.5">
                  <Maximize className="w-3.5 h-3.5 text-amber-500" />
                  پیش‌نمایش خروجی WebP
                </span>
              </div>

              {onFocusPreview && (
                <div className="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                  <button
                    type="button"
                    onClick={onFocusPreview}
                    className="w-full py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-98 text-neutral-950 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>مشاهده پیش‌نمایش در وسط صفحه</span>
                  </button>
                </div>
              )}

              {/* Size & Dimension Telemetry */}
              {selectedVariant && (
                <div className="p-3 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 space-y-1.5 text-xs shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">حجم نهایی فایل:</span>
                    <span
                      className={`font-bold tabular-nums ${
                        selectedVariant.isUnder200Kb
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {selectedVariant.sizeKb} کیلوبایت ({formatFileSize(selectedVariant.sizeBytes)})
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">ابعاد دقیق (۳:۴):</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 tabular-nums">
                      {selectedVariant.width} × {selectedVariant.height} px
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Target 200 KB Evaluation & Dual Choices if applicable */}
            {exportResult && !exportResult.isTargetMetDirectly && exportResult.secondary && (
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700/80 space-y-3 shadow-xs">
                <div className="grid grid-cols-2 gap-2">
                  {/* Option 1: Under 200 KB */}
                  <button
                    type="button"
                    onClick={() => onSelectVariant('under200kb')}
                    className={`p-2.5 rounded-lg border text-right transition-all cursor-pointer ${
                      activeVariant === 'under200kb'
                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 text-neutral-900 dark:text-white ring-1 ring-amber-500/40'
                        : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center justify-between">
                      <span>زیر ۲۰۰ کیلوبایت</span>
                      {activeVariant === 'under200kb' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white tabular-nums">
                      {exportResult.primary.sizeKb} KB
                    </div>
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold mt-0.5">
                      {exportResult.primary.width} × {exportResult.primary.height}
                    </div>
                  </button>

                  {/* Option 2: Higher Quality */}
                  <button
                    type="button"
                    onClick={() => onSelectVariant('highQuality')}
                    className={`p-2.5 rounded-lg border text-right transition-all cursor-pointer ${
                      activeVariant === 'highQuality'
                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-500 text-neutral-900 dark:text-white ring-1 ring-amber-500/40'
                        : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-amber-700 dark:text-neutral-200 mb-1 flex items-center justify-between">
                      <span>کیفیت بالا (ابعاد کامل)</span>
                      {activeVariant === 'highQuality' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div className="text-xs font-bold text-amber-800 dark:text-amber-300 tabular-nums">
                      {exportResult.secondary.sizeKb} KB
                    </div>
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold mt-0.5">
                      {exportResult.secondary.width} × {exportResult.secondary.height}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Primary Download Button */}
            <button
              type="button"
              disabled={!selectedVariant}
              onClick={handleDownload}
              className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-neutral-950 font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-neutral-950" />
              <span>دانلود فایل WebP (نسبت ۳:۴)</span>
            </button>
          </div>
        )}

        {/* ================= TAB 2: COLOR & LIGHTING ================= */}
        {activeTab === 'color' && (
          <div className="space-y-5">
            {/* Live Color Preview Thumbnail with instant Before/After feedback */}
            {selectedVariant && (
              <div className="relative aspect-[3/4] max-h-44 mx-auto rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center shadow-xs">
                <img
                  src={
                    isComparing && exportResult?.originalCropDataUrl
                      ? exportResult.originalCropDataUrl
                      : selectedVariant.dataUrl
                  }
                  alt="Color Preview"
                  className="w-full h-full object-contain transition-opacity"
                />
                <div className="absolute top-2 right-2 bg-neutral-900/80 backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded text-white flex items-center gap-1">
                  {isComparing ? (
                    <span className="text-amber-400 font-bold">نمایش عکس خام (قبل از ویرایش)</span>
                  ) : (
                    <span>پیش‌نمایش زنده رنگ</span>
                  )}
                </div>
              </div>
            )}

            {/* Color Style Toggle */}
            <div>
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-300 block mb-2">
                سبک رنگ‌بندی پوشاک
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => onUpdateColors({ ...colorAdjustments, style: 'natural' })}
                  className={`py-2 text-xs rounded-lg font-bold transition-colors cursor-pointer ${
                    colorAdjustments.style === 'natural'
                      ? 'bg-white dark:bg-neutral-800 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  طبیعی (رنگ دقیق پارچه)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateColors({ ...colorAdjustments, style: 'enhanced' })}
                  className={`py-2 text-xs rounded-lg font-bold transition-colors cursor-pointer ${
                    colorAdjustments.style === 'enhanced'
                      ? 'bg-white dark:bg-neutral-800 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  بهبودیافته (پویا و شاداب)
                </button>
              </div>
            </div>

            {/* Gentle Auto-Correction */}
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  اصلاح هوشمند ملایم نور
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateColors({
                    ...colorAdjustments,
                    autoCorrect: !colorAdjustments.autoCorrect,
                  })
                }
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  colorAdjustments.autoCorrect ? 'bg-amber-400' : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white dark:bg-neutral-950 absolute top-1 transition-transform ${
                    colorAdjustments.autoCorrect ? 'right-6' : 'right-1'
                  }`}
                />
              </button>
            </div>

            {/* Manual Sliders */}
            <div className="space-y-4">
              {/* Brightness */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 font-medium">
                    <Sun className="w-3.5 h-3.5 text-neutral-400" />
                    روشنایی (Brightness)
                  </span>
                  <span className="font-bold text-neutral-600 dark:text-neutral-400 tabular-nums">
                    {colorAdjustments.brightness > 0 ? `+${colorAdjustments.brightness}` : colorAdjustments.brightness}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={colorAdjustments.brightness}
                  onChange={(e) =>
                    onUpdateColors({
                      ...colorAdjustments,
                      brightness: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 font-medium">
                    <Contrast className="w-3.5 h-3.5 text-neutral-400" />
                    کنتراست (Contrast)
                  </span>
                  <span className="font-bold text-neutral-600 dark:text-neutral-400 tabular-nums">
                    {colorAdjustments.contrast > 0 ? `+${colorAdjustments.contrast}` : colorAdjustments.contrast}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={colorAdjustments.contrast}
                  onChange={(e) =>
                    onUpdateColors({
                      ...colorAdjustments,
                      contrast: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 font-medium">
                    <Palette className="w-3.5 h-3.5 text-neutral-400" />
                    اشباع رنگ (Color Intensity)
                  </span>
                  <span className="font-bold text-neutral-600 dark:text-neutral-400 tabular-nums">
                    {colorAdjustments.saturation > 0 ? `+${colorAdjustments.saturation}` : colorAdjustments.saturation}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={colorAdjustments.saturation}
                  onChange={(e) =>
                    onUpdateColors({
                      ...colorAdjustments,
                      saturation: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Warmth */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 font-medium">
                    <Thermometer className="w-3.5 h-3.5 text-neutral-400" />
                    دمای رنگ (Warmth / WB)
                  </span>
                  <span className="font-bold text-neutral-600 dark:text-neutral-400 tabular-nums">
                    {colorAdjustments.warmth > 0 ? `+${colorAdjustments.warmth}` : colorAdjustments.warmth}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={colorAdjustments.warmth}
                  onChange={(e) =>
                    onUpdateColors({
                      ...colorAdjustments,
                      warmth: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Reset & Before/After Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={resetColors}
                className="flex-1 py-2 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>بازنشانی رنگ‌ها</span>
              </button>

              <button
                type="button"
                onMouseDown={() => onToggleCompare(true)}
                onMouseUp={() => onToggleCompare(false)}
                onTouchStart={() => onToggleCompare(true)}
                onTouchEnd={() => onToggleCompare(false)}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  isComparing
                    ? 'bg-amber-400 text-neutral-950 border-amber-400'
                    : 'border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>نگه‌دارید برای مقایسه</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
