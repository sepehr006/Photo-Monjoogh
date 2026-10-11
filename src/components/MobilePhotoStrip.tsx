/**
 * Mobile Photo Strip
 * Compact horizontal scrolling strip of photo thumbnails at the top for mobile devices.
 */
import React from 'react';
import { PhotoItem } from '../types/image';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';

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
  onRemovePhoto,
  onAddMore,
}) => {
  if (photos.length <= 1) return null;

  return (
    <div className="lg:hidden shrink-0 bg-white/90 dark:bg-[#12141c]/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-3 py-2 flex items-center gap-2 overflow-x-auto z-20">
      {photos.map((item) => {
        const isActive = item.id === activeId;
        return (
          <div
            key={item.id}
            onClick={() => onSelectPhoto(item.id)}
            className={`relative w-11 h-14 shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
              isActive
                ? 'border-sky-500 ring-2 ring-sky-500/30 scale-105 shadow-sm'
                : 'border-neutral-200 dark:border-neutral-800 opacity-75 hover:opacity-100'
            }`}
          >
            {item.objectUrl && (
              <img
                src={item.objectUrl}
                alt={item.originalName}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-0 right-0 left-0 bg-black/60 text-[8px] font-bold text-white text-center py-0.2 truncate px-0.5">
              3:4
            </div>
            {isActive && (
              <div className="absolute top-0.5 right-0.5 bg-sky-500 text-neutral-950 rounded-full p-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={onAddMore}
        className="w-11 h-14 shrink-0 rounded-lg border-2 border-dashed border-sky-400/60 dark:border-sky-500/40 bg-sky-50/50 dark:bg-sky-500/10 flex flex-col items-center justify-center text-sky-600 dark:text-sky-400 font-bold active:scale-95 transition-all cursor-pointer"
        title="افزودن عکس جدید"
      >
        <Plus className="w-4 h-4" />
        <span className="text-[9px] mt-0.5">+عکس</span>
      </button>
    </div>
  );
};
