import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  IndianRupee,
  Clock,
  MapPin,
  Route,
  Ticket,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  X,
} from 'lucide-react';
import { useAlternateAvailability } from '../hooks/useAlternateAvailability';
import { isWaitlistStatus } from '../services/alternateAvailabilityService';
import { AlternateResultItem } from '../types/alternate';
import { fetchTrainAvailability, getSavedTrainSessionId } from '../api/trains';

interface AlternateAvailabilityViewProps {
  trainNumber: string;
  trainName?: string;
  fromCode: string;
  fromName?: string;
  toCode: string;
  toName?: string;
  journeyDate: string;
  travelClass: string;
  quota?: string;
  trainType?: string;
  currentStatus?: string | null;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onOpenRoute?: (trainNumber: string, trainName?: string) => void;
}

// Helper to safely render clean station label
function formatStationLabel(code?: string, name?: string): { displayName: string; codeLabel?: string } {
  const cleanCode = (code || '').trim().toUpperCase();
  const cleanName = (name || '').trim();

  const isInvalid = (str: string) => !str || str.toLowerCase().includes('[object');

  if (isInvalid(cleanName) && isInvalid(cleanCode)) {
    return { displayName: 'Station' };
  }

  if (!isInvalid(cleanName) && !isInvalid(cleanCode)) {
    if (cleanName.toUpperCase() === cleanCode) {
      return { displayName: cleanCode };
    }
    return { displayName: cleanName, codeLabel: cleanCode };
  }

  if (!isInvalid(cleanName)) {
    return { displayName: cleanName };
  }

  return { displayName: cleanCode };
}

// Helper to determine exact number of seats and user-friendly status badge
function getDisplayTicketInfo(altItem: AlternateResultItem, dynamicCount?: number): {
  ticketCount?: number;
  badgeCode: string;
  seatsText: string;
  isAvailable: boolean;
  isRac: boolean;
} {
  let count = dynamicCount !== undefined ? dynamicCount : altItem.ticketCount;

  // Fallback count extraction if altItem.ticketCount is not set yet
  if (count === undefined) {
    const raw = (altItem.raw && typeof altItem.raw === 'object' ? altItem.raw : {}) as Record<string, unknown>;
    const cand =
      raw.available_seats ??
      raw.availableSeats ??
      raw.seats ??
      raw.seat_count ??
      raw.seats_count ??
      raw.ticket_count ??
      raw.tickets ??
      raw.ticketCount ??
      raw.tickets_count ??
      raw.no_of_seats ??
      raw.number_of_seats ??
      raw.count;
    if (typeof cand === 'number' && cand >= 0) {
      count = cand;
    } else if (typeof cand === 'string') {
      const n = parseInt(cand.replace(/[^\d]/g, ''), 10);
      if (!isNaN(n)) count = n;
    }
  }

  if (count === undefined && altItem.status) {
    const match =
      altItem.status.match(/(?:AVAILABLE|CURR_AVBL|AVBL|AVL|RAC|WL)[\s\-_]*0*(\d+)/i) ||
      altItem.status.match(/0*(\d{1,4})/);
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n)) count = n;
    }
  }

  const rawStatus = (altItem.status || '').toUpperCase();
  const isNotAvailable =
    rawStatus.includes('NOT AVAILABLE') ||
    rawStatus.includes('NOT-AVAILABLE') ||
    rawStatus.includes('NOT AVBL') ||
    rawStatus.includes('NAVBL') ||
    rawStatus.includes('NOT_AVAILABLE') ||
    rawStatus.includes('REGRET') ||
    rawStatus.includes('CANCEL') ||
    rawStatus.startsWith('NOT') ||
    rawStatus === 'NA';

  const isAvailable =
    !isNotAvailable &&
    (rawStatus.includes('AVAILABLE') ||
      rawStatus.includes('CURR_AVBL') ||
      rawStatus.startsWith('AVL') ||
      rawStatus.startsWith('AVBL') ||
      rawStatus === 'CNF');
  const isRac = !isNotAvailable && rawStatus.includes('RAC');

  let badgeCode = 'AVL';
  let seatsText = '';

  if (isNotAvailable) {
    badgeCode = 'NAVBL';
    seatsText = 'Not Available';
  } else if (isAvailable) {
    badgeCode = 'AVL';
    if (count !== undefined && count > 0) {
      seatsText = `${count} Seats`;
    } else {
      seatsText = 'Available';
    }
  } else if (isRac) {
    badgeCode = 'RAC';
    if (count !== undefined) {
      seatsText = `${count} Seats`;
    } else {
      seatsText = 'Guaranteed';
    }
  } else {
    badgeCode = 'WL';
    seatsText = count !== undefined ? `WL ${count}` : altItem.status;
  }

  return {
    ticketCount: count,
    badgeCode,
    seatsText,
    isAvailable,
    isRac,
  };
}

