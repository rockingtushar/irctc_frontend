import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RunningStatusData } from '../types/runningStatus';
import { fetchRunningStatus, RunningStatusApiError, formatDateToDDMMMYYYY } from '../api/runningStatus';
import { RunningStatusSearchForm } from '../components/runningStatus/RunningStatusSearchForm';
import { LiveTrainTrackVisualizer } from '../components/runningStatus/LiveTrainTrackVisualizer';
import { getIndianRailwaysTodayString } from '../utils/dateUtils';
import {
  AlertCircle,
  Loader2,
  TrainTrack,
  Info,
  RotateCcw,
  Sparkles,
  Train,
} from 'lucide-react';

interface TrainRunningStatusPageProps {
  initialTrainNo?: string;
  initialDate?: string;
  onNavigateToBooking?: () => void;
}

/**
 * Validates whether a journey date is eligible for live NTES tracking.
 * NTES live running status is only available for trains running Today, Yesterday, or Tomorrow.
 * If the user searched a future date (e.g. 5 days ahead), fallback to Today to show live running status.
 */
function getValidLiveTrackingDate(inputDate?: string, todayISTStr?: string): {
  targetDate: string;
  isAdjustedFromFuture: boolean;
} {
  const today = todayISTStr ? new Date(todayISTStr) : new Date();
  today.setHours(0, 0, 0, 0);

  if (!inputDate) {
    return { targetDate: formatDateToDDMMMYYYY(today), isAdjustedFromFuture: false };
  }

  const parsed = new Date(inputDate);
  if (isNaN(parsed.getTime())) {
    return { targetDate: formatDateToDDMMMYYYY(today), isAdjustedFromFuture: false };
  }
  parsed.setHours(0, 0, 0, 0);

  const diffDays = Math.round((parsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // NTES live tracking is only available for trains within -3 to +1 days
  if (diffDays > 1 || diffDays < -3) {
    return { targetDate: formatDateToDDMMMYYYY(today), isAdjustedFromFuture: true };
  }

  return { targetDate: formatDateToDDMMMYYYY(parsed), isAdjustedFromFuture: false };
}

export const TrainRunningStatusPage: React.FC<TrainRunningStatusPageProps> = ({
  initialTrainNo,
  initialDate,
  onNavigateToBooking,
}) => {
  const [data, setData] = useState<RunningStatusData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [lastSearchedParams, setLastSearchedParams] = useState<{
    trainNo: string;
    date: string;
  } | null>(null);

  const resultsRef = useRef<HTMLDivElement | null>(null);

  const todayIST = getIndianRailwaysTodayString();

  // Clear any stale query parameters from previous sessions on initial mount if no initialTrainNo was passed
  useEffect(() => {
    if (!initialTrainNo && typeof window !== 'undefined' && window.location.search) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [initialTrainNo]);

  // If initialTrainNo was explicitly passed as a prop (e.g. from clicking "Spot Train" on a search result),
  // auto-search with valid live-tracking date
  useEffect(() => {
    if (initialTrainNo && /^\d{5}$/.test(initialTrainNo.trim())) {
      const { targetDate, isAdjustedFromFuture } = getValidLiveTrackingDate(initialDate, todayIST);
      if (isAdjustedFromFuture) {
        setNoticeMessage(
          `Showing today's live running status for Train ${initialTrainNo.trim()} (your searched travel date has not departed yet).`
        );
      } else {
        setNoticeMessage(null);
      }
      handleSearch(initialTrainNo.trim(), targetDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTrainNo]);

  const handleSearch = useCallback(
    async (trainNo: string, journeyDate: string, isSilentRefresh = false) => {
      if (!isSilentRefresh) {
        setIsLoading(true);
        setErrorMessage(null);
      } else {
        setIsRefreshing(true);
      }

      try {
        const result = await fetchRunningStatus({
          train_no: trainNo,
          journey_date: journeyDate,
        });

        setData(result);
        setLastSearchedParams({ trainNo, date: journeyDate });
        setErrorMessage(null);

        // Update URL query string without reloading page
        if (typeof window !== 'undefined') {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('train_no', trainNo);
          newUrl.searchParams.set('journey_date', journeyDate);
          window.history.replaceState({}, '', newUrl.toString());
        }

        // Scroll to results on first search
        if (!isSilentRefresh) {
          setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }
      } catch (err: unknown) {
        if (err instanceof RunningStatusApiError) {
          setErrorMessage(err.message);
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('An unexpected error occurred while fetching running status.');
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  const handleManualRefresh = () => {
    if (lastSearchedParams && !isLoading && !isRefreshing) {
      handleSearch(lastSearchedParams.trainNo, lastSearchedParams.date, true);
    }
  };

  return (
    <main className="flex-1 w-full px-2 py-3 sm:px-6 sm:py-6 lg:p-8 flex flex-col items-center justify-start min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-4xl space-y-4 sm:space-y-6">
        {/* Top Search Card - starts empty so user searches on their own */}
        <RunningStatusSearchForm
          onSearch={(no, d) => {
            setNoticeMessage(null);
            handleSearch(no, d);
          }}
          isLoading={isLoading}
          initialTrainNo={initialTrainNo || ''}
          initialDate={
            initialDate
              ? getValidLiveTrackingDate(initialDate, todayIST).targetDate
              : todayIST
          }
        />

        {/* Informational notice when redirected with future travel date */}
        {noticeMessage && (
          <div className="w-full bg-blue-50/90 border border-blue-200 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-2 text-blue-900 shadow-2xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{noticeMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setNoticeMessage(null)}
              className="text-blue-400 hover:text-blue-700 text-xs font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Alert Display */}
        {errorMessage && (
          <div
            id="running-status-error-banner"
            className="w-full bg-rose-50 border border-rose-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-rose-800 animate-in fade-in slide-in-from-top-2 duration-200 shadow-2xs"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs sm:text-sm leading-relaxed">
              <h4 className="font-bold text-rose-900 mb-0.5">
                Unable to retrieve running status
              </h4>
              <p>{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-600 font-bold text-xs cursor-pointer p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* In-flight Loading Indicator when first searching */}
        {isLoading && !data && (
          <div className="w-full bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm space-y-3">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">
              Fetching Live Train Running Status...
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Querying real-time railway station and arrival/departure signals for this journey.
            </p>
          </div>
        )}

        {/* Results Container */}
        <div ref={resultsRef} className="space-y-4 sm:space-y-6">
          {data && (
            <LiveTrainTrackVisualizer
              stations={data.stations}
              currentStation={data.current_station}
              trainNumber={data.train_number}
              trainName={data.train_name}
              journeyDate={data.journey_date}
              status={data.status}
              coachPositions={data.coach_position}
              onRefresh={handleManualRefresh}
              isRefreshing={isRefreshing}
            />
          )}
        </div>

        {/* Welcome State when user opens page before searching */}
        {!data && !isLoading && !errorMessage && (
          <div
            id="spot-your-train-welcome-card"
            className="w-full bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-xs space-y-3"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-50 border border-orange-200/80 flex items-center justify-center mx-auto text-orange-500">
              <Train className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                Spot Your Train Live
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Enter your 5-digit train number (e.g. 15132, 12555) or train name above, select your journey date, and tap <strong className="text-slate-700 font-semibold">Check Running Status</strong> to view real-time station halts, delays, and platform info.
              </p>
            </div>
          </div>
        )}

        {/* Informational Footer note */}
        {data && !isLoading && (
          <div className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center gap-3 text-slate-500 text-xs">
            <Info className="w-4 h-4 text-orange-500 shrink-0" />
            <span>
              Live running status is retrieved directly from railway servers with official station arrival and departure records.
            </span>
          </div>
        )}
      </div>
    </main>
  );
};
