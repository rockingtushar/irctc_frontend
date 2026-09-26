import React, { useRef } from 'react';
import { Train, ClassState } from '../types/station';
import {
  Sparkles,
  IndianRupee,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Calendar,
  X,
  RotateCw,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface ClassAvailabilitySectionProps {
  train: Train;
  selectedClass?: string;
  selectedQuota?: string;
  quota?: string;
  onQuotaChange?: (newQuota: string) => void;
  activeClass: string;
  activeState?: ClassState;
  classStatesMap?: Record<string, ClassState>;
  onSelectClass?: (classCode: string) => void;
  onRefresh?: () => void;
  onClose?: () => void;
}

/**
 * Indian Railway coach class hierarchy order: 2S -> SL -> CC -> 3E -> 3A -> 2A -> 1A -> EC -> EA -> EV
 */
const RAILWAY_CLASS_ORDER: Record<string, number> = {
  '2S': 10,
  'SL': 20,
  'CC': 30,
  '3E': 40,
  '3A': 50,
  '2A': 60,
  '1A': 70,
  'FC': 75,
  'EC': 80,
  'EA': 85,
  'EV': 90,
  'VS': 95,
};

export function sortRailwayClasses(classes: string[]): string[] {
  if (!classes || !Array.isArray(classes)) return [];
  return [...classes].sort((a, b) => {
    const orderA = RAILWAY_CLASS_ORDER[a.toUpperCase()] ?? 999;
    const orderB = RAILWAY_CLASS_ORDER[b.toUpperCase()] ?? 999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.localeCompare(b);
  });
}

/**
 * Returns user-friendly Indian Railway class display name
 */
export function getClassName(code: string): string {
  const map: Record<string, string> = {
    '1A': 'First AC',
    '2A': '2 Tier AC',
    '3A': '3 Tier AC',
    '3E': '3 AC Economy',
    'SL': 'Sleeper',
    'CC': 'AC Chair Car',
    '2S': 'Second Sitting',
    'EC': 'Exec. Chair Car',
    'EA': 'Anubhuti Class',
    'EV': 'Vistadome AC',
    'VS': 'Vistadome Non-AC',
  };
  return map[code.toUpperCase()] || code;
}

/**
 * User-friendly relative time formatter for fetchedAt
 */
export function formatRelativeTime(timestamp?: string | number): string {
  if (!timestamp) return 'Fetched just now';

  try {
    const timeMs = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
    if (isNaN(timeMs)) {
      return String(timestamp);
    }
    const diffSec = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
    if (diffSec < 45) return 'Fetched just now';
    if (diffSec < 90) return 'Fetched 1 min ago';
    if (diffSec < 3600) return `Fetched ${Math.floor(diffSec / 60)} mins ago`;
    if (diffSec < 7200) return 'Fetched 1 hour ago';
    if (diffSec < 86400) return `Fetched ${Math.floor(diffSec / 3600)} hours ago`;
    return 'Fetched today';
  } catch {
    return 'Fetched recently';
  }
}

/**
 * Parses raw IRCTC status:
 * Formats "AVAILABLE-0003" -> "Available 3"
 * Otherwise preserves exact raw status text (e.g. "RLWL1/WL1", "REGRET", "WL45")
 */
function formatStatusLabel(rawStatus: string): string {
  if (!rawStatus) return 'Unknown';
  const trimmed = rawStatus.trim();

  // Format AVAILABLE-XXXX / AVAILABLE-0003 / AVAILABLE 0003 -> Available 3
  const match = trimmed.match(/^AVAILABLE(?:-|\s+)0*(\d+)$/i);
  if (match) {
    return `Available ${match[1]}`;
  }
  if (/^AVAILABLE(?:-|\s+)?0*$/i.test(trimmed)) {
    return 'Available';
  }

  // Return EXACT status text for all others
  return trimmed;
}

/**
 * Returns style themes matching ConfirmTkt visual language
 */
function getStatusTheme(rawStatus: string): {
  type: 'available' | 'rac' | 'waitlist' | 'neutral';
  pillBg: string;
  pillText: string;
  pillBorder: string;
  cardBg: string;
  cardBorder: string;
  accentText: string;
  badgeLabel: string;
  dotColor: string;
} {
  if (!rawStatus) {
    return {
      type: 'neutral',
      pillBg: 'bg-slate-100',
      pillText: 'text-slate-600',
      pillBorder: 'border-slate-200',
      cardBg: 'bg-white',
      cardBorder: 'border-slate-200',
      accentText: 'text-slate-700',
      badgeLabel: 'Status Unknown',
      dotColor: 'bg-slate-400',
    };
  }

  const upper = rawStatus.toUpperCase();

  // 1. Available -> ConfirmTkt Emerald Green
  if (upper.startsWith('AVAILABLE') || upper.includes('AVAILABLE') || upper.includes('CURR_AVBL')) {
    return {
      type: 'available',
      pillBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      pillText: 'text-emerald-700 font-bold',
      pillBorder: 'border-emerald-200',
      cardBg: 'bg-emerald-50/40 hover:bg-emerald-50/70',
      cardBorder: 'border-emerald-300/80',
      accentText: 'text-emerald-700',
      badgeLabel: 'Available',
      dotColor: 'bg-emerald-500',
    };
  }

  // 2. RAC -> Amber/Yellow
  if (upper.includes('RAC')) {
    return {
      type: 'rac',
      pillBg: 'bg-amber-50 text-amber-800 border-amber-200',
      pillText: 'text-amber-800 font-bold',
      pillBorder: 'border-amber-200',
      cardBg: 'bg-amber-50/40 hover:bg-amber-50/70',
      cardBorder: 'border-amber-300/80',
      accentText: 'text-amber-800',
      badgeLabel: 'RAC Available',
      dotColor: 'bg-amber-500',
    };
  }

  // 3. Waiting List / Regret -> Rose/Red
  if (
    upper.includes('WL') ||
    upper.includes('RLWL') ||
    upper.includes('GNWL') ||
    upper.includes('PQWL') ||
    upper.includes('REGRET') ||
    upper.includes('NOT AVAILABLE') ||
    upper.includes('CAN')
  ) {
    return {
      type: 'waitlist',
      pillBg: 'bg-rose-50 text-rose-700 border-rose-200',
      pillText: 'text-rose-700 font-bold',
      pillBorder: 'border-rose-200',
      cardBg: 'bg-rose-50/30 hover:bg-rose-50/60',
      cardBorder: 'border-rose-200',
      accentText: 'text-rose-700',
      badgeLabel: 'Waitlist',
      dotColor: 'bg-rose-500',
    };
  }

  // 4. Default Neutral
  return {
    type: 'neutral',
    pillBg: 'bg-slate-100 text-slate-700 border-slate-200',
    pillText: 'text-slate-700 font-bold',
    pillBorder: 'border-slate-200',
    cardBg: 'bg-white hover:bg-slate-50',
    cardBorder: 'border-slate-200',
    accentText: 'text-slate-700',
    badgeLabel: 'Unknown',
    dotColor: 'bg-slate-400',
  };
}

/**
 * Formats YYYY-MM-DD into ConfirmTkt-style date headers:
 * e.g., "Mon, 07 Sep" or "Tue, 08 Sep"
 */
function formatConfirmTktDate(dateStr: string): { dayName: string; formattedDate: string; fullYear: string } {
  if (!dateStr) return { dayName: 'Date', formattedDate: dateStr, fullYear: '' };

  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return {
          dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
          formattedDate: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          fullYear: d.toLocaleDateString('en-IN', { year: 'numeric' }),
        };
      }
    }

    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return {
        dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        formattedDate: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        fullYear: d.toLocaleDateString('en-IN', { year: 'numeric' }),
      };
    }
  } catch {
    // fallback
  }

  return { dayName: 'Date', formattedDate: dateStr, fullYear: '' };
}