export const AlternateAvailabilityView: React.FC<AlternateAvailabilityViewProps> = ({
  trainNumber,
  trainName,
  fromCode,
  fromName,
  toCode,
  toName,
  journeyDate,
  travelClass,
  quota = 'GN',
  trainType,
  currentStatus,
  isOpen: initialIsOpen = false,
  onToggleOpen,
  onOpenRoute,
}) => {
  const isWL = isWaitlistStatus(currentStatus);

  // Hook automatically subscribes to background search and starts it automatically on WL
  const {
    searchKey,
    results,
    status,
    error,
    isSearching,
    isCompleted,
    isCancelled,
    progress,
    stopSearch,
    startSearch,
  } = useAlternateAvailability({
    trainNumber,
    fromCode,
    toCode,
    journeyDate,
    travelClass,
    quota,
    trainType,
    initialStatus: currentStatus,
    autoStartOnWL: true,
  });

  // Track panel open/close state
  const [isOpen, setIsOpen] = useState<boolean>(initialIsOpen);

  // Track auto-open so it only triggers ONCE per searchKey when the first result arrives
  const autoOpenedForSearchRef = useRef<string | null>(null);
  const prevSearchKeyRef = useRef<string>(searchKey);

  // When searchKey changes (new train, class, date, or route), reset auto-open tracker and collapse
  useEffect(() => {
    if (prevSearchKeyRef.current !== searchKey) {
      prevSearchKeyRef.current = searchKey;
      autoOpenedForSearchRef.current = null;
      setIsOpen(false);
    }
  }, [searchKey]);

  // When a fresh search begins with 0 results, reset the tracker
  useEffect(() => {
    if (status === 'starting' && results.length === 0) {
      autoOpenedForSearchRef.current = null;
    }
  }, [status, results.length]);

  // Auto-open ONCE when the first result arrives (results.length transitions from 0 to >= 1)
  useEffect(() => {
    if (results.length > 0 && autoOpenedForSearchRef.current !== searchKey) {
      autoOpenedForSearchRef.current = searchKey;
      setIsOpen(true);
    }
  }, [results.length, searchKey]);

  const handleToggleOpen = () => {
    setIsOpen((prev) => !prev);
    onToggleOpen?.();
  };

  // Dynamic seat count state for alternate cards when not pre-populated
  const [resolvedCounts, setResolvedCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen || !results || results.length === 0) return;

    results.forEach((altItem) => {
      const itemKey = `${altItem.trainNumber}_${altItem.fromStationCode}_${altItem.toStationCode}_${altItem.class}_${altItem.journeyDate}`;
      const existingInfo = getDisplayTicketInfo(altItem, resolvedCounts[itemKey]);

      if (existingInfo.ticketCount !== undefined) {
        return;
      }

      const sessionId = getSavedTrainSessionId();
      if (!sessionId) return;

      fetchTrainAvailability({
        session_id: sessionId,
        train_number: altItem.trainNumber,
        from_code: altItem.fromStationCode,
        to_code: altItem.toStationCode,
        journey_date: altItem.journeyDate || journeyDate,
        travel_class: altItem.class || travelClass,
        quota: altItem.quota || quota || 'GN',
        train_type: trainType,
      })
        .then((data) => {
          if (data && Array.isArray(data.days) && data.days.length > 0) {
            const rawStatus = data.days[0]?.status || '';
            const match =
              rawStatus.match(/(?:AVAILABLE|CURR_AVBL|AVBL|AVL|RAC|WL)[\s\-_]*0*(\d+)/i) ||
              rawStatus.match(/(\d+)/);
            if (match && match[1]) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num)) {
                setResolvedCounts((prev) => ({ ...prev, [itemKey]: num }));
              }
            }
          }
        })
        .catch(() => {});
    });
  }, [isOpen, results, journeyDate, travelClass, quota, trainType]);

  return (
    <div className="space-y-3 pt-2 border-t border-slate-200/80">
      {/* 1. Action Area Button: Check Alternate Availability */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white/90 p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isWL
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Alternate Availability</span>
              {isWL && results.length > 0 && (
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  {results.length} Found
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500">
              {isWL
                ? isSearching
                  ? progress && progress.total > 0
                    ? `Checking ${progress.checked}/${progress.total} combinations in background...`
                    : 'Searching seat alternatives in background...'
                  : results.length > 0
                  ? 'Confirmed seat alternatives found for nearby stations/trains'
                  : isCancelled
                  ? 'Search stopped by user'
                  : isCompleted
                  ? 'Background search complete'
                  : 'Check confirmed seat options for nearby stations'
                : 'Available for Waitlisted (WL) tickets only'}
            </p>
          </div>
        </div>

        {/* Dedicated Action Button & Stop Button */}
        <div className="flex items-center gap-1.5">
          {isSearching && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                stopSearch();
              }}
              title="Stop alternate search"
              aria-label="Stop alternate search"
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            id={`check-alternate-btn-${trainNumber}-${travelClass}`}
            onClick={
              isWL
                ? () => {
                    if (isCancelled) {
                      startSearch();
                    }
                    handleToggleOpen();
                  }
                : undefined
            }
            disabled={!isWL}
            title={
              !isWL
                ? 'Alternate availability search is only active when current status is Waitlisted (WL)'
                : isOpen
                ? 'Hide alternate availability options'
                : 'Show already searched alternate availability options'
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs select-none ${
              !isWL
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                : isOpen
                ? 'bg-amber-600 text-white hover:bg-amber-700 border border-amber-600 cursor-pointer active:scale-95 shadow-amber-500/20'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border border-amber-500 cursor-pointer active:scale-95 shadow-orange-500/20'
            }`}
          >
            {isSearching && !isOpen ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Check Alternate Availability</span>
            {isWL && (
              isOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-white/90" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-white/90" />
              )
            )}
          </button>
        </div>
      </div>

      {/* 2. Expanded Alternate Availability Results Sub-section */}
      {isWL && isOpen && (
        <div
          id={`alternate-results-panel-${trainNumber}-${travelClass}`}
          className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-3 sm:p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header & Status Indicator */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-200/60">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Alternate Confirmed Seat Options
              </h4>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-white border border-amber-200 px-1.5 py-0.5 rounded-md">
                {travelClass} • {quota}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              {isSearching ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 text-amber-700 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                    <span>
                      {progress && progress.total > 0
                        ? `Checking ${progress.checked}/${progress.total} (${progress.percent}%)`
                        : 'Checking alternatives...'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      stopSearch();
                    }}
                    title="Stop alternate search"
                    aria-label="Stop alternate search"
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-amber-200 hover:border-rose-200 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : isCancelled ? (
                <div className="flex items-center gap-1 text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  <span>Search stopped</span>
                </div>
              ) : isCompleted ? (
                <div className="flex items-center gap-1 text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Search completed</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Results Cards List */}
          {results.length > 0 ? (
            <div className="space-y-2.5">
              {results.map((altItem: AlternateResultItem, idx: number) => {
                const itemKey = `${altItem.trainNumber}_${altItem.fromStationCode}_${altItem.toStationCode}_${altItem.class}_${altItem.journeyDate}`;
                const ticketInfo = getDisplayTicketInfo(altItem, resolvedCounts[itemKey]);

                return (
                  <div
                    key={altItem.id || `${altItem.trainNumber}-${idx}`}
                    className="bg-white border border-amber-200/90 hover:border-amber-400 rounded-xl p-3 sm:p-3.5 transition-all duration-150 shadow-2xs hover:shadow-xs space-y-2.5"
                  >
                    {/* Top Row: Train & Route Information */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {altItem.trainNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {altItem.trainName || trainName || `Train ${altItem.trainNumber}`}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            {altItem.class || travelClass} • {altItem.quota || quota}
                          </span>
                        </div>

                        {/* Station Pair */}
                        {(() => {
                          const fromLabel = formatStationLabel(
                            altItem.fromStationCode,
                            altItem.fromStationName
                          );
                          const toLabel = formatStationLabel(
                            altItem.toStationCode,
                            altItem.toStationName
                          );

                          return (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 pt-0.5 flex-wrap">
                              <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              <span className="font-extrabold text-slate-900">
                                {fromLabel.displayName}
                              </span>
                              {fromLabel.codeLabel && (
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                                  {fromLabel.codeLabel}
                                </span>
                              )}
                              <ArrowRight className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              <span className="font-extrabold text-slate-900">
                                {toLabel.displayName}
                              </span>
                              {toLabel.codeLabel && (
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                                  {toLabel.codeLabel}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Prominent Number of Seats Available Badge */}
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                        <div
                          className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-2xs font-mono font-black ${
                            ticketInfo.isAvailable
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : ticketInfo.isRac
                              ? 'bg-amber-50 border-amber-300 text-amber-900'
                              : 'bg-rose-50 border-rose-300 text-rose-800'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none ${
                              ticketInfo.isAvailable
                                ? 'bg-emerald-200/90 text-emerald-900'
                                : ticketInfo.isRac
                                ? 'bg-amber-200/90 text-amber-900'
                                : 'bg-rose-200/90 text-rose-900'
                            }`}
                          >
                            {ticketInfo.badgeCode}
                          </span>
                          <span className="text-xs sm:text-sm font-black tracking-tight leading-none">
                            {ticketInfo.seatsText}
                          </span>
                        </div>

                        {typeof altItem.totalFare === 'number' && altItem.totalFare > 0 && (
                          <div className="text-xs font-black text-slate-800 font-mono flex items-center bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                            <IndianRupee className="w-3 h-3 -mr-0.5 text-slate-600" />
                            <span>{altItem.totalFare}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Booking Tip / Strategy description if any */}
                    {(altItem.description || altItem.bookingTip) && (
                      <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-2 text-[11px] text-amber-900 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{altItem.bookingTip || altItem.description}</span>
                      </div>
                    )}

                    {/* Action Buttons: Route & IRCTC Book */}
                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {onOpenRoute && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenRoute(
                                altItem.trainNumber,
                                altItem.trainName || trainName
                              )
                            }
                            className="text-[11px] font-bold text-slate-700 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            title={`View route and halts for train ${altItem.trainNumber}`}
                          >
                            <Route className="w-3 h-3 text-orange-500" />
                            <span>View Route</span>
                          </button>
                        )}
                        {altItem.departureTime && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Dep: {altItem.departureTime}</span>
                          </span>
                        )}
                      </div>

                      <a
                        href="https://www.irctc.co.in/nget/train-search"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-orange-500/20 flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>
                          Book {ticketInfo.ticketCount ? `${ticketInfo.ticketCount} Seats` : 'Seats on IRCTC'}
                        </span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : isSearching ? (
            /* Loading State while searching */
            <div className="py-6 px-3 bg-white rounded-xl border border-amber-200 text-center space-y-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <div className="text-xs font-bold text-slate-800">
                  Checking Alternate Availability...
                </div>
                {progress && progress.total > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-amber-800 font-semibold px-0.5">
                      <span>Tested {progress.checked} of {progress.total} combinations</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <div className="w-full bg-amber-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(5, progress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-slate-500">
                  Scanning nearby boarding/deboarding stations for confirmed seats...
                </p>
              </div>
            </div>
          ) : error ? (
            /* Error State */
            <div className="py-4 px-3 bg-white rounded-xl border border-rose-200 text-center space-y-1.5 shadow-2xs">
              <AlertCircle className="w-5 h-5 text-rose-500 mx-auto" />
              <div className="text-xs font-bold text-rose-800">
                Unable to check alternate availability.
              </div>
              <p className="text-[11px] text-slate-500">{error}</p>
            </div>
          ) : (
            /* Empty State */
            <div className="py-4 px-3 bg-white rounded-xl border border-slate-200 text-center space-y-1 shadow-2xs">
              <Info className="w-5 h-5 text-slate-400 mx-auto" />
              <div className="text-xs font-bold text-slate-700">
                No alternate availability found.
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                No direct alternate station pairs or alternative trains with confirmed seats were found for this date.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
