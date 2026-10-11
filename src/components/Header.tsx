/**
 * Top Navigation Bar adhering to Frontend Design Constitution
 * Strict 1-row, 3-zone contract with Day/Night toggle
 */
import React from 'react';
import { Sparkles, HelpCircle, ShieldCheck, Upload, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onOpenRatioInfo: () => void;
  onTriggerUpload: () => void;
  photosCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenRatioInfo,
  onTriggerUpload,
  photosCount,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 px-4 md:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-[#12141c]/90 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-30 transition-colors duration-200">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <span className="text-lg md:text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xs font-bold">
            3:4
          </span>
          Edit by Sepehr
        </span>
      </div>

      {/* Zone 3: Day/Night Theme Toggle & Primary Action */}
      <div className="flex items-center gap-2.5">
        {/* Day/Night Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'تغییر به حالت روز' : 'تغییر به حالت شب'}
          title={theme === 'dark' ? 'تغییر به حالت روز' : 'تغییر به حالت شب'}
          className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline font-medium">حالت روز</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline font-medium">حالت شب</span>
            </>
          )}
        </button>

        <button
          onClick={onTriggerUpload}
          className="px-3.5 py-1.5 text-xs font-semibold text-neutral-900 bg-sky-400 hover:bg-sky-300 active:scale-95 rounded-xl transition-all flex items-center gap-2 shadow-sm whitespace-nowrap cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-neutral-900" />
          <span>افزودن عکس</span>
          {photosCount > 0 && (
            <span className="bg-neutral-900/15 px-1.5 py-0.2 rounded font-bold text-[11px]">
              {photosCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
