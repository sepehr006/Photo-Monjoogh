/**
 * Mobile Photo Strip
 * Compact horizontal scrolling strip of photo thumbnails at the top for mobile devices.
 * Shows status indicator (spinner, error, ready) for each photo in the batch.
 */
import React from 'react';
import { PhotoItem } from '../types/image';
import { Plus, Loader2, AlertTriangle, Check } from 'lucide-react';

interface MobilePhotoStripProps {
  photos: PhotoItem[];
  activeId: string | null;
  onSelectPhoto: (id: string) => void;
  onRemovePhoto: (id: string) => void;
  onAddMore: () => void;
}

export const MobilePhotoStrip: React.FC<MobilePhotoStripProps> = ({
  photos,
  activeId,
  onSelectPhoto,
  onAddMore,
}) => {
  if (photos.length <= 1) return null;

  return (
    <div className="lg:hidden shrink-0 bg-white/95 dark:bg-[#12141c]/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-3 py-2 flex items-center gap-2 overflow-x-auto z-20">
      {photos.map((item) => {
        const isActive = item.id === activeId;
        const isProcessing =
          item.status === 'decoding' ||
          item.status === 'analyzing' ||
          item.status === 'rendering';
        const isError = item.status === 'error';
        const isReady = item.status === 'ready';

        return (
          <div
            key={item.id}
            onClick={() => onSelectPhoto(item.id)}
            className={`relative w-12 h-16 shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
              isActive
                ? 'border-sky-500 ring-2 ring-sky-500/30 scale-105 shadow-sm'
                : 'border-neutral-200 dark:border-neutral-800 opacity-80 hover:opacity-100'
            }`}
          >
            {item.objectUrl ? (
              <img
                src={item.objectUrl}
                alt={item.originalName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-sky-500" />}
                {isError && <AlertTriangle className="w-4 h-4 text-rose-500" />}
              </div>
            )}

            {/* 3:4 badge */}
            <div className="absolute bottom-0 right-0 left-0 bg-black/60 text-[8px] font-bold text-white text-center py-0.2 truncate px-0.5">
              3:4
            </div>

            {/* Processing overlay */}
            {isProcessing && item.objectUrl && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              </div>
            )}

            {/* Ready badge */}
            {isReady && !isActive && (
              <div className="absolute top-0.5 right-0.5 bg-emerald-500 text-white rounded-full p-0.5">
                <Check className="w-2 h-2" />
              </div>
            )}

            {/* Active badge */}
            {isActive && (
              <div className="absolute top-0.5 right-0.5 bg-sky-500 text-neutral-950 rounded-full p-0.5 shadow-xs">
                <Check className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={onAddMore}
        className="w-12 h-16 shrink-0 rounded-lg border-2 border-dashed border-sky-400/60 dark:border-sky-500/40 bg-sky-50/50 dark:bg-sky-500/10 flex flex-col items-center justify-center text-sky-600 dark:text-sky-400 font-bold active:scale-95 transition-all cursor-pointer"
        title="افزودن عکس جدید"
      >
        <Plus className="w-4 h-4" />
        <span className="text-[9px] mt-0.5">+عکس</span>
      </button>
    </div>
  );
};
