/**
 * Upload Dropzone component
 * Supports Drag & Drop, Multi-file, HEIC/JPG/JPEG.
 * Full Day & Night mode compatibility.
 */
import React, { useRef, useState } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  isLoadingSample?: boolean;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFilesSelected,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = ''; // Reset for re-selection
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
      {/* Drop Zone Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full relative border-2 border-dashed rounded-3xl p-8 md:p-14 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
          isDragOver
            ? 'border-sky-500 bg-sky-500/10 scale-[1.01]'
            : 'border-neutral-300 dark:border-neutral-700 hover:border-sky-500 dark:hover:border-neutral-500 bg-white/70 dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-900/90 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.jpe,.jfif,.png,.webp,.heic,.heif,.hif,.avif,.bmp,.gif,image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 dark:bg-neutral-800/80 border border-sky-500/20 dark:border-neutral-700 flex items-center justify-center mb-5 text-sky-600 dark:text-sky-400 shadow-inner">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h2 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-white mb-2">
          عکس‌های مدل و پوشاک را اینجا بکشید و رها کنید
        </h2>
        <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mb-5 max-w-md">
          انتخاب همزمان چندین عکس با فرمت‌های مشابه یا متفاوت • خروجی نهایی کلیه عکس‌ها WebP کادر ۳:۴
        </p>

        {/* Accepted Formats */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="px-2.5 py-1 rounded-md bg-sky-50 dark:bg-neutral-800 border border-sky-200 dark:border-neutral-700 text-sky-700 dark:text-sky-300 font-semibold">
            HEIC / HEIF (آیفون)
          </span>
          <span className="px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-300 font-semibold">
            JPG / JPEG
          </span>
          <span className="px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-300 font-semibold">
            PNG
          </span>
          <span className="px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-300 font-semibold">
            WebP / AVIF
          </span>
        </div>
      </div>
    </div>
  );
};
