import React, { useState, useRef, useEffect } from 'react';
import { Train, ClassState, TrainAvailabilityRequestBody, TrainAvailabilityData } from '../types/station';
import {
  TrainTrack,
  Clock,
  MapPin,
  Calendar,
  ArrowRight,
  Compass,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  IndianRupee,
  Loader2,
  Radio,
  Route,
} from 'lucide-react';
import { ClassAvailabilitySection, sortRailwayClasses } from './ClassAvailabilitySection';
import { fetchTrainAvailability, getSavedTrainSessionId, toStandardYYYYMMDD } from '../api/trains';
import { RunningStatusData } from '../types/runningStatus';
import {
  getCachedRoute,
  getInFlightRoutePromise,
  fetchRouteWithCache,
  preloadRoutesForTrains,
} from '../services/routePreloadService';
import { TrainRouteModal } from './TrainRouteModal';

interface TrainResultsListProps {
  trains: Train[];
  selectedClass?: string;
  selectedQuota?: string;
  journeyDate?: string;
  fromStationCode?: string;
  toStationCode?: string;
  onUpdateTrainAvailability?: (trainNumber: string, classCode: string, data: TrainAvailabilityData) => void;
  onNavigateToRunningStatus?: (trainNo: string, date?: string) => void;
}

const daysMeta = [
  { key: 'runningMon', label: 'M' },
  { key: 'runningTue', label: 'T' },
  { key: 'runningWed', label: 'W' },
  { key: 'runningThu', label: 'T' },
  { key: 'runningFri', label: 'F' },
  { key: 'runningSat', label: 'S' },
  { key: 'runningSun', label: 'S' },
] as const;

function extractQuotaCode(quota?: string): string {
  if (!quota) return 'GN';
  const match = quota.match(/\(([A-Z0-9]+)\)/i);
  if (match) return match[1].toUpperCase();
  return quota.trim().toUpperCase();
}

interface TrainCardProps {
  train: Train;
  index: number;
  selectedClass?: string;
  selectedQuota?: string;
  journeyDate?: string;
  fromStationCode?: string;
  toStationCode?: string;
  expandedClass: string | null;
  onToggleClass: (classCode: string | null) => void;
  onUpdateTrainAvailability?: (trainNumber: string, classCode: string, data: TrainAvailabilityData) => void;
  onNavigateToRunningStatus?: (trainNo: string, date?: string) => void;
  onOpenRoute: (train: Train) => void;
}

