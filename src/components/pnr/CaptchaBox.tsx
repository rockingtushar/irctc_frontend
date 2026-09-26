import React from 'react';
import { RotateCw, Loader2, AlertCircle } from 'lucide-react';

interface CaptchaBoxProps {
  captchaImageUrl: string | null;
  captchaValue: string;
  onChange: (value: string) => void;
  onRefresh: () => void;
  isLoadingCaptcha: boolean;
  isRefreshingCaptcha: boolean;
  captchaError?: string | null;
  disabled?: boolean;
}

export const CaptchaBox: React.FC<CaptchaBoxProps> = ({
  captchaImageUrl,
  captchaValue,
  onChange,
  onRefresh,
  isLoadingCaptcha,
  isRefreshingCaptcha,
  captchaError,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="pnr-captcha-input"
          className="text-xs font-semibold uppercase tracking-wider text-slate-600 block"
        >
          Security CAPTCHA <span className="text-rose-500">*</span>
        </label>
        <span className="text-[11px] text-slate-400">Letters and numbers are case-sensitive</span>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Captcha Image Container */}
        <div className="relative flex-1 sm:max-w-[210px] h-12 bg-slate-100 border border-slate-300/80 rounded-xl overflow-hidden flex items-center justify-center select-none shadow-2xs">
          {isLoadingCaptcha ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
              <span>Loading CAPTCHA...</span>
            </div>
          ) : captchaImageUrl ? (
            <div className="w-full h-full flex items-center justify-center p-1 bg-white">
              <img
                src={captchaImageUrl}
                alt="Security CAPTCHA code"
                className="max-h-full max-w-full object-contain pointer-events-none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>No CAPTCHA loaded</span>
            </div>
          )}

          {/* Refresh Button inside / beside image */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoadingCaptcha || isRefreshingCaptcha || disabled}
            aria-label="Refresh CAPTCHA"
            title="Refresh CAPTCHA image"
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 hover:bg-white text-slate-700 hover:text-orange-600 rounded-lg shadow-xs border border-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/40 disabled:opacity-50 cursor-pointer"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${
                isRefreshingCaptcha ? 'animate-spin text-orange-600' : ''
              }`}
            />
          </button>
        </div>

        {/* Captcha Text Input */}
        <div className="flex-1 relative">
          <input
            id="pnr-captcha-input"
            type="text"
            value={captchaValue}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || isLoadingCaptcha}
            placeholder="Enter characters shown"
            maxLength={10}
            autoComplete="off"
            spellCheck="false"
            className="w-full h-12 px-3.5 text-base font-semibold tracking-wider text-slate-800 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all shadow-2xs"
          />
        </div>
      </div>

      {captchaError && (
        <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{captchaError}</span>
        </p>
      )}
    </div>
  );
};
