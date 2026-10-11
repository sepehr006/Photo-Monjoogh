/**
 * Photo Queue Component
 * Manages the list of uploaded photos, status indicators, and independent review.
 * Fully supports Day (Light) and Night (Dark) mode with Vazirmatn typography.
 */
import React from 'react';
import { PhotoItem } from '../types/image';
import { formatFileSize, formatDimensions } from '../modules/fileValidation';
import { Check, Loader2, AlertTriangle, Trash2, Download, Image as ImageIcon } from 'lucide-react';
import { triggerDownloadBlob, generateWebpFilename } from '../modules/downloading';

interface PhotoQueueProps {
  photos: PhotoItem[];
  activeId: string | null;
  onSelectPhoto: (id: string) => void;
  onRemovePhoto: (id: string) => void;
  onAddMore: () => void;
}

export const PhotoQueue: React.FC<PhotoQueueProps> = ({
  photos,
  activeId,
  onSelectPhoto,
  onRemovePhoto,
  onAddMore,
}) => {
  if (photos.length === 0) return null;

  return (
    <aside className="w-full lg:w-72 shrink-0 bg-white dark:bg-[#12141c] border-b lg:border-b-0 lg:border-l border-neutral-200 dark:border-neutral-800 flex flex-col h-auto lg:h-full min-h-0 transition-colors">
      {/* Queue Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">صف تصاویر</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {photos.length} تصویر بارگذاری شده
          </p>
        </div>
        <button
          onClick={onAddMore}
          className="text-xs text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-bold px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 transition-colors cursor-pointer"
        >
          + افزودن عکس
        </button>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {photos.map((item) => {
          const isActive = item.id === activeId;
          const isReady = item.status === 'ready';
          const isError = item.status === 'error';
          const isProcessing =
            item.status === 'decoding' ||
            item.status === 'analyzing' ||
            item.status === 'rendering';

          return (
            <div
              key={item.id}
              onClick={() => onSelectPhoto(item.id)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer relative group flex items-center gap-3 ${
                isActive
                  ? 'bg-sky-50/70 dark:bg-neutral-800/90 border-sky-500 shadow-xs ring-1 ring-sky-500/30'
                  : 'bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'
              }`}
            >
              {/* Thumbnail */}
              <div className="w-14 h-18 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700/60 relative shrink-0 flex items-center justify-center shadow-xs">
                {item.objectUrl ? (
                  <img
                    src={item.objectUrl}
                    alt={item.originalName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-600" />
                )}

                {/* 3:4 badge indicator */}
                <div className="absolute bottom-0.5 right-0.5 bg-black/75 text-[9px] px-1 rounded text-white font-bold">
                  3:4
                </div>

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-sky-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-200 truncate dir-ltr text-left block w-full">
                    {item.originalName}
                  </span>
                </div>

                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 space-y-0.5">
                  <div className="tabular-nums font-medium">
                    {formatDimensions(item.originalWidth, item.originalHeight)}
                  </div>
                  <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                    <span className="tabular-nums font-medium">{formatFileSize(item.fileSizeBytes)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="uppercase text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                      {item.originalExtension}
                    </span>
                  </div>
                </div>

                {/* Status indicator tag */}
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                  {isReady && (
                    <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-bold">
                      <Check className="w-3 h-3" />
                      آماده دانلود WebP
                    </span>
                  )}
                  {isProcessing && (
                    <span className="text-sky-700 dark:text-sky-400 flex items-center gap-1 font-bold">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      در حال پردازش...
                    </span>
                  )}
                  {isError && (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-bold" title={item.errorMessage}>
                      <AlertTriangle className="w-3 h-3" />
                      خطا در پردازش
                    </span>
                  )}
                </div>
              </div>

              {/* Actions on hover or active */}
              <div className="flex flex-col items-center gap-1 self-center shrink-0">
                {isReady && item.exportResult && (
                  <button
                    type="button"
                    title="دانلود سریع خروجی WebP"
                    onClick={(e) => {
                      e.stopPropagation();
                      const variant =
                        item.activeVariant === 'highQuality' && item.exportResult?.secondary
                          ? item.exportResult.secondary
                          : item.exportResult?.primary;
                      if (variant) {
                        const filename = generateWebpFilename(item.originalName);
                        triggerDownloadBlob(variant.blob, filename);
                      }
                    }}
                    className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  title="حذف از لیست"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePhoto(item.id);
                  }}
                  className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
