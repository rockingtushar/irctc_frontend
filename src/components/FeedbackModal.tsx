import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Star,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Train,
  SendHorizontal,
  Sparkles,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { submitFeedback, FeedbackApiError } from '../api/feedback';
import { normalizeApiError } from '../config/apiConfig';
import { OrangeVandeBharatLogo } from './OrangeVandeBharatLogo';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  'General Feedback',
  'Report a Problem',
  'Feature Request',
  'Suggestion',
] as const;

const RATING_DESCRIPTIONS: Record<number, { en: string; hi: string; tag: string }> = {
  1: { en: 'Needs Improvement', hi: 'असंतोषजनक', tag: '1★ POOR' },
  2: { en: 'Fair Experience', hi: 'साधारण', tag: '2★ FAIR' },
  3: { en: 'Good Service', hi: 'संतोषजनक', tag: '3★ GOOD' },
  4: { en: 'Very Good Journey', hi: 'उत्कृष्ट', tag: '4★ V.GOOD' },
  5: { en: 'Outstanding Vande Bharat Class', hi: 'अति उत्तम', tag: '5★ SUPERB' },
};

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onClose }) => {
  const [category, setCategory] = useState<string>('General Feedback');
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [ticketRefId] = useState<string>(() => {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `FB-${randomDigits}`;
  });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Close on Escape key & lock body scroll
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, isSubmitting]);

  // Reset state when modal is opened afresh
  useEffect(() => {
    if (open) {
      setIsSuccess(false);
      setValidationError(null);
      setErrorMessage(null);
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleRatingClick = (starValue: number) => {
    if (rating === starValue) {
      setRating(null);
    } else {
      setRating(starValue);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setErrorMessage(null);

    const trimmed = message.trim();

    if (!trimmed) {
      setValidationError('Please enter your feedback message.');
      textareaRef.current?.focus();
      return;
    }

    if (trimmed.length < 3) {
      setValidationError('Message must be at least 3 characters.');
      textareaRef.current?.focus();
      return;
    }

    if (trimmed.length > 2000) {
      setValidationError('Message cannot exceed 2000 characters.');
      textareaRef.current?.focus();
      return;
    }

    if (rating !== null && (rating < 1 || rating > 5)) {
      setValidationError('Rating must be between 1 and 5.');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitFeedback({
        category,
        rating: rating ?? undefined,
        message: trimmed,
      });

      setIsSuccess(true);
      setMessage('');
      setRating(null);
      setCategory('General Feedback');
    } catch (err: unknown) {
      setErrorMessage(normalizeApiError(err, 'Unable to send feedback right now. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRatingValue = hoverRating ?? rating ?? 0;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-ticket-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          handleClose();
        }
      }}
    >
      {/* 
        ========================================================================
        AUTHENTIC 🎟️ TRAIN TICKET CONTAINER
        The shape itself IS an actual physical ticket:
        - True inward semicircular punch notches (not external dots)
        - Seamless SVG-defined ticket silhouette with golden amber border
        - Fits completely without any internal scrollbar
        ========================================================================
      */}
      <div className="relative w-full max-w-[460px] my-auto filter drop-shadow-[0_25px_60px_rgba(0,0,0,0.85)] select-none animate-in zoom-in-95 duration-200">
        
        {/* SVG Ticket Shape Background */}
        <svg
          viewBox="0 0 460 550"
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ticketStubGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {/* 1. Main Ticket Body (Cream Cardstock) with INWARD Side Notches */}
          <path
            d="M 22 2 
               H 438 
               A 20 20 0 0 1 458 22 
               V 78 
               A 16 16 0 0 0 458 110 
               V 528 
               A 20 20 0 0 1 438 548 
               H 22 
               A 20 20 0 0 1 2 528 
               V 110 
               A 16 16 0 0 0 2 78 
               V 22 
               A 20 20 0 0 1 22 2 Z"
            fill="#fffdf8"
            stroke="#f59e0b"
            strokeWidth="2.5"
          />

          {/* 2. Top Ticket Stub (Warm Orange-Amber Railway Header) */}
          <path
            d="M 22 2 
               H 438 
               A 20 20 0 0 1 458 22 
               V 78 
               A 16 16 0 0 0 442 94 
               H 18 
               A 16 16 0 0 0 2 78 
               V 22 
               A 20 20 0 0 1 22 2 Z"
            fill="url(#ticketStubGrad)"
          />

          {/* 3. Dotted Perforation Tear Line Connecting the Inward Notches */}
          <line
            x1="22"
            y1="94"
            x2="438"
            y2="94"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="6,5"
          />
        </svg>

        {/* -------------------------------------------------------------
            TICKET CONTENT LAYER (Positioned directly over the SVG ticket)
            ------------------------------------------------------------- */}
        <div className="relative z-10 flex flex-col w-full">
          
          {/* 1. TICKET STUB HEADER (Height: ~94px) */}
          <div className="h-[94px] px-6 pt-3.5 pb-2 flex flex-col justify-between text-white shrink-0">
            {/* Top Row: Brand & Close Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/40 flex items-center justify-center shrink-0 shadow-inner">
                  <OrangeVandeBharatLogo className="h-4.5 w-auto object-contain brightness-110" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-100">
                    Indian Railways • IRCTC
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-1 rounded-lg text-amber-100 hover:text-white hover:bg-black/20 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                aria-label="Close ticket"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Row of Stub: Title & Ticket Ref */}
            <div className="flex items-center justify-between pb-1">
              <h2
                id="feedback-ticket-title"
                className="text-base font-black tracking-tight text-white flex items-center gap-1.5"
              >
                <span>Passenger Feedback Pass</span>
              </h2>
              <div className="flex items-center gap-1 text-[11px] font-mono text-amber-100">
                <span>№</span>
                <span className="text-white font-black tracking-wider bg-black/30 px-1.5 py-0.5 rounded border border-white/20">
                  {ticketRefId}
                </span>
              </div>
            </div>
          </div>

          

          {/* 3. TICKET BODY (Compact & perfectly fitted — ZERO scrollbar!) */}
          <div className="px-6 pb-5 pt-1 flex flex-col justify-between min-h-[420px]">
            {isSuccess ? (
              /* ================= SUCCESS STATE: OFFICIAL TICKET STAMP ================= */
              <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="relative inline-block mx-auto">
                  <div className="w-24 h-24 rounded-full border-4 border-emerald-600 flex flex-col items-center justify-center p-1 bg-emerald-50/80 rotate-[-6deg] shadow-lg">
                    <div className="w-full h-full rounded-full border-2 border-dashed border-emerald-600/80 flex flex-col items-center justify-center">
                      <ShieldCheck className="w-8 h-8 text-emerald-600" />
                      <span className="text-[9px] font-black uppercase text-emerald-900 tracking-widest mt-0.5">
                        CNF • RECORDED
                      </span>
                      <span className="text-[7px] font-bold text-emerald-700 font-mono">
                        IRCTC PASS
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold font-mono">
                    <span>RECORDED REF:</span>
                    <span className="font-black text-emerald-950">{ticketRefId}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    ✓ Thank you for your feedback!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                    We&apos;ve received your feedback and will use it to improve the app.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer inline-flex items-center gap-2 active:scale-95"
                  >
                    <Train className="w-3.5 h-3.5 text-orange-400" />
                    <span>Close Ticket</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ================= MAIN TICKET FORM ================= */
              <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                
                {/* Metadata Strip */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="bg-amber-50/80 rounded-lg py-1 px-1 border border-amber-200/80">
                    <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider">
                      SERVICE
                    </span>
                    <span className="font-mono font-black text-slate-800 text-[10px] truncate block">
                      VANDE BHARAT
                    </span>
                  </div>

                  <div className="bg-amber-50/80 rounded-lg py-1 px-1 border border-amber-200/80">
                    <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider">
                      QUOTA
                    </span>
                    <span className="font-mono font-black text-slate-800 text-[10px] truncate block">
                      GN (GENERAL)
                    </span>
                  </div>

                  <div className="bg-amber-50/80 rounded-lg py-1 px-1 border border-amber-200/80">
                    <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-wider">
                      STATUS
                    </span>
                    <span className="font-mono font-black text-emerald-700 text-[10px] flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      CNF (LIVE)
                    </span>
                  </div>
                </div>

                {/* Field 1: Category */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="feedback-category"
                      className="block text-[11px] font-black text-slate-800 uppercase tracking-wider"
                    >
                      1. Category / श्रेणी
                    </label>
                    <span className="text-[9px] font-mono uppercase font-bold text-orange-600 bg-orange-100/70 px-1.5 py-0.2 rounded border border-orange-200">
                      REQUIRED
                    </span>
                  </div>

                  <select
                    id="feedback-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-1.5 text-xs font-bold bg-white border-2 border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer text-slate-900 shadow-2xs disabled:bg-slate-50 disabled:cursor-not-allowed"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field 2: Journey Rating */}
                <div className="space-y-1 bg-[#f9f5ec] p-2.5 rounded-xl border border-dashed border-amber-300">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>2. Journey Rating / अनुभव</span>
                    </label>
                    <span className="text-[9px] text-slate-500 font-mono">
                      Optional (1-5 Stars)
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <div
                      className="flex items-center gap-1.5 sm:gap-2"
                      role="radiogroup"
                      aria-label="Star Rating from 1 to 5"
                    >
                      {[1, 2, 3, 4, 5].map((starValue) => {
                        const isFilled = starValue <= activeRatingValue;

                        return (
                          <button
                            key={starValue}
                            type="button"
                            onClick={() => handleRatingClick(starValue)}
                            onMouseEnter={() => setHoverRating(starValue)}
                            onMouseLeave={() => setHoverRating(null)}
                            disabled={isSubmitting}
                            role="radio"
                            aria-checked={rating === starValue}
                            aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
                            className={`p-1 rounded-lg transition-transform hover:scale-120 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-400/40 cursor-pointer disabled:cursor-not-allowed ${
                              isFilled ? 'text-amber-500' : 'text-slate-300 hover:text-slate-400'
                            }`}
                          >
                            <Star
                              className={`w-6 h-6 transition-colors drop-shadow-xs ${
                                isFilled
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-300 fill-transparent'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    {rating !== null ? (
                      <button
                        type="button"
                        onClick={() => setRating(null)}
                        className="text-[10px] font-bold text-slate-500 hover:text-rose-600 underline cursor-pointer inline-flex items-center gap-0.5"
                        title="Clear rating"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Clear</span>
                      </button>
                    ) : null}
                  </div>

                  {/* Rating Tag */}
                  {activeRatingValue > 0 && RATING_DESCRIPTIONS[activeRatingValue] && (
                    <div className="pt-0.5 flex items-center gap-1.5 text-[10px] font-bold text-amber-900">
                      <span className="px-1.5 py-0.2 rounded bg-amber-200/80 font-mono text-[9px] font-black">
                        {RATING_DESCRIPTIONS[activeRatingValue].tag}
                      </span>
                      <span>{RATING_DESCRIPTIONS[activeRatingValue].en}</span>
                    </div>
                  )}
                </div>

                {/* Field 3: Passenger Remarks */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="feedback-message"
                      className="block text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1"
                    >
                      <span>3. Remarks / विवरण</span>
                      <span className="text-orange-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-mono ${
                        message.length > 2000
                          ? 'text-rose-600 font-bold'
                          : message.length > 1800
                          ? 'text-amber-600 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {message.length} / 2000
                    </span>
                  </div>

                  <textarea
                    id="feedback-message"
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    disabled={isSubmitting}
                    maxLength={2000}
                    rows={3}
                    placeholder="Tell us what you liked, what went wrong, or what we can improve..."
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400 text-slate-900 resize-none shadow-2xs disabled:bg-slate-50 disabled:cursor-not-allowed font-medium leading-relaxed"
                    required
                  />
                </div>

                {/* Validation Alert */}
                {validationError && (
                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                    <span className="font-bold">{validationError}</span>
                  </div>
                )}

                {/* Server Error Alert */}
                {errorMessage && (
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-center gap-1.5 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span className="font-bold">{errorMessage}</span>
                  </div>
                )}

                {/* Actions & Barcode Strip */}
                <div className="pt-2 border-t border-dashed border-amber-300/80 flex items-center justify-between gap-3">
                  <div className="flex flex-col items-start opacity-70">
                    <div className="font-mono text-[8px] tracking-[0.2em] text-slate-700 font-black">
                      |||| || ||||| |||| || ||||||||||
                    </div>
                    <span className="font-mono text-[7px] text-slate-500 tracking-wider">
                      IRCTC-SECURED-STAMP
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || message.trim().length === 0}
                      className="px-5 py-2 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-600 active:scale-[0.98] text-white rounded-xl text-xs font-black tracking-wider transition-all shadow-md shadow-orange-500/25 inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-orange-400/40 uppercase"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Validating...</span>
                        </>
                      ) : (
                        <>
                          <SendHorizontal className="w-3.5 h-3.5" />
                          <span> Send </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