export const ClassAvailabilitySection: React.FC<ClassAvailabilitySectionProps> = ({
  train,
  activeClass,
  activeState,
  classStatesMap,
  selectedQuota,
  quota,
  onQuotaChange,
  onSelectClass,
  onRefresh,
  onClose,
}) => {
  const avlClasses = sortRailwayClasses(train.avlClasses ?? []);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  if (avlClasses.length === 0) {
    return null;
  }

  // Derive data from activeState or fallback to train.availability
  const activeClassState = activeState || classStatesMap?.[activeClass];
  const activeData = activeClassState?.data;
  const legacyData = train.availability?.[activeClass];

  const isLoading = Boolean(activeClassState?.isLoading);
  const errorMsg = activeClassState?.error;
  const fetchedAt = activeClassState?.fetchedAt || activeData?.fetchedAt || legacyData?.fetchedAt;

  const activeDays = activeData?.days ?? legacyData?.days ?? [];
  const activeFare =
    activeData?.totalFare ??
    activeData?.baseFare ??
    legacyData?.totalFare ??
    legacyData?.baseFare;
  const currentQuotaVal = quota || activeData?.quota || legacyData?.quota || selectedQuota || 'General (GN)';

  // Horizontal scroll buttons helper
  const scrollCards = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div
      className="pt-2 border-t border-slate-100 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200"
      id={`confirmtkt-availability-${train.trainNumber}`}
    >
      {/* Active Class & Quota Control Bar (ConfirmTkt Mobile Bar) */}
      <div
        id={`availability-details-${train.trainNumber}-${activeClass}`}
        className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 space-y-2.5"
      >
        {/* Top Control Strip */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Active Class Pill */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2.5 py-1 rounded-xl shadow-xs shadow-orange-500/20">
              <span className="font-mono text-xs font-black">{activeClass}</span>
              <span className="text-[11px] font-semibold text-white/90 hidden xs:inline">
                {getClassName(activeClass)}
              </span>
            </div>

            {/* Quota Selection Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-2 py-1 shadow-2xs transition-colors">
              <label
                htmlFor={`quota-dropdown-${train.trainNumber}`}
                className="text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none cursor-pointer"
              >
                Quota:
              </label>
              <select
                id={`quota-dropdown-${train.trainNumber}`}
                value={currentQuotaVal}
                onChange={(e) => onQuotaChange?.(e.target.value)}
                disabled={isLoading}
                className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer disabled:opacity-50 pr-0.5 py-0.5"
              >
                <option value="General (GN)">General (GN)</option>
                <option value="Tatkal (TQ)">Tatkal (TQ)</option>
                <option value="Premium Tatkal (PT)">Premium Tatkal (PT)</option>
                <option value="Ladies (LD)">Ladies (LD)</option>
                <option value="Senior Citizen (SS)">Senior Citizen (SS)</option>
                <option value="Divyang (HP)">Divyang (HP)</option>
              </select>
            </div>

            {/* Relative Timestamp (Desktop/Tablet) */}
            {fetchedAt && !isLoading && !errorMsg && (
              <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-xl hidden sm:flex items-center gap-1 shadow-2xs">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{formatRelativeTime(fetchedAt)}</span>
              </span>
            )}
          </div>

          {/* Action buttons: Refresh, Scroll, Close */}
          <div className="flex items-center gap-1 shrink-0">
            {onRefresh && (
              <button
                type="button"
                id={`refresh-avail-${train.trainNumber}-${activeClass}`}
                onClick={onRefresh}
                disabled={isLoading}
                className="p-1.5 sm:px-2 sm:py-1 rounded-xl bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-slate-200 hover:border-orange-200 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                title="Refresh availability"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
                <span className="text-[11px] hidden md:inline">Refresh</span>
              </button>
            )}

            {activeDays.length > 2 && !isLoading && !errorMsg && (
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollCards('left')}
                  className="w-7 h-7 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shadow-2xs cursor-pointer"
                  title="Previous dates"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCards('right')}
                  className="w-7 h-7 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shadow-2xs cursor-pointer"
                  title="Next dates"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:px-2 sm:py-1 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                title="Hide availability"
              >
                <X className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Hide</span>
              </button>
            )}
          </div>
        </div>

        {/* Body: Loading State */}
        {isLoading ? (
          <div className="py-6 px-3 bg-white rounded-2xl border border-orange-100 text-center space-y-2 shadow-2xs animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
              <RotateCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-800">
                Checking availability for {activeClass} ({getClassName(activeClass)})...
              </div>
              <p className="text-[10px] text-slate-400">
                Connecting to IRCTC server for quota: {currentQuotaVal}
              </p>
            </div>
          </div>
        ) : errorMsg ? (
          /* Body: Error State */
          <div className="py-5 px-3 bg-white rounded-2xl border border-rose-200 text-center space-y-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 max-w-md mx-auto">
              <div className="text-xs font-bold text-rose-800">
                Unable to load availability for {activeClass}
              </div>
              <p className="text-[11px] text-slate-500">{errorMsg}</p>
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="px-3.5 py-1.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-orange-500/20 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            )}
          </div>
        ) : activeDays.length === 0 ? (
          /* Body: Empty State */
          <div className="py-5 px-3 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
            <AlertCircle className="w-5 h-5 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-700">No availability records for {activeClass}</div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              No daily availability rows were found for this class and quota combination.
            </p>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Re-check</span>
              </button>
            )}
          </div>
        ) : (
          /* Body: ConfirmTkt Mobile & Desktop Date Carousel */
          <div
            ref={scrollContainerRef}
            className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none snap-x snap-mandatory scroll-smooth"
          >
            {activeDays.map((dayItem, dIdx) => {
              const statusText = formatStatusLabel(dayItem.status);
              const theme = getStatusTheme(dayItem.status);
              const { dayName, formattedDate, fullYear } = formatConfirmTktDate(dayItem.date);

              return (
                <div
                  key={`${dayItem.date}-${dIdx}`}
                  id={`confirmtkt-day-${train.trainNumber}-${activeClass}-${dIdx}`}
                  className={`snap-start shrink-0 min-w-[130px] max-w-[145px] sm:min-w-[170px] sm:max-w-[190px] rounded-2xl border p-2.5 sm:p-3 transition-all duration-150 flex flex-col justify-between gap-2 shadow-2xs select-none ${theme.cardBg} ${theme.cardBorder}`}
                >
                  {/* Top: Date & Day */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                    <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-800">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {dayName}, {formattedDate}
                      </span>
                    </div>
                    {fullYear && (
                      <span className="text-[9px] font-mono text-slate-400 hidden sm:inline">{fullYear}</span>
                    )}
                  </div>

                  {/* Middle: Prominent Availability Status Box (ConfirmTkt Style) */}
                  <div className="py-1">
                    <div
                      className={`text-sm sm:text-base font-black font-mono tracking-tight leading-tight truncate ${theme.accentText}`}
                    >
                      {statusText}
                    </div>

                    <div className="flex items-center gap-1 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor} shrink-0`} />
                      <span className="text-[10px] font-semibold text-slate-500 truncate">
                        {theme.type === 'available'
                          ? 'Available'
                          : theme.type === 'rac'
                          ? 'RAC'
                          : theme.type === 'waitlist'
                          ? 'Waitlist'
                          : 'Status'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Fare & Instant Book CTA */}
                  <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between gap-1.5">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase leading-none mb-0.5">Fare</span>
                      <div className="text-xs font-black text-slate-900 font-mono flex items-center">
                        <IndianRupee className="w-2.5 h-2.5 -mr-0.5 text-slate-600" />
                        <span>{activeFare || '--'}</span>
                      </div>
                    </div>

                    <a
                      href="https://www.irctc.co.in/nget/train-search"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs shadow-orange-500/20 flex items-center gap-1 shrink-0 active:scale-95"
                    >
                      <Ticket className="w-3 h-3" />
                      <span>Book</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
