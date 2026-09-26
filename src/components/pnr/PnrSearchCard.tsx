import React, { useState, useEffect } from 'react';
import { Search, Ticket, ShieldCheck, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { preloadPnrCaptcha } from '../../services/pnrApi';

interface PnrSearchCardProps {
  onCheckStatus: (pnr: string) => void;
  isLoading?: boolean;
  initialPnr?: string;
  errorMessage?: string | null;
  hasResult?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const PnrSearchCard: React.FC<PnrSearchCardProps> = ({
  onCheckStatus,
  isLoading = false,
  initialPnr = '',
  errorMessage,
  hasResult = false,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [pnr, setPnr] = useState<string>(initialPnr);
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPnr) {
      setPnr(initialPnr);
    }
  }, [initialPnr]);

  // Preload on mount if initial PNR is provided
  useEffect(() => {
    preloadPnrCaptcha();
  }, []);

  const handlePnrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric digits, max 10
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPnr(val);
    if (inputError && val.length === 10) {
      setInputError(null);
    }
    // Preload session & captcha as soon as user has entered most of the PNR
    if (val.length >= 7) {
      preloadPnrCaptcha();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!pnr || pnr.length !== 10) {
      setInputError('Please enter a valid 10-digit PNR number.');
      return;
    }

    setInputError(null);
    onCheckStatus(pnr.trim());
  };

  const isFormValid = pnr.length === 10;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 transition-all space-y-3">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* PNR Input Block */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="pnr-number-input"
              className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
            >
              <Ticket className="w-3.5 h-3.5 text-orange-600" />
              <span>Enter 10-Digit PNR Number</span>
              <span className="text-rose-500">*</span>
            </label>
            <span
              className={`text-xs font-mono font-medium px-2 py-0.5 rounded-md ${
                pnr.length === 10
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {pnr.length}/10
            </span>
          </div>

          <div className="relative">
            <input
              id="pnr-number-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pnr}
              onChange={handlePnrChange}
              disabled={isLoading}
              placeholder="e.g. 4863956627"
              maxLength={10}
              className={`w-full h-12 px-4 text-lg font-mono font-bold tracking-widest text-slate-800 bg-white border rounded-xl placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 transition-all shadow-2xs ${
                inputError || (pnr.length > 0 && pnr.length < 10)
                  ? 'border-amber-300 focus:ring-amber-500 focus:border-amber-500'
                  : 'border-slate-300 focus:ring-orange-500 focus:border-orange-500'
              }`}
            />
            {pnr.length === 10 && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Ready</span>
              </div>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            You can find the 10-digit PNR number on the top-left corner of your printed ticket or in your booking SMS.
          </p>
        </div>

        {/* Error Display */}
        {(inputError || errorMessage) && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{inputError || errorMessage}</span>
          </div>
        )}

        {/* Submit Action & Collapse Toggle */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={`w-full flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              !isFormValid || isLoading
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25 active:scale-[0.99]'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Check PNR Status</span>
          </button>

          {hasResult && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              id="pnr-toggle-collapse-btn"
              title={isCollapsed ? 'Show Status' : 'Collapse View'}
              aria-label={isCollapsed ? 'Show Status' : 'Collapse View'}
              className="w-full sm:w-auto h-12 px-4 rounded-xl border border-slate-200 hover:border-orange-300 bg-slate-50 hover:bg-orange-50/50 text-slate-700 hover:text-orange-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-4 h-4 text-orange-600" />
                  <span>Show Status</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                  <span>Collapse View</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