const TrainCard: React.FC<TrainCardProps> = ({
  train,
  selectedClass,
  selectedQuota,
  journeyDate,
  fromStationCode,
  toStationCode,
  expandedClass,
  onToggleClass,
  onUpdateTrainAvailability,
  onNavigateToRunningStatus,
  onOpenRoute,
}) => {
  const [cardQuota, setCardQuota] = useState<string>(selectedQuota || 'General (GN)');
  const [classStates, setClassStates] = useState<Record<string, ClassState>>(() => {
    const initial: Record<string, ClassState> = {};
    if (train.availability && typeof train.availability === 'object') {
      Object.entries(train.availability).forEach(([cls, rawAvail]) => {
        const avail = rawAvail as unknown as { days?: unknown[]; fetchedAt?: string } | undefined;
        if (avail && Array.isArray(avail.days) && avail.days.length > 0) {
          initial[cls] = {
            isLoading: false,
            error: null,
            data: rawAvail as unknown as TrainAvailabilityData,
            fetchedAt: avail.fetchedAt || new Date().toISOString(),
          };
        }
      });
    }
    return initial;
  });
  const currentRequestIdRef = useRef<Record<string, number>>({});

  /**
   * Lazily fetches seat availability for a single coach class on-demand
   */
  const fetchAvailabilityForClass = async (
    classCode: string,
    forceRefresh = false,
    quotaOverride?: string
  ) => {
    const activeQuota = quotaOverride || cardQuota || selectedQuota || 'General (GN)';
    // Check cached state - if already fetched and not forced refresh, reuse cache
    const existing = classStates[classCode];
    if (!forceRefresh && existing?.data && !existing.error) {
      console.log(`[TrainCard ${train.trainNumber}] Reusing cached availability for class ${classCode}`);
      return;
    }

    // Monotonic request counter to guard against race conditions
    const reqId = (currentRequestIdRef.current[classCode] || 0) + 1;
    currentRequestIdRef.current[classCode] = reqId;

    // Set loading state for this specific class
    setClassStates((prev) => ({
      ...prev,
      [classCode]: {
        isLoading: true,
        error: null,
        data: prev[classCode]?.data ?? null,
        fetchedAt: prev[classCode]?.fetchedAt,
      },
    }));

    try {
      const targetDate = toStandardYYYYMMDD(journeyDate || train.journeyDate);
      const payload: TrainAvailabilityRequestBody = {
        session_id: getSavedTrainSessionId() || '',
        train_number: train.trainNumber,
        from_code: train.fromStnCode || fromStationCode || '',
        to_code: train.toStnCode || toStationCode || '',
        journey_date: targetDate,
        travel_class: classCode,
        class_code: classCode,
        quota: extractQuotaCode(activeQuota),
        train_type: Array.isArray(train.trainType)
          ? train.trainType[0]
          : typeof train.trainType === 'string'
          ? train.trainType
          : '',
      };

      const result = await fetchTrainAvailability(payload);

      // Verify if this is still the active latest request
      if (currentRequestIdRef.current[classCode] === reqId) {
        setClassStates((prev) => ({
          ...prev,
          [classCode]: {
            isLoading: false,
            error: null,
            data: result,
            fetchedAt: result.fetchedAt || new Date().toISOString(),
          },
        }));

        onUpdateTrainAvailability?.(train.trainNumber, classCode, result);
      }
    } catch (err: unknown) {
      if (currentRequestIdRef.current[classCode] === reqId) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'Unable to fetch availability for this coach class.';
        setClassStates((prev) => ({
          ...prev,
          [classCode]: {
            isLoading: false,
            error: errorMsg,
            data: null,
            fetchedAt: undefined,
          },
        }));
      }
    }
  };

  const handleClassClick = (cls: string) => {
    if (expandedClass === cls) {
      // Toggle closed if clicking currently active class
      onToggleClass(null);
    } else {
      // Slide open with the clicked class and lazily fetch availability
      onToggleClass(cls);
      fetchAvailabilityForClass(cls);
    }
  };

  const handleQuotaChange = (newQuota: string) => {
    setCardQuota(newQuota);
    if (expandedClass) {
      fetchAvailabilityForClass(expandedClass, true, newQuota);
    }
  };

  const isExpanded = Boolean(expandedClass);

  return (
    <div
      id={`train-card-${train.trainNumber}`}
      className={`bg-white border rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 space-y-3 sm:space-y-4 ${
        isExpanded ? 'border-orange-300 ring-1 ring-orange-200/50' : 'border-slate-200 hover:border-orange-200'
      }`}
    >
      {/* Train Header: Name, Number, Running Days */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shrink-0 font-mono font-bold text-xs mt-0.5 sm:mt-0 shadow-xs shadow-orange-500/20">
            <TrainTrack className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-mono text-xs sm:text-sm font-bold text-orange-600 bg-gradient-to-r from-orange-50 to-amber-50 px-2 py-0.5 rounded-lg border border-orange-200/80">
                {train.trainNumber}
              </span>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                {train.trainName}
              </h3>
            </div>
            {/* Running Days - Compact ConfirmTkt style */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Runs On:</span>
              <div className="flex items-center gap-0.5 sm:gap-1">
                {daysMeta.map((day) => {
                  const isRunning = train[day.key as keyof Train] === 'Y';
                  return (
                    <span
                      key={day.key}
                      title={isRunning ? `Runs on ${day.label}` : `Does not run on ${day.label}`}
                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded text-[9px] sm:text-[10px] font-bold flex items-center justify-center select-none ${
                        isRunning
                          ? 'bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 font-extrabold border border-emerald-200/60'
                          : 'text-slate-300'
                      }`}
                    >
                      {day.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Train Type Badges & Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {/* IRCTC Train Route Action Button */}
          <button
            type="button"
            onClick={() => onOpenRoute(train)}
            className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/90 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95 hover:border-orange-300 hover:text-orange-700"
            title={`View complete route and timetable for ${train.trainNumber}`}
          >
            <Route className="w-3 h-3 text-orange-600" />
            <span>Route</span>
          </button>

          {onNavigateToRunningStatus && (
            <button
              type="button"
              onClick={() => onNavigateToRunningStatus(train.trainNumber, journeyDate)}
              className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
              title={`Check live running status for train ${train.trainNumber}`}
            >
              <Radio className="w-3 h-3 text-orange-500 animate-pulse" />
              <span>Spot Train</span>
            </button>
          )}

          {train.trainType && train.trainType.length > 0 &&
            train.trainType.map((type, tIdx) => (
              <span
                key={tIdx}
                className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 sm:py-1 bg-gradient-to-r from-slate-100 to-orange-50/50 text-slate-700 rounded-md border border-slate-200/60"
              >
                {type}
              </span>
            ))}
        </div>
      </div>

      {/* Route & Timing Progression Strip (ConfirmTkt Mobile Horizontal 3-Col) */}
      <div className="bg-slate-50/90 rounded-2xl p-3 sm:p-4 border border-slate-100">
        <div className="flex items-center justify-between gap-2">
          {/* Departure */}
          <div className="text-left shrink-0 min-w-[70px] sm:min-w-[90px]">
            <div className="text-lg sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight leading-none">
              {train.departureTime}
            </div>
            <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-700 mt-1">
              <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
              <span className="truncate">{train.fromStnCode}</span>
            </div>
          </div>

          {/* Duration & Route Line */}
          <div className="flex-1 flex flex-col items-center justify-center px-1 sm:px-4">
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-slate-500 mb-1">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{train.duration}</span>
            </div>
            <div className="w-full max-w-[160px] sm:max-w-[200px] flex items-center gap-1.5">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-orange-400 to-amber-400 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <div className="h-0.5 flex-1 bg-gradient-to-r from-amber-400 to-emerald-400 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium font-mono">
                {train.distance} km
              </span>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => onOpenRoute(train)}
                className="text-[10px] sm:text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer inline-flex items-center gap-0.5"
                title={`View route and halts for ${train.trainNumber}`}
              >
                <Route className="w-2.5 h-2.5" />
                <span>View Route</span>
              </button>
            </div>
          </div>

          {/* Arrival */}
          <div className="text-right shrink-0 min-w-[70px] sm:min-w-[90px]">
            <div className="text-lg sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight leading-none">
              {train.arrivalTime}
            </div>
            <div className="flex items-center justify-end gap-1 text-xs sm:text-sm font-bold text-slate-700 mt-1">
              <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="truncate">{train.toStnCode}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coach Class Selection Chips (ConfirmTkt Mobile & Desktop Style) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-orange-500" />
            Coach Classes
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Tap class to check live dates & fare
          </span>
        </div>

        {/* Scrollable Horizontal Class Strip for Mobile & Desktop */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
          {(() => {
            const sortedClasses = sortRailwayClasses(train.avlClasses ?? []);
            if (sortedClasses.length === 0) {
              return <span className="text-xs text-slate-400">No classes available</span>;
            }
            return sortedClasses.map((cls, cIdx) => {
              const isSelected = expandedClass === cls;
              const classState = classStates[cls];
              const isClassLoading = Boolean(classState?.isLoading);
              const classData = classState?.data || train.availability?.[cls];
              const fare = classData?.totalFare ?? classData?.baseFare;
              const firstDay = classData?.days?.[0];
              const firstStatus = firstDay?.status;

              return (
                <button
                  key={cIdx}
                  type="button"
                  id={`class-chip-${train.trainNumber}-${cls}`}
                  onClick={() => handleClassClick(cls)}
                  className={`group relative shrink-0 snap-start px-3 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer select-none border min-w-[84px] sm:min-w-[96px] ${
                    isSelected
                      ? 'bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white border-orange-600 ring-2 ring-orange-200/80 shadow-md shadow-orange-500/25 scale-[1.02]'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-orange-300 hover:bg-gradient-to-r hover:from-slate-50 hover:to-orange-50/30 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`font-mono text-xs font-black px-1.5 py-0.5 rounded-md ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-900 text-white'
                      }`}
                    >
                      {cls}
                    </span>
                    {isClassLoading ? (
                      <Loader2 className={`w-3 h-3 animate-spin ${isSelected ? 'text-white' : 'text-orange-500'}`} />
                    ) : isSelected ? (
                      <ChevronUp className="w-3.5 h-3.5 text-white/90" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                    )}
                  </div>

                  {/* Status / Fare line */}
                  {(typeof fare === 'number' && fare > 0) || firstStatus ? (
                    <div className="mt-1.5">
                      {typeof fare === 'number' && fare > 0 ? (
                        <div
                          className={`text-xs font-black font-mono flex items-center ${
                            isSelected ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          <IndianRupee className="w-2.5 h-2.5 -mr-0.5 opacity-80" />
                          {fare}
                        </div>
                      ) : firstStatus ? (
                        <div
                          className={`text-[10px] font-bold truncate max-w-[80px] ${
                            isSelected
                              ? 'text-white/90'
                              : firstStatus.toUpperCase().includes('AVAILABLE')
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {firstStatus}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* Dynamic Slide-Down Seat Availability Section (ConfirmTkt Style) */}
      {isExpanded && expandedClass && (
        <div className="pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <ClassAvailabilitySection
            train={train}
            selectedClass={selectedClass}
            selectedQuota={selectedQuota}
            quota={cardQuota}
            onQuotaChange={handleQuotaChange}
            activeClass={expandedClass}
            activeState={classStates[expandedClass]}
            classStatesMap={classStates}
            onSelectClass={(newClass) => {
              onToggleClass(newClass);
              fetchAvailabilityForClass(newClass);
            }}
            onRefresh={() => fetchAvailabilityForClass(expandedClass, true)}
            onClose={() => onToggleClass(null)}
          />
        </div>
      )}
    </div>
  );
};

export const TrainResultsList: React.FC<TrainResultsListProps> = ({
  trains,
  selectedClass,
  selectedQuota,
  journeyDate,
  fromStationCode,
  toStationCode,
  onUpdateTrainAvailability,
  onNavigateToRunningStatus,
}) => {
  // Track which train and class is currently expanded across the whole list (single accordion)
  const [activeSelection, setActiveSelection] = useState<{
    trainNumber: string;
    classCode: string;
  } | null>(null);

  // Train Route Modal State
  const [routeModalTrain, setRouteModalTrain] = useState<Train | null>(null);
  const [routeData, setRouteData] = useState<RunningStatusData | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Automatically ensure all trains in current result list have routes preloaded in background
  useEffect(() => {
    if (trains && trains.length > 0) {
      const cancelPreload = preloadRoutesForTrains(trains, journeyDate);
      return () => {
        cancelPreload();
      };
    }
  }, [trains, journeyDate]);

  const handleOpenRoute = async (targetTrain: Train) => {
    setRouteModalTrain(targetTrain);
    const targetDate = journeyDate || targetTrain.journeyDate;

    // 1. Instant check: If route is already preloaded in cache, open modal immediately with zero delay
    const cached = getCachedRoute(targetTrain.trainNumber, targetDate);
    if (cached) {
      setRouteData(cached);
      setIsRouteLoading(false);
      setRouteError(null);
      return;
    }

    // 2. Check if a background preloading request is currently in-flight
    const inFlight = getInFlightRoutePromise(targetTrain.trainNumber, targetDate);
    if (inFlight) {
      setIsRouteLoading(true);
      setRouteError(null);
      setRouteData(null);

      try {
        const data = await inFlight;
        setRouteData(data);
        setIsRouteLoading(false);
        setRouteError(null);
      } catch (err: unknown) {
        console.error('[TrainResultsList] In-flight route error:', err);
        const msg =
          err instanceof Error && err.message
            ? err.message
            : 'Unable to load train route. Please try again.';
        setRouteError(msg);
        setIsRouteLoading(false);
      }
      return;
    }

    // 3. Not cached and not in-flight: initiate fetch (e.g. if background preload failed or had not started)
    setIsRouteLoading(true);
    setRouteError(null);
    setRouteData(null);

    try {
      const data = await fetchRouteWithCache(targetTrain.trainNumber, targetDate);
      setRouteData(data);
      setIsRouteLoading(false);
      setRouteError(null);
    } catch (err: unknown) {
      console.error('[TrainResultsList] Route fetch error:', err);
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to load train route. Please try again.';
      setRouteError(msg);
      setIsRouteLoading(false);
    }
  };

  const handleRetryRoute = async () => {
    if (!routeModalTrain) return;
    setIsRouteLoading(true);
    setRouteError(null);

    const targetDate = journeyDate || routeModalTrain.journeyDate;
    try {
      const data = await fetchRouteWithCache(routeModalTrain.trainNumber, targetDate);
      setRouteData(data);
      setIsRouteLoading(false);
      setRouteError(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to load train route. Please try again.';
      setRouteError(msg);
      setIsRouteLoading(false);
    }
  };

  if (!trains || trains.length === 0) {
    return (
      <div
        id="no-trains-found"
        className="w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-xs animate-in fade-in"
      >
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
          <Compass className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No trains found for this route/date</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Try searching for an alternative date or nearby junction stations to find available direct trains.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" id="train-results-container">
      {/* Results Header Banner */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Available Trains ({trains.length})
          </h2>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Official IRCTC Schedule</span>
        </div>
      </div>

      {/* Train Cards List */}
      <div className="space-y-4">
        {trains.map((train, index) => {
          const isThisTrainActive = activeSelection?.trainNumber === train.trainNumber;
          const expandedClass = isThisTrainActive ? activeSelection.classCode : null;

          return (
            <TrainCard
              key={`${train.trainNumber}-${index}`}
              train={train}
              index={index}
              selectedClass={selectedClass}
              selectedQuota={selectedQuota}
              journeyDate={journeyDate}
              fromStationCode={fromStationCode}
              toStationCode={toStationCode}
              expandedClass={expandedClass}
              onToggleClass={(classCode) => {
                if (!classCode) {
                  setActiveSelection(null);
                } else {
                  setActiveSelection({
                    trainNumber: train.trainNumber,
                    classCode,
                  });
                }
              }}
              onUpdateTrainAvailability={onUpdateTrainAvailability}
              onNavigateToRunningStatus={onNavigateToRunningStatus}
              onOpenRoute={handleOpenRoute}
            />
          );
        })}
      </div>

      {/* IRCTC-style Train Route / Schedule Modal */}
      <TrainRouteModal
        open={Boolean(routeModalTrain)}
        onClose={() => setRouteModalTrain(null)}
        train={routeModalTrain}
        journeyDate={journeyDate || routeModalTrain?.journeyDate}
        routeData={routeData}
        isLoading={isRouteLoading}
        error={routeError}
        onRetry={handleRetryRoute}
      />
    </div>
  );
};

