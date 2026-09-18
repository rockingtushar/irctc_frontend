import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  startCaptchaSession,
  refreshCaptcha,
  searchTrains,
  getSavedTrainSessionId,
  saveTrainSessionId,
  clearTrainSessionId,
  InvalidCaptchaError,
  SessionExpiredError,
  TrainApiError,
} from '../api/trains';
import { getApiBaseUrl, setApiBaseUrl } from '../api/stations';
import { Train } from '../types/station';
import { X, RefreshCw, ShieldCheck, AlertCircle, ArrowRight, Loader2, Settings, Globe, Check } from 'lucide-react';

interface CaptchaModalProps {
  from_code: string;
  from_name: string;
  to_code: string;
  to_name: string;
  journey_date: string;
  travel_class?: string;
  quota?: string;
  open: boolean;
  onClose: () => void;
  onSearchSuccess: (trains: Train[]) => void;
}

export const CaptchaModal: React.FC<CaptchaModalProps> = ({
  from_code,
  from_name,
  to_code,
  to_name,
  journey_date,
  travel_class,
  quota,
  open,
  onClose,
  onSearchSuccess,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [captchaBase64, setCaptchaBase64] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState<string>('');
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Quick backend URL configuration state
  const [showUrlConfig, setShowUrlConfig] = useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = useState<string>(() => getApiBaseUrl());
  const [isSavingUrl, setIsSavingUrl] = useState<boolean>(false);
  const [urlSavedSuccess, setUrlSavedSuccess] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initialize or start new CAPTCHA session
  const initCaptcha = useCallback(async (forceNew = false) => {
    setIsLoadingCaptcha(true);
    setErrorMessage(null);
    setCaptchaInput('');

    try {
      const existingSession = !forceNew ? getSavedTrainSessionId() : null;

      if (existingSession) {
        // Try refreshing captcha on existing session
        try {
          const res = await refreshCaptcha(existingSession);
          if (res && res.captcha_image_base64) {
            setSessionId(existingSession);
            setCaptchaBase64(res.captcha_image_base64);
            setIsLoadingCaptcha(false);
            return;
          }
        } catch (err) {
          console.warn('[CaptchaModal] Existing session refresh fallback:', err);
          clearTrainSessionId();
        }
      }

      // Start fresh session
      const startRes = await startCaptchaSession();
      setSessionId(startRes.session_id);
      setCaptchaBase64(startRes.captcha_image_base64);
    } catch (err: unknown) {
      console.warn('[CaptchaModal] Captcha init notice:', err);
      const msg = err instanceof Error ? err.message : 'Unable to connect to backend server';
      setErrorMessage(msg);
    } finally {
      setIsLoadingCaptcha(false);
    }
  }, []);

  // When modal is opened
  useEffect(() => {
    if (open) {
      setCurrentUrl(getApiBaseUrl());
      setShowUrlConfig(false);
      initCaptcha();
    } else {
      setCaptchaInput('');
      setErrorMessage(null);
      setIsSearching(false);
    }
  }, [open, initCaptcha]);

  // Focus input field when captcha loads
  useEffect(() => {
    if (open && captchaBase64 && !isLoadingCaptcha && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, captchaBase64, isLoadingCaptcha]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !isSearching) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isSearching, onClose]);

  // Handle manual captcha refresh button click
  const handleManualRefresh = async () => {
    if (isRefreshing || isLoadingCaptcha || isSearching) return;
    setIsRefreshing(true);
    setErrorMessage(null);
    setCaptchaInput('');

    try {
      if (sessionId) {
        const res = await refreshCaptcha(sessionId);
        setCaptchaBase64(res.captcha_image_base64);
      } else {
        await initCaptcha(true);
      }
    } catch (err: unknown) {
      if (err instanceof SessionExpiredError) {
        setErrorMessage('Session expired. Starting new captcha...');
        await initCaptcha(true);
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to refresh captcha.';
        setErrorMessage(msg);
      }
    } finally {
      setIsRefreshing(false);
      inputRef.current?.focus();
    }
  };

  // Handle saving new backend URL directly from modal
  const handleSaveBackendUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUrl.trim()) return;
    setIsSavingUrl(true);
    setUrlSavedSuccess(false);

    try {
      setApiBaseUrl(currentUrl.trim());
      setUrlSavedSuccess(true);
      setTimeout(() => setUrlSavedSuccess(false), 2000);
      await initCaptcha(true);
    } catch {
      setErrorMessage('Failed to update URL. Please check formatting.');
    } finally {
      setIsSavingUrl(false);
    }
  };

  // Handle form submission (Verify & Search)
  const handleVerifyAndSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaInput.trim() || !sessionId || isSearching || isLoadingCaptcha) return;

    setIsSearching(true);
    setErrorMessage(null);

    try {
      const resultTrains = await searchTrains({
        session_id: sessionId,
        captcha_answer: captchaInput.trim(),
        from_code,
        from_name,
        to_code,
        to_name,
        journey_date,
        travel_class,
        quota,
      });

      // Save successful session_id
      saveTrainSessionId(sessionId);

      // Close modal and emit results
      setIsSearching(false);
      onClose();
      onSearchSuccess(resultTrains);
    } catch (err: unknown) {
      setIsSearching(false);

      if (err instanceof InvalidCaptchaError) {
        // HTTP 400: Keep SAME session, immediately call /captcha/refresh
        setCaptchaInput('');
        setErrorMessage('Incorrect captcha. A new captcha has been loaded.');
        setIsLoadingCaptcha(true);
        try {
          const refreshRes = await refreshCaptcha(sessionId);
          setCaptchaBase64(refreshRes.captcha_image_base64);
        } catch (refreshErr) {
          console.warn('[CaptchaModal] Auto-refresh after 400 failed:', refreshErr);
          setErrorMessage('Incorrect captcha. Click refresh to try again.');
        } finally {
          setIsLoadingCaptcha(false);
          inputRef.current?.focus();
        }
      } else if (err instanceof SessionExpiredError) {
        // HTTP 401: Discard old session, call /captcha/start for a new session
        clearTrainSessionId();
        setSessionId(null);
        setCaptchaInput('');
        setErrorMessage('Session expired. Please enter the new captcha.');
        await initCaptcha(true);
      } else {
        // Other errors
        const msg = err instanceof Error && err.message ? err.message : 'Unable to fetch trains right now. Please try again.';
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
      aria-labelledby="captcha-modal-title"
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen min-w-full h-screen min-h-[100dvh] min-h-screen z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      style={{ minHeight: '100vh', height: '100%' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSearching) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 my-auto shrink-0"
        id="captcha-verification-modal"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="captcha-modal-title" className="text-base font-bold text-slate-800">
                Captcha Verification
              </h2>
              
            </div>
          </div>

          
        </div>

        

        

        {/* Body */}
        <form onSubmit={handleVerifyAndSearch} className="p-6 space-y-4">
          {/* Error / Alert Message with Retry Option */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col gap-2 text-rose-700 text-xs font-medium animate-in fade-in"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>

              
            </div>
          )}

          {/* CAPTCHA Display Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="captcha-code-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Enter Captcha
              </label>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing || isLoadingCaptcha || isSearching}
                className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh captcha</span>
              </button>
            </div>

            {/* Captcha Image Container */}
            <div className="w-full h-20 bg-slate-100 border-2 border-slate-200 rounded-2xl flex items-center justify-center relative overflow-hidden">
              {isLoadingCaptcha ? (
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                  <span>Loading captcha...</span>
                </div>
              ) : captchaBase64 ? (
                <img
                  src={`data:image/png;base64,${captchaBase64}`}
                  alt="Security verification captcha"
                  className="max-h-16 max-w-full object-contain select-none"
                  draggable={false}
                />
              ) : (
                <span className="text-xs text-slate-400">No captcha loaded</span>
              )}
            </div>
          </div>

          {/* User Input Field */}
          <div>
            <input
              ref={inputRef}
              id="captcha-code-input"
              type="text"
              required
              autoComplete="off"
              disabled={isLoadingCaptcha || isSearching}
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              placeholder="Enter exact captcha shown above (case-sensitive)..."
              className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-orange-500 focus:bg-white focus:outline-none text-base font-bold text-center tracking-widest text-slate-800 transition-all placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal placeholder:text-xs disabled:opacity-50"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!captchaInput.trim() || isLoadingCaptcha || isSearching || !captchaBase64}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                  <span>Verifying & Searching Trains...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-orange-400" />
                  <span>Verify & Search</span>
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
