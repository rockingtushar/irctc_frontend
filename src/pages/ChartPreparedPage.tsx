import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Armchair,
  Loader2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowDown,
  RefreshCw,
  Train,
  LayoutGrid,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ChartSearchCard } from '../components/chart/ChartSearchCard';
import { TrainChartHeader } from '../components/chart/TrainChartHeader';
import { CoachList } from '../components/chart/CoachList';
import { CoachBerthView } from '../components/chart/CoachBerthView';
import { HorizontalTrainRake } from '../components/chart/HorizontalTrainRake';
import {
  ChartTrainData,
  ChartCoachData,
  CoachSummary,
} from '../types/chart';
import {
  getTrainChart,
  getCoachChart,
  prefetchTrainChart,
  ChartApiError,
} from '../services/chartApi';
import { prefetchTrainSchedule } from '../services/trainService';
import { TrainMasterItem } from '../types/train';

interface ChartPreparedPageProps {
  initialTrainNo?: string;
  initialDate?: string;
  initialStation?: string;
}

export const ChartPreparedPage: React.FC<ChartPreparedPageProps> = ({
  initialTrainNo = '',
  initialDate = '',
  initialStation = '',
}) => {
  // Read any query params from window URL (supporting ?train=, ?train_no=, ?train_number=)
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlTrainNo =
    searchParams?.get('train') ||
    searchParams?.get('train_no') ||
    searchParams?.get('train_number') ||
    searchParams?.get('trainNo') ||
    initialTrainNo;
  const urlDate = searchParams?.get('date') || searchParams?.get('journey_date') || initialDate;
  const urlStation = searchParams?.get('station') || searchParams?.get('boarding_station') || initialStation;

  // Route-mount schedule & chart prefetch: as early as possible after page initializes
  useEffect(() => {
    if (urlTrainNo) {
      prefetchTrainSchedule(urlTrainNo);
      if (urlDate && urlStation) {
        prefetchTrainChart({
          train_number: urlTrainNo,
          journey_date: urlDate,
          boarding_station: urlStation,
        });
      }
    }
  }, [urlTrainNo, urlDate, urlStation]);

  // Primary States
  const [trainLoading, setTrainLoading] = useState<boolean>(false);
  const [trainData, setTrainData] = useState<ChartTrainData | null>(null);
  const [selectedCoachName, setSelectedCoachName] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState<boolean>(false);
  const [activeCoachData, setActiveCoachData] = useState<ChartCoachData | null>(null);
  const [coachCache, setCoachCache] = useState<Record<string, ChartCoachData>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'rake' | 'grid'>('rake');
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);

  // Handle train change from search card: clear previous coach and chart state without wiping schedule cache
  const handleTrainChange = useCallback((_newTrain: TrainMasterItem | null) => {
    setTrainData(null);
    setSelectedCoachName(null);
    setActiveCoachData(null);
    setCoachCache({});
    setErrorMessage(null);
    setIsSearchExpanded(false);
  }, []);

  // Auto-scroll refs
  const trainResultsRef = useRef<HTMLDivElement | null>(null);
  const coachBerthsRef = useRef<HTMLDivElement | null>(null);

  // Fetch Train Composition & Vacancy Summary
  const handleTrainSearch = useCallback(
    async ({
      trainNumber,
      journeyDate,
      boardingStation,
    }: {
      trainNumber: string;
      journeyDate: string;
      boardingStation: string;
    }) => {
      setTrainLoading(true);
      setErrorMessage(null);
      setSelectedCoachName(null);
      setActiveCoachData(null);
      setCoachCache({});

      try {
        const data = await getTrainChart({
          train_number: trainNumber,
          journey_date: journeyDate,
          boarding_station: boardingStation,
        });

        setTrainData(data);
        setIsSearchExpanded(false);

        // Smooth scroll to train results
        setTimeout(() => {
          trainResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);

        // If coaches are available, automatically select the first coach with vacant berths (or first coach)
        if (data.coaches && data.coaches.length > 0) {
          const preferredCoach =
            data.coaches.find((c) => (c.vacant_berths || 0) > 0) || data.coaches[0];
          if (preferredCoach) {
            handleCoachSelect(preferredCoach, data);
          }
        }
      } catch (err: unknown) {
        console.error('[ChartPreparedPage] Failed to fetch train chart:', err);
        setTrainData(null);
        if (err instanceof ChartApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Unable to fetch chart information. Please verify your details and try again.');
        }
      } finally {
        setTrainLoading(false);
      }
    },
    []
  );

  // Fetch Specific Coach Berth Composition
  const handleCoachSelect = useCallback(
    async (coach: CoachSummary, currentTrainData?: ChartTrainData | null) => {
      const train = currentTrainData || trainData;
      if (!train) return;

      setSelectedCoachName(coach.coach_name);
      setErrorMessage(null);

      // Check client-side memory cache first for high performance
      if (coachCache[coach.coach_name]) {
        setActiveCoachData(coachCache[coach.coach_name]);
        setTimeout(() => {
          coachBerthsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        return;
      }

      setCoachLoading(true);
      try {
        const coachResult = await getCoachChart({
          train_number: train.train_number,
          journey_date: train.train_start_date || '',
          boarding_station: train.remote || train.from,
          remote_station: train.remote || train.from,
          train_source_station: train.from,
          travel_class: coach.class_code,
          coach: coach.coach_name,
        });

        // Store in cache
        setCoachCache((prev) => ({
          ...prev,
          [coach.coach_name]: coachResult,
        }));

        setActiveCoachData(coachResult);

        // Smooth scroll to berth layout
        setTimeout(() => {
          coachBerthsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
      } catch (err: unknown) {
        console.error('[ChartPreparedPage] Failed to fetch coach chart:', err);
        if (err instanceof ChartApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage(`Unable to fetch berth layout for coach ${coach.coach_name}.`);
        }
      } finally {
        setCoachLoading(false);
      }
    },
    [trainData, coachCache]
  );

  // Trigger search on mount only if train and station are explicitly provided in URL
  useEffect(() => {
    if (urlTrainNo && urlStation && /^\d{4,5}$/.test(urlTrainNo.trim())) {
      handleTrainSearch({
        trainNumber: urlTrainNo.trim(),
        journeyDate: urlDate || new Date().toISOString().slice(0, 10),
        boardingStation: urlStation.trim().toUpperCase(),
      });
    }
  }, []);

  return (
    <main className="flex-1 w-full px-3 py-3 sm:px-6 sm:py-5 lg:px-8 flex flex-col items-center justify-start min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-6xl space-y-3 sm:space-y-4">
        {/* Page Header - only full when no results yet */}
        {!trainData ? (
          <div className="text-center sm:text-left space-y-1.5">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="p-2 rounded-2xl bg-orange-100 text-orange-600">
                <Armchair className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Chart Prepared &amp; Vacant Berths
              </h1>
            </div>
            <p className="text-sm text-slate-600 max-w-2xl">
              View vacant berth counts, coach layout, and station-by-station segment occupancy after IRCTC chart preparation.
            </p>
          </div>
        ) : null}

        {/* Search Strip / Card */}
        {trainData && !isSearchExpanded ? (
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2 shadow-2xs">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="font-black text-slate-900 flex items-center gap-1.5">
                <Train className="w-3.5 h-3.5 text-orange-500" />
                {trainData.train_number} - {trainData.train_name}
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-slate-600 font-medium">
                Date: <strong className="text-slate-800">{trainData.journey_date}</strong>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-slate-600 font-medium">
                Boarding: <strong className="text-slate-800">{trainData.boarding_station}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsSearchExpanded(true)}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Search className="w-3 h-3" />
              <span>Modify Search</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {trainData && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSearchExpanded(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer py-0.5 px-2 rounded-md hover:bg-slate-100"
                >
                  <span>Close / Keep Current Results ✕</span>
                </button>
              </div>
            )}
            <ChartSearchCard
              onSearch={handleTrainSearch}
              isLoading={trainLoading}
              initialTrainNo={urlTrainNo}
              initialDate={urlDate}
              initialStation={urlStation}
              onTrainChange={handleTrainChange}
            />
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl shadow-xs"
          >
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <p className="font-bold">Error fetching chart</p>
              <p className="text-rose-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Loading Spinner Skeleton for Train Composition */}
        {trainLoading && (
          <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">Fetching chart information...</p>
              <p className="text-xs text-slate-500">Checking coach composition &amp; berth vacancies from IRCTC online charts</p>
            </div>
          </div>
        )}

        {/* Train Composition & Coaches Section */}
        {trainData && (
          <div ref={trainResultsRef} className="space-y-3 sm:space-y-4 animate-in fade-in duration-200">
            {/* Train & Chart Information */}
            <TrainChartHeader data={trainData} />

            {/* View Mode Switcher */}
            {trainData.coaches && trainData.coaches.length > 0 && (
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Layout:
                  </span>
                  <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setViewMode('rake')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        viewMode === 'rake'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Train className="w-3 h-3 text-orange-400" />
                      <span>Train Rake</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        viewMode === 'grid'
                          ? 'bg-white text-orange-600 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="w-3 h-3" />
                      <span>Grid View</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* View 1: Authentic Horizontal Train Rake with Collapsible Raw Coach Layout */}
            {trainData.coaches && trainData.coaches.length > 0 ? (
              viewMode === 'rake' ? (
                <HorizontalTrainRake
                  trainNumber={trainData.train_number}
                  trainName={trainData.train_name}
                  fromStation={trainData.from}
                  toStation={trainData.to}
                  coaches={trainData.coaches}
                  selectedCoach={selectedCoachName}
                  onSelectCoach={(coach) => handleCoachSelect(coach)}
                  isLoadingCoach={coachLoading}
                  loadingCoachName={selectedCoachName}
                  activeCoachData={activeCoachData}
                />
              ) : (
                /* View 2: Traditional Grid View */
                <>
                  <CoachList
                    coaches={trainData.coaches}
                    selectedCoach={selectedCoachName}
                    onSelectCoach={(coach) => handleCoachSelect(coach)}
                    isLoadingCoach={coachLoading}
                    loadingCoachName={selectedCoachName}
                  />

                  {/* Selected Coach Berth Layout Section for Grid View */}
                  <div ref={coachBerthsRef}>
                    {coachLoading ? (
                      <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3 text-center">
                        <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800">
                            Loading berth layout for Coach {selectedCoachName}...
                          </p>
                          <p className="text-xs text-slate-500">Fetching individual berths and segment occupancies</p>
                        </div>
                      </div>
                    ) : activeCoachData ? (
                      activeCoachData.berths && activeCoachData.berths.length > 0 ? (
                        <CoachBerthView coachData={activeCoachData} />
                      ) : (
                        <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center text-sm font-semibold text-slate-700">
                          Berth information is not available for this coach.
                        </div>
                      )
                    ) : null}
                  </div>
                </>
              )
            ) : (
              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 text-center text-sm font-semibold text-amber-900">
                No coach information is available for this train/date. Charts may still be in preparation.
              </div>
            )}
          </div>
        )}

        {/* Informational Guidance Cards */}
        {trainData ? (
          <details className="group pt-2 text-xs">
            <summary className="cursor-pointer font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 py-1 select-none">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>IRCTC Chart Preparation Timelines &amp; Information</span>
              <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2.5">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>When are Charts Prepared?</span>
                </div>
                <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
                  <p>
                    <strong className="text-slate-800">5:00 AM – 2:00 PM Trains:</strong> 1st chart is prepared by 8:00 PM the previous evening.
                  </p>
                  <p>
                    <strong className="text-slate-800">Other Times (after 2 PM / before 5 AM):</strong> 1st chart is prepared 10 hours before departure.
                  </p>
                  <p>
                    <strong className="text-slate-800">Final (2nd) Chart:</strong> Prepared 30 mins before departure for last-minute updates &amp; current bookings.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Station Segment Breakdown</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A berth can be partially occupied (e.g. NDLS to PRYJ) and vacant thereafter (PRYJ to BNRS). Inspect each berth to see segment splits.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <HelpCircle className="w-4 h-4 text-blue-500" />
                  <span>Current Booking at Station</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Vacant berths after chart preparation can be booked under Current Reservation Counters or IRCTC Current Booking till train departure.
                </p>
              </div>
            </div>
          </details>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>When are Charts Prepared?</span>
              </div>
              <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
                <p>
                  <strong className="text-slate-800">5:00 AM – 2:00 PM Trains:</strong> 1st chart is prepared by 8:00 PM the previous evening.
                </p>
                <p>
                  <strong className="text-slate-800">Other Times (after 2 PM / before 5 AM):</strong> 1st chart is prepared 10 hours before departure.
                </p>
                <p>
                  <strong className="text-slate-800">Final (2nd) Chart:</strong> Prepared 30 mins before departure for last-minute updates &amp; current bookings.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Station Segment Breakdown</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                A berth can be partially occupied (e.g. NDLS to PRYJ) and vacant thereafter (PRYJ to BNRS). Inspect each berth to see segment splits.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                <span>Current Booking at Station</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Vacant berths after chart preparation can be booked under Current Reservation Counters or IRCTC Current Booking till train departure.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
