import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Ticket,
} from 'lucide-react';
import { PnrData } from '../../types/pnr';
import {
  createPnrSession,
  getPnrCaptcha,
  refreshPnrCaptcha,
  getPnrStatus,
  getFastPnrCaptcha,
  InvalidPnrCaptchaError,
  PnrSessionExpiredError,
  PnrApiError,
} from '../../services/pnrApi';

interface PnrCaptchaModalProps {
  open: boolean;
  pnr: string;
  onClose: () => void;
  onSuccess: (data: PnrData) => void;
}

export const PnrCaptchaModal: React.FC<PnrCaptchaModalProps> = ({
  open,
  pnr,
  onClose,
  onSuccess,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [captchaImageUrl, setCaptchaImageUrl] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState<string>('');
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifySeconds, setVerifySeconds] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Track elapsed seconds while verifying
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isVerifying) {
      setVerifySeconds(0);
      interval = setInterval(() => {
        setVerifySeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setVerifySeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isVerifying]);

  // Initialize fresh session and load CAPTCHA instantly using fast preloader
  const initCaptcha = useCallback(async (forceFresh = false) => {
    setIsLoadingCaptcha(true);
    setErrorMessage(null);
    setCaptchaInput('');
    setCaptchaImageUrl(null);

    try {
      const { sessionId: fastSessionId, captchaImageUrl: fastImg } = await getFastPnrCaptcha(forceFresh);
      setSessionId(fastSessionId);
      setCaptchaImageUrl(fastImg);
    } catch (err: unknown) {
      console.warn('[PnrCaptchaModal] Init notice:', err);
      let msg = 'Unable to connect to Railway server. Please click "Try reloading CAPTCHA" below.';
      if (err instanceof Error && err.message) {
        if (err.name === 'AbortError' || err.message.toLowerCase().includes('abort')) {
          msg = 'Connection to Indian Railways server timed out. Please click below to reload.';
        } else if (err.message.includes('404') || err.message.toLowerCase().includes('not found')) {
          msg = 'Railway gateway session expired. Please click below to reload a fresh CAPTCHA.';
        } else {
          msg = err.message;
        }
      }
      setErrorMessage(msg);
    } finally {
      setIsLoadingCaptcha(false);
    }
  }, []);

  // When modal open changes
  useEffect(() => {
    if (open) {
      initCaptcha();
    } else {
      setCaptchaInput('');
      setErrorMessage(null);
      setIsVerifying(false);
      setSessionId(null);
      setCaptchaImageUrl(null);
    }
  }, [open, initCaptcha]);

  // Focus input when CAPTCHA is ready
  useEffect(() => {
    if (open && captchaImageUrl && !isLoadingCaptcha && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, captchaImageUrl, isLoadingCaptcha]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !isVerifying) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isVerifying, onClose]);

  // Manual refresh
  const handleManualRefresh = async () => {
    if (isRefreshing || isLoadingCaptcha || isVerifying) return;

    setIsRefreshing(true);
    setErrorMessage(null);
    setCaptchaInput('');

    try {
      if (sessionId) {
        const newImg = await refreshPnrCaptcha(sessionId);
        setCaptchaImageUrl(newImg);
      } else {
        await initCaptcha();
      }
    } catch (err: unknown) {
      if (err instanceof PnrSessionExpiredError) {
        setErrorMessage('Session expired. Loading fresh security CAPTCHA...');
        await initCaptcha();
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to refresh CAPTCHA.';
        setErrorMessage(msg);
      }
    } finally {
      setIsRefreshing(false);
      inputRef.current?.focus();
    }
  };

  // Submit verification and fetch PNR status
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaInput.trim() || !sessionId || isVerifying || isLoadingCaptcha) return;

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const data = await getPnrStatus(pnr, captchaInput.trim(), sessionId);
      setIsVerifying(false);
      onClose();
      onSuccess(data);
    } catch (err: unknown) {
      setIsVerifying(false);

      if (err instanceof InvalidPnrCaptchaError) {
        setCaptchaInput('');
        setErrorMessage('Incorrect CAPTCHA. A fresh code has been loaded. Please try again.');
        setIsLoadingCaptcha(true);
        try {
          const refreshRes = await refreshPnrCaptcha(sessionId);
          setCaptchaImageUrl(refreshRes);
        } catch {
          await initCaptcha();
        } finally {
          setIsLoadingCaptcha(false);
          inputRef.current?.focus();
        }
      } else if (err instanceof PnrSessionExpiredError) {
        setCaptchaInput('');
        setErrorMessage('Session expired. Loading new CAPTCHA...');
        await initCaptcha();
      } else {
        const msg = err instanceof Error && err.message ? err.message : 'Unable to fetch PNR status. Please try again.';
        setErrorMessage(msg);
      }
    }
  };

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pnr-captcha-modal-title"
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen min-w-full h-screen min-h-[100dvh] min-h-screen z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      style={{ minHeight: '100vh', height: '100%' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isVerifying) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 my-auto shrink-0"
        id="pnr-captcha-modal"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="pnr-captcha-modal-title" className="text-base font-bold text-slate-800">
                Security Verification
              </h2>
              
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs font-medium animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <p>{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => initCaptcha(true)}
                  className="mt-1.5 inline-flex items-center gap-1 font-bold text-rose-800 underline hover:text-rose-950 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Try reloading CAPTCHA</span>
                </button>
              </div>
            </div>
          )}

          {/* CAPTCHA Display Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="pnr-modal-captcha-input"
                className="text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                Enter Security CAPTCHA
              </label>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing || isLoadingCaptcha || isVerifying}
                className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh CAPTCHA</span>
              </button>
            </div>

            {/* Captcha Image Container */}
            <div className="w-full h-20 bg-slate-100 border-2 border-slate-200 rounded-2xl flex items-center justify-center relative overflow-hidden">
              {isLoadingCaptcha ? (
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                  <span>Loading CAPTCHA...</span>
                </div>
              ) : captchaImageUrl ? (
                <img
                  src={captchaImageUrl}
                  alt="Security verification CAPTCHA"
                  className="max-h-16 max-w-full object-contain select-none"
                  draggable={false}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => initCaptcha(true)}
                  className="text-xs text-orange-600 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Load CAPTCHA</span>
                </button>
              )}
            </div>
          </div>

          {/* User Input Field */}
          <div>
            <input
              ref={inputRef}
              id="pnr-modal-captcha-input"
              type="text"
              required
              autoComplete="off"
              spellCheck="false"
              disabled={isLoadingCaptcha || isVerifying}
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              placeholder="Enter exact characters shown above..."
              className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-orange-500 focus:bg-white focus:outline-none text-base font-bold text-center tracking-widest text-slate-800 transition-all placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal placeholder:text-xs disabled:opacity-50"
            />
          </div>

          {/* Live Progress Stage during IRCTC Query */}
          {isVerifying && (
            <div className="p-3.5 bg-orange-50/80 border border-orange-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-orange-800 font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
                  <span>
                    {verifySeconds < 4
                      ? 'Connecting to Indian Railways IRCTC gateway...'
                      : verifySeconds < 12
                      ? 'Verifying security CAPTCHA with IRCTC...'
                      : 'Querying CRIS live database for chart & berth status...'}
                  </span>
                </div>
                <span className="font-mono font-bold text-orange-600 text-[11px] bg-orange-100 px-2 py-0.5 rounded-md">
                  {verifySeconds}s
                </span>
              </div>
              <div className="w-full h-1.5 bg-orange-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.min(95, 20 + verifySeconds * 4)}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-500">
                CRIS & IRCTC live queries can take 15–30 seconds during peak hours. Please keep this open.
              </p>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={!captchaInput.trim() || isLoadingCaptcha || isVerifying || !captchaImageUrl}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                  <span>Fetching Live IRCTC Status ({verifySeconds}s)...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-orange-400" />
                  <span>Verify & Check Status</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
