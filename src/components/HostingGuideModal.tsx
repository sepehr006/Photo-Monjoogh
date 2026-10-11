/**
 * Hosting and Deployment Guide Modal (in Persian)
 * Explains how to run locally, create the static build, and upload to standard web hosts.
 * Fully supports Day (Light) and Night (Dark) mode.
 */
import React from 'react';
import { X, Server, Terminal, Globe, ShieldCheck, Check } from 'lucide-react';

interface HostingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HostingGuideModal: React.FC<HostingGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#141722] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#10121b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                راهنمای راه‌اندازی و انتشار روی هاست وب
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                ساخت بسته استاتیک و استقرار بدون نیاز به سرور Node.js فعال
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          {/* Privacy & Zero-Backend Note */}
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-xs mb-1">
                معماری کاملاً مستقل و بی‌نیاز از سرور پشتیبان
              </h4>
              <p className="text-xs text-emerald-900 dark:text-emerald-200/90 leading-relaxed">
                این پروژه به‌صورت ۱۰۰٪ فرانت‌اند و کلاینت‌ساید طراحی شده است. تمام تبدیل‌های تصویری (HEIC به JPEG، تشخیص سوژه، کادر ۳:۴، تنظیم نور و رنگ و فشرده‌سازی WebP) مستقیماً روی مرورگر کاربران و سخت‌افزار لپ‌تاپ انجام می‌شود و هیچ فایلی به سرور خارجی ارسال نمی‌گردد.
              </p>
            </div>
          </div>

          {/* Step 1: Local Development */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white text-xs">
              <Terminal className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>مرحله ۱: اجرای محلی روی سیستم (توسعه و بررسی)</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              برای اجرای پروژه روی سیستم شخصی یا لپ‌تاپ تیم، دستورات زیر را در خط فرمان (ترمینال) وارد نمایید:
            </p>
            <div className="bg-neutral-100 dark:bg-neutral-950 p-3 rounded-lg border border-neutral-300 dark:border-neutral-800 text-xs text-amber-800 dark:text-amber-300 dir-ltr text-left space-y-1 font-bold">
              <div>npm install</div>
              <div>npm run dev</div>
            </div>
          </div>

          {/* Step 2: Build Production */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white text-xs">
              <Server className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>مرحله ۲: ساخت خروجی نهایی استاتیک (Build)</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              برای آماده‌سازی فایل‌های نهایی قابل آپلود به وب، دستور زیر را اجرا کنید:
            </p>
            <div className="bg-neutral-100 dark:bg-neutral-950 p-3 rounded-lg border border-neutral-300 dark:border-neutral-800 text-xs text-amber-800 dark:text-amber-300 dir-ltr text-left font-bold">
              npm run build
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              پس از اجرای این دستور، پوشه‌ای با نام <code className="text-amber-700 dark:text-amber-300 font-bold">dist</code> در ریشه پروژه ایجاد می‌شود که حاوی تمام فایل‌های HTML، CSS و جاوااسکریپت نهایی است.
            </p>
          </div>

          {/* Step 3: Deploy to Standard Web Host */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white text-xs">
              <Globe className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>مرحله ۳: آپلود روی انواع هاستینگ‌های وب</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* cPanel / DirectAdmin */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800">
                <div className="font-bold text-neutral-900 dark:text-white text-xs mb-1.5 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  هاست اشتراکی (cPanel / DirectAdmin)
                </div>
                <p className="text-[12px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  کافیست وارد File Manager هاست خود شده و تمام فایل‌ها و محتویات داخل پوشه <code className="text-amber-700 dark:text-amber-300 font-bold">dist</code> را مستقیماً در پوشه <code className="text-amber-700 dark:text-amber-300 font-bold">public_html</code> دامنه خود آپلود فرمایید.
                </p>
              </div>

              {/* Nginx / Apache */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800">
                <div className="font-bold text-neutral-900 dark:text-white text-xs mb-1.5 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  سرور اختصاصی یا مجازی (Nginx)
                </div>
                <p className="text-[12px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  محتوای <code className="text-amber-700 dark:text-amber-300 font-bold">dist</code> را در مسیر <code className="text-neutral-800 dark:text-neutral-300 font-bold">/var/www/fashion-studio</code> قرار داده و در تنظیمات سرور از دستور <code className="text-neutral-800 dark:text-neutral-300 font-bold">try_files $uri $uri/ /index.html;</code> استفاده نمایید.
                </p>
              </div>

              {/* Static Cloud (Liara / Vercel / Netlify) */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 md:col-span-2">
                <div className="font-bold text-neutral-900 dark:text-white text-xs mb-1.5 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  هاست‌های ابری و استاتیک (لیارا، Vercel، Netlify، GitHub Pages)
                </div>
                <p className="text-[12px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  در پلتفرم‌های ابری مثل لیارا، نوع پلتفرم را روی <strong>برنامه استاتیک (Static)</strong> تنظیم کرده و مسیر بیلد را پوشه <code className="text-amber-700 dark:text-amber-300 font-bold">dist</code> مشخص نمایید. هیچ فرآیند Node.js دائمی در حال اجرا نیاز نیست.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#10121b] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-colors cursor-pointer"
          >
            متوجه شدم، بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
