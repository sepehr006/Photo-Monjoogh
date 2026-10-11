/**
 * 3:4 Aspect Ratio Info Modal (in Persian)
 * Fully supports Day (Light) and Night (Dark) mode.
 */
import React from 'react';
import { X, Crop, Check } from 'lucide-react';

interface RatioInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RatioInfoModal: React.FC<RatioInfoModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-[#141722] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#10121b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs">
              3:4
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                استاندارد نسبت ابعاد ۳:۴ در عکس‌های مد و پوشاک
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                چرا نسبت ۳ واحد عرض به ۴ واحد ارتفاع در کاتالوگ‌های پوشاک الزامی است؟
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <Crop className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-neutral-900 dark:text-white text-xs mb-1">
                تناسب طلایی با آناتومی بدن و لباس
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                نسبت ۳:۴ پرتره، سازگارترین کادر با قد و قامت انسان است. بر خلاف کادرهای مربع (۱:۱) یا عریض (۱۶:۹)، کادر ۳:۴ امکان نمایش سر تا پا یا نیم‌تنه مانکن و جزئیات دوخت لباس را بدون اتلاف فضای خالی در طرفین فراهم می‌کند.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-neutral-700 dark:text-neutral-300">
            <h4 className="font-bold text-neutral-900 dark:text-white text-xs">قوانین فنی پیاده‌سازی شده در این نرم‌افزار:</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-neutral-900 dark:text-white">عدم کشش و دفرمگی:</strong> هیچ تصویری برای رسیدن به نسبت ۳:۴ کشیده یا فشرده نمی‌شود؛ بلکه کادر به شکل هندسی محاسبه و برش داده می‌شود.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-neutral-900 dark:text-white">حفظ رزولوشن اصلی:</strong> ابعاد مفید تصویر تا جای ممکن حفظ می‌گردد و عکس‌های کوچک به‌صورت مصنوعی بزرگ (Upscale) نمی‌شوند.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-neutral-900 dark:text-white">خروجی WebP زیر ۲۰۰ کیلوبایت:</strong> مدرن‌ترین فرمت وب با حداکثر فشرده‌سازی بدون افت کیفیت بصری روی نمایشگرها.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#10121b] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
