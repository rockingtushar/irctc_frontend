import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CoachPosition } from '../../types/runningStatus';
import {
  Train,
  X,
  Layers,
  Info,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CoachPositionModalProps {
  open: boolean;
  onClose: () => void;
  trainNumber: string;
  trainName: string;
  journeyDate?: string;
  coachPositions?: CoachPosition[] | null;
}

/**
 * Converts NTES coach type abbreviations into user-friendly descriptive labels
 * while preserving the original coach_type for passenger clarity.
 */
export function getCoachTypeLabel(coachType: string): string {
  const code = (coachType || '').trim().toUpperCase();
  const mapping: Record<string, string> = {
    ENG: 'Engine',
    LOCO: 'Locomotive',
    SLRD: 'SLRD',
    GEN: 'General',
    GS: 'General',
    SL: 'Sleeper',
    '3E': 'AC 3 Economy',
    '3A': 'AC 3 Tier',
    '2A': 'AC 2 Tier',
    '1A': 'AC First Class',
    CC: 'AC Chair Car',
    '2S': 'Second Sitting',
    EC: 'Executive Chair Car',
    EA: 'Anubhuti Class',
    EV: 'Vistadome AC',
    PC: 'Pantry Car',
    PANTRY: 'Pantry Car',
    EOG: 'Generator Car',
    LPR: 'LPR',
    OCV: 'OCV',
    RMS: 'Postal Van',
    VP: 'Parcel Van',
  };
  return mapping[code] || code;
}

/**
 * Category-based styling theme for compact coach visualization
 */
function getCoachCategoryTheme(coachType: string, isEngine: boolean) {
  if (isEngine) {
    return {
      bg: 'bg-rose-600',
      text: 'text-white',
      border: 'border-rose-700',
      badge: 'bg-rose-900/30 text-rose-100',
      label: 'Engine',
      accent: 'ring-rose-400',
    };
  }

  const code = (coachType || '').trim().toUpperCase();

  switch (code) {
    case 'SL':
      return {
        bg: 'bg-blue-600',
        text: 'text-white',
        border: 'border-blue-700',
        badge: 'bg-blue-900/30 text-blue-100',
        label: 'Sleeper',
        accent: 'ring-blue-400',
      };
    case '3A':
      return {
        bg: 'bg-teal-600',
        text: 'text-white',
        border: 'border-teal-700',
        badge: 'bg-teal-900/30 text-teal-100',
        label: 'AC 3 Tier',
        accent: 'ring-teal-400',
      };
    case '3E':
      return {
        bg: 'bg-sky-600',
        text: 'text-white',
        border: 'border-sky-700',
        badge: 'bg-sky-900/30 text-sky-100',
        label: 'AC 3 Econ',
        accent: 'ring-sky-400',
      };
    case '2A':
      return {
        bg: 'bg-indigo-600',
        text: 'text-white',
        border: 'border-indigo-700',
        badge: 'bg-indigo-900/30 text-indigo-100',
        label: 'AC 2 Tier',
        accent: 'ring-indigo-400',
      };
    case '1A':
    case 'EC':
    case 'EA':
    case 'EV':
      return {
        bg: 'bg-purple-600',
        text: 'text-white',
        border: 'border-purple-700',
        badge: 'bg-purple-900/30 text-purple-100',
        label: 'AC 1st/Exec',
        accent: 'ring-purple-400',
      };
    case 'CC':
    case '2S':
      return {
        bg: 'bg-emerald-600',
        text: 'text-white',
        border: 'border-emerald-700',
        badge: 'bg-emerald-900/30 text-emerald-100',
        label: code === 'CC' ? 'Chair Car' : '2nd Sitting',
        accent: 'ring-emerald-400',
      };
    case 'GEN':
    case 'GS':
      return {
        bg: 'bg-amber-600',
        text: 'text-white',
        border: 'border-amber-700',
        badge: 'bg-amber-900/30 text-amber-100',
        label: 'General',
        accent: 'ring-amber-400',
      };
    case 'PC':
    case 'PANTRY':
      return {
        bg: 'bg-orange-600',
        text: 'text-white',
        border: 'border-orange-700',
        badge: 'bg-orange-900/30 text-orange-100',
        label: 'Pantry',
        accent: 'ring-orange-400',
      };
    default:
      return {
        bg: 'bg-slate-700',
        text: 'text-white',
        border: 'border-slate-800',
        badge: 'bg-slate-900/30 text-slate-100',
        label: code,
        accent: 'ring-slate-400',
      };
  }
}

interface CoachStatItem {
  count: number;
  type: string;
  isEngine: boolean;
}

export const CoachPositionModal: React.FC<CoachPositionModalProps> = ({
  open,
  onClose,
  trainNumber,
  trainName,
  journeyDate,
  coachPositions,
}) => {
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [filterClass, setFilterClass] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Reset filter and select default coach when opened
  useEffect(() => {
    if (open) {
      setFilterClass(null);
      setSelectedPosition(null);
    }
  }, [open]);

  // Safe sorted coaches array
  const coaches = useMemo(() => {
    if (!coachPositions || !Array.isArray(coachPositions)) {
      return [];
    }
    return [...coachPositions].sort((a, b) => a.position - b.position);
  }, [coachPositions]);

  // Summary breakdown of coach types for quick legend filter
  const coachStats = useMemo<Record<string, CoachStatItem>>(() => {
    const counts: Record<string, CoachStatItem> = {};
    coaches.forEach((c) => {
      const isEng = c.coach_type === 'ENG' || c.coach_id === 'ENG' || c.coach_type === 'LOCO';
      const label = isEng ? 'Engine' : getCoachTypeLabel(c.coach_type);
      if (!counts[label]) {
        counts[label] = { count: 1, type: c.coach_type, isEngine: isEng };
      } else {
        counts[label].count += 1;
      }
    });
    return counts;
  }, [coaches]);

  // Active selected coach details
  const activeCoach = useMemo(() => {
    if (selectedPosition === null) {
      // Default to first non-engine passenger coach, or first coach
      const firstPassenger = coaches.find(
        (c) => c.coach_type !== 'ENG' && c.coach_id !== 'ENG'
      );
      return firstPassenger || coaches[0] || null;
    }
    return coaches.find((c) => c.position === selectedPosition) || null;
  }, [coaches, selectedPosition]);

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

  const totalCoachesCount = coaches.length;
  const isAvailable = totalCoachesCount > 0;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-position-modal-title"
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen min-w-full h-screen min-h-[100dvh] min-h-screen z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
      style={{ minHeight: '100vh', height: '100%' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 my-auto shrink-0"
        id="coach-position-modal-container"
      >
        {/* Compact Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 sm:px-5 py-3 text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
              <Train className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  id="coach-position-modal-title"
                  className="text-sm sm:text-base font-black tracking-tight text-white truncate"
                >
                  Coach Position & Formation
                </h3>
                <span className="font-mono text-[11px] font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/60">
                  {trainNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                <span className="font-bold text-slate-100">{trainName}</span>
                {journeyDate && (
                  <span className="text-slate-400 ml-1.5">
                    • Date: <strong className="text-slate-200">{journeyDate}</strong>
                  </span>
                )}
                {isAvailable && (
                  <span className="text-amber-400 font-bold ml-1.5">
                    • {totalCoachesCount} Rakes Total
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700 shrink-0"
            aria-label="Close modal"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Designed to fit all coaches on one screen without scrolling */}
        <div className="p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 bg-slate-50/50">
          {!isAvailable ? (
            /* Empty state when coach_position is empty or unavailable */
            <div
              id="coach-position-empty-state"
              className="text-center py-10 px-4 max-w-md mx-auto space-y-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <Train className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Coach position is not available for this train.
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Coach composition is typically confirmed closer to charting time prior to scheduled departure.
              </p>
            </div>
          ) : (
            <>
              {/* Direction Indicator Bar */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                <div className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  <Train className="w-3.5 h-3.5" />
                  <span>◀ Front / Engine</span>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold hidden sm:block">
                  Complete Train Formation (All Coaches)
                </div>
                <div className="flex items-center gap-1 text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-md border border-slate-300">
                  <span>Rear / Guard ▶</span>
                </div>
              </div>

              {/* FIT-TO-SCREEN COMPACT FORMATION GRID (NO SCROLLING) */}
              <div
                id="coach-formation-screen-grid"
                className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2 p-2 sm:p-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-inner"
              >
                {coaches.map((coach) => {
                  // Backend position is 0-based: displayPosition = coach.position + 1
                  const displayPosition = coach.position + 1;
                  const isEngine =
                    coach.coach_type === 'ENG' ||
                    coach.coach_id === 'ENG' ||
                    coach.coach_type === 'LOCO';
                  const theme = getCoachCategoryTheme(coach.coach_type, isEngine);
                  const readableLabel = getCoachTypeLabel(coach.coach_type);
                  const isSelected = activeCoach?.position === coach.position;
                  const isFilteredMatch =
                    !filterClass ||
                    (filterClass === 'Engine'
                      ? isEngine
                      : getCoachTypeLabel(coach.coach_type) === filterClass);

                  return (
                    <button
                      key={`coach-${coach.position}-${coach.coach_id}`}
                      type="button"
                      onClick={() => setSelectedPosition(coach.position)}
                      className={`relative flex flex-col justify-between rounded-xl p-1 sm:p-1.5 transition-all cursor-pointer text-left select-none border ${
                        isSelected
                          ? `ring-2 ring-offset-2 ring-offset-slate-900 ${theme.accent} ${theme.bg} scale-105 z-10 shadow-lg`
                          : isFilteredMatch
                          ? `${theme.bg} hover:brightness-110 hover:scale-102 ${theme.border} opacity-100`
                          : `${theme.bg} opacity-30 hover:opacity-75 ${theme.border}`
                      }`}
                      style={{ minHeight: '56px' }}
                      title={`Pos ${displayPosition}: ${coach.coach_id} (${readableLabel})`}
                    >
                      {/* Top: Position Pill */}
                      <div className="flex items-center justify-between text-[9px] font-black leading-none">
                        <span className="opacity-80">#{displayPosition}</span>
                        {isEngine && <span className="text-[8px]">🚂</span>}
                      </div>

                      {/* Center: Large Coach ID */}
                      <div className="text-center my-0.5">
                        <span className="font-mono font-black text-xs sm:text-sm tracking-tight text-white block truncate">
                          {coach.coach_id}
                        </span>
                      </div>

                      {/* Bottom: Coach Type Short Badge */}
                      <div className="text-center">
                        <span className="text-[8px] sm:text-[9px] font-bold opacity-90 block truncate leading-tight">
                          {coach.coach_type}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Selected Coach Detail Banner */}
              {activeCoach && (
                <div
                  id="selected-coach-detail-card"
                  className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 p-2.5 sm:p-3 shadow-xs flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-mono text-sm text-white shrink-0 shadow-xs ${
                        getCoachCategoryTheme(
                          activeCoach.coach_type,
                          activeCoach.coach_type === 'ENG' || activeCoach.coach_id === 'ENG'
                        ).bg
                      }`}
                    >
                      {activeCoach.coach_id}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800">
                          {getCoachTypeLabel(activeCoach.coach_type)}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          Code: {activeCoach.coach_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        <strong className="text-orange-600 font-bold">
                          Position {activeCoach.position + 1}
                        </strong>{' '}
                        of {totalCoachesCount} from Locomotive Engine
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 text-right shrink-0 hidden sm:block">
                    <span className="text-slate-400">Tap any coach box to view details</span>
                  </div>
                </div>
              )}

              {/* Compact Legend / Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[10px]">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] shrink-0">
                  Classes:
                </span>
                {(Object.entries(coachStats) as [string, CoachStatItem][]).map(([label, info]) => {
                  const theme = getCoachCategoryTheme(info.type, info.isEngine);
                  const isFilterActive = filterClass === label;

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setFilterClass(isFilterActive ? null : label)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer border ${
                        isFilterActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${theme.bg}`}
                      />
                      <span>{label}</span>
                      <strong className="text-slate-900 font-black ml-0.5">
                        ({info.count})
                      </strong>
                    </button>
                  );
                })}
                {filterClass && (
                  <button
                    type="button"
                    onClick={() => setFilterClass(null)}
                    className="text-orange-600 hover:text-orange-700 font-bold underline ml-1 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Compact Modal Footer */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official Railway NTES Formation</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
