import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Loader2,
  AlertCircle,
  Calendar,
  ArrowRight,
  Train,
  RefreshCw,
} from 'lucide-react';
import { TrainAutocomplete } from '../TrainAutocomplete';
import { CustomDatePicker } from '../CustomDatePicker';
import { BoardingStationSelect } from './BoardingStationSelect';
import { TrainScheduleRoute } from './TrainScheduleRoute';
import { TrainMasterItem } from '../../types/train';
import { TrainSchedule, ScheduleStation, RunningDays } from '../../types/chart';
import { arrTrainList } from '../../data/train_data';
import { getIndianRailwaysTodayString, getIndianRailwaysShiftedDate } from '../../utils/dateUtils';
import {
  getTrainSchedule,
  getCachedTrainSchedule,
  normalizeTrainNumber,
} from '../../services/trainService';
import { ChartApiError, prefetchTrainChart } from '../../services/chartApi';

interface ChartSearchCardProps {
  onSearch: (params: {
    trainNumber: string;
    journeyDate: string;
    boardingStation: string;
    schedule?: TrainSchedule | null;
  }) => void;
  isLoading: boolean;
  initialTrainNo?: string;
  initialDate?: string;
  initialStation?: string;
  onTrainChange?: (train: TrainMasterItem | null) => void;
}

export const ChartSearchCard: React.FC<ChartSearchCardProps> = ({
  onSearch,
  isLoading,
  initialTrainNo = '',
  initialDate = '',
  initialStation = '',
  onTrainChange,
}) => {
  const todayStr = getIndianRailwaysTodayString();
  // Allow past dates up to 4 days ago for trains that began journeys 2-3 days ago
  const minJourneyDateStr = useMemo(() => getIndianRailwaysShiftedDate(-4), []);

  // Helper to parse train number into TrainMasterItem from fast train_data.ts
  const findTrainByNumber = useCallback((no: string): TrainMasterItem | null => {
    if (!no) return null;
    const clean = no.trim();
    const match = arrTrainList.find(
      (raw: string) => raw.startsWith(clean + '-') || raw.startsWith(clean + ' ')
    );
    if (match) {
      const dashIdx = match.indexOf('-');
      return {
        trainNumber: clean,
        trainName: dashIdx !== -1 ? match.slice(dashIdx + 1).trim() : match.slice(clean.length).trim(),
        fullString: match,
      };
    }
    return {
      trainNumber: clean,
      trainName: `Train ${clean}`,
      fullString: `${clean} - Train ${clean}`,
    };
  }, []);

  const [selectedTrain, setSelectedTrain] = useState<TrainMasterItem | null>(() =>
    initialTrainNo ? findTrainByNumber(initialTrainNo) : null
  );

  const [journeyDate, setJourneyDate] = useState<string>(() => initialDate || todayStr);

  // Train Schedule State
  const [schedule, setSchedule] = useState<TrainSchedule | null>(() => {
    if (initialTrainNo) {
      return getCachedTrainSchedule(initialTrainNo) || null;
    }
    return null;
  });
  const [scheduleLoading, setScheduleLoading] = useState<boolean>(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Selected Boarding Station code
  const [selectedBoardingCode, setSelectedBoardingCode] = useState<string>(initialStation || '');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmittingWithPendingSchedule, setIsSubmittingWithPendingSchedule] = useState<boolean>(false);

  // Helper to extract station code & name consistently across API variations
  const getStationCode = useCallback((st: ScheduleStation): string => {
    return (st.station_code || st.code || '').toUpperCase();
  }, []);

  // Format running days (only show days where flag is true)
  const formatRunningDays = (days?: RunningDays): string => {
    if (!days) return 'All Days';
    const dayOrder: { key: keyof RunningDays; label: string }[] = [
      { key: 'mon', label: 'Mon' },
      { key: 'tue', label: 'Tue' },
      { key: 'wed', label: 'Wed' },
      { key: 'thu', label: 'Thu' },
      { key: 'fri', label: 'Fri' },
      { key: 'sat', label: 'Sat' },
      { key: 'sun', label: 'Sun' },
    ];
    const active = dayOrder.filter((d) => days[d.key]).map((d) => d.label);
    return active.length > 0 ? active.join(' ') : 'Special Run';
  };

  // Automatically select a valid boarding station from loaded schedule and prefetch chart
  const autoSelectBoardingStation = useCallback(
    (scheduleData: TrainSchedule, defaultStationCode?: string) => {
      const validBoarding = scheduleData.stations?.filter((st) => !st.boarding_disabled) || [];
      if (validBoarding.length > 0) {
        const matchDefault = defaultStationCode
          ? validBoarding.find(
              (st) => getStationCode(st) === defaultStationCode.toUpperCase()
            )
          : null;

        const codeToSelect = matchDefault ? getStationCode(matchDefault) : getStationCode(validBoarding[0]);
        setSelectedBoardingCode(codeToSelect);

        // Instantly prefetch chart vacancy data as soon as boarding station is determined!
        const trainNum = scheduleData.train_number || selectedTrain?.trainNumber;
        if (trainNum && codeToSelect && journeyDate) {
          prefetchTrainChart({
            train_number: trainNum,
            journey_date: journeyDate,
            boarding_station: codeToSelect,
          });
        }
      } else {
        setSelectedBoardingCode('');
      }
    },
    [getStationCode, selectedTrain, journeyDate]
  );

  // Handle station selection change with instant chart prefetch
  const handleBoardingStationChange = useCallback(
    (code: string) => {
      setSelectedBoardingCode(code);
      if (validationError) setValidationError(null);

      const trainNum = selectedTrain?.trainNumber?.trim();
      if (trainNum && code && journeyDate) {
        prefetchTrainChart({
          train_number: trainNum,
          journey_date: journeyDate,
          boarding_station: code,
        });
      }
    },
    [selectedTrain, journeyDate, validationError]
  );

  // Handle journey date change with instant chart prefetch
  const handleJourneyDateChange = useCallback(
    (newDate: string) => {
      setJourneyDate(newDate);
      if (validationError) setValidationError(null);

      const trainNum = selectedTrain?.trainNumber?.trim();
      if (trainNum && selectedBoardingCode && newDate) {
        prefetchTrainChart({
          train_number: trainNum,
          journey_date: newDate,
          boarding_station: selectedBoardingCode,
        });
      }
    },
    [selectedTrain, selectedBoardingCode, validationError]
  );

  // Fetch or retrieve train schedule using cached/deduplicated service
  const fetchScheduleForTrain = useCallback(
    async (trainNumber: string, defaultStationCode?: string) => {
      const cleanNum = normalizeTrainNumber(trainNumber);
      if (!cleanNum) {
        setSchedule(null);
        setScheduleError(null);
        return;
      }

      // Check cache first: if already loaded, set immediately (0ms perceived time)
      const cached = getCachedTrainSchedule(cleanNum);
      if (cached) {
        setSchedule(cached);
        setScheduleLoading(false);
        setScheduleError(null);
        autoSelectBoardingStation(cached, defaultStationCode);
        return;
      }

      setScheduleLoading(true);
      setScheduleError(null);
      setValidationError(null);

      try {
        const scheduleData = await getTrainSchedule(cleanNum);
        setSchedule(scheduleData);
        autoSelectBoardingStation(scheduleData, defaultStationCode);
      } catch (err: unknown) {
        console.error('[ChartSearchCard] Failed to fetch schedule:', err);
        setSchedule(null);
        setSelectedBoardingCode('');
        if (err instanceof ChartApiError) {
          setScheduleError(err.message);
        } else {
          setScheduleError('Unable to load train schedule. Please check the train number and retry.');
        }
      } finally {
        setScheduleLoading(false);
      }
    },
    [autoSelectBoardingStation]
  );

  // Trigger schedule fetch & prefetch when a train is selected
  const handleSelectTrain = useCallback(
    (train: TrainMasterItem | null) => {
      setSelectedTrain(train);
      setSelectedBoardingCode('');
      setSchedule(null);
      setScheduleError(null);
      setValidationError(null);

      // Clean up previous search/coach state in parent
      if (onTrainChange) {
        onTrainChange(train);
      }

      if (train?.trainNumber) {
        // As soon as the user selects a train from autocomplete: immediately start schedule request
        fetchScheduleForTrain(train.trainNumber, initialStation);
      }
    },
    [fetchScheduleForTrain, initialStation, onTrainChange]
  );

  // Sync external initial train number (URL mount)
  useEffect(() => {
    if (initialTrainNo) {
      const item = findTrainByNumber(initialTrainNo);
      setSelectedTrain(item);
      fetchScheduleForTrain(initialTrainNo, initialStation);
    }
  }, [initialTrainNo, findTrainByNumber, fetchScheduleForTrain, initialStation]);

  useEffect(() => {
    if (initialDate) {
      setJourneyDate(initialDate);
    }
  }, [initialDate]);

  // Intelligent Check Chart submit handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    const trainNo = selectedTrain?.trainNumber?.trim() || '';
    if (!trainNo) {
      setValidationError('Please select or enter a valid train number.');
      return;
    }

    if (!journeyDate) {
      setValidationError('Please select a journey date.');
      return;
    }

    // Case 1: Schedule is already loaded
    if (schedule && selectedBoardingCode) {
      onSearch({
        trainNumber: trainNo,
        journeyDate,
        boardingStation: selectedBoardingCode,
        schedule,
      });
      return;
    }

    // Case 2: Schedule is still loading in the background
    // Wait for the existing in-flight schedule promise without starting a second request
    if (scheduleLoading || !schedule) {
      setIsSubmittingWithPendingSchedule(true);
      try {
        const scheduleData = await getTrainSchedule(trainNo);
        setSchedule(scheduleData);

        let boardingCode = selectedBoardingCode;
        if (!boardingCode) {
          const validBoarding = scheduleData.stations?.filter((st) => !st.boarding_disabled) || [];
          if (validBoarding.length > 0) {
            boardingCode = getStationCode(validBoarding[0]);
            setSelectedBoardingCode(boardingCode);
          }
        }

        if (!boardingCode) {
          setValidationError('No boarding stations available for this train.');
          return;
        }

        onSearch({
          trainNumber: trainNo,
          journeyDate,
          boardingStation: boardingCode,
          schedule: scheduleData,
        });
      } catch (err) {
        console.error('[ChartSearchCard] Schedule fetch error on submit:', err);
        setValidationError('Unable to load train schedule. Please try again.');
      } finally {
        setIsSubmittingWithPendingSchedule(false);
      }
      return;
    }

    if (!selectedBoardingCode) {
      setValidationError('Please select a boarding station from the schedule.');
      return;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-4 sm:p-6 lg:p-7 relative z-20">
      {/* Background Accent subtle glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-orange-100/40 via-amber-50/20 to-transparent rounded-full blur-2xl pointer-events-none -z-10" />

      {/* Search Form: Train, Journey Date, and Boarding Station ALWAYS visible */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Primary 3 Input Controls Row (Directly matching IRCTC Chart Vacancy layout) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 items-start">
          {/* 1. Train Selector (Instant Search from dataset) */}
          <div className="md:col-span-5">
            <TrainAutocomplete
              id="chart-train-select"
              label="Train Number or Name"
              placeholder="Enter train number or name..."
              selectedTrain={selectedTrain}
              onSelectTrain={handleSelectTrain}
              disabled={isLoading || isSubmittingWithPendingSchedule}
            />
          </div>

          {/* 2. Journey Date */}
          <div className="md:col-span-3">
            <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 sm:mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-orange-500" />
                Journey Date
              </span>
              
            </label>
            <CustomDatePicker
              value={journeyDate}
              onChange={handleJourneyDateChange}
              minDate={minJourneyDateStr}
              allowPastDates={true}
              disabled={isLoading || isSubmittingWithPendingSchedule}
            />
          </div>

          {/* 3. Boarding Station Box: ALWAYS PRESENT IN THE FORM */}
          <div className="md:col-span-4">
            <BoardingStationSelect
              id="chart-boarding-station"
              selectedTrain={selectedTrain}
              schedule={schedule}
              scheduleLoading={scheduleLoading}
              selectedBoardingCode={selectedBoardingCode}
              journeyDate={journeyDate}
              onSelectStation={handleBoardingStationChange}
              disabled={isLoading || isSubmittingWithPendingSchedule}
            />
          </div>
        </div>

        {/* Schedule Error State with Retry */}
        {scheduleError && !scheduleLoading && selectedTrain && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-900 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <p className="font-bold">Failed to load schedule</p>
                <p className="text-rose-700">{scheduleError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchScheduleForTrain(selectedTrain.trainNumber, initialStation)}
              className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Train Route Summary & Schedule Stops (Visible once a train is chosen) */}
        {selectedTrain && (
          <div className="bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-orange-50/70 border border-orange-200/70 rounded-2xl p-3.5 sm:p-4 space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
                  <Train className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate">
                    {schedule?.train_name || selectedTrain.trainName} ({selectedTrain.trainNumber})
                  </h3>
                  {schedule ? (
                    <p className="text-[11px] font-semibold text-slate-700">
                      {(schedule.origin?.station_name || schedule.origin?.name || schedule.from?.station_name || schedule.from?.name || 'Origin')} (
                      {schedule.origin?.station_code || schedule.origin?.code || schedule.from?.station_code || schedule.from?.code || '--'}
                      ) →{' '}
                      {(schedule.destination?.station_name || schedule.destination?.name || schedule.to?.station_name || schedule.to?.name || 'Destination')} (
                      {schedule.destination?.station_code || schedule.destination?.code || schedule.to?.station_code || schedule.to?.code || '--'}
                      )
                    </p>
                  ) : scheduleLoading ? (
                    <p className="text-[11px] font-medium text-orange-700 flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                      Loading schedule details...
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Running Days Badge */}
              {schedule?.running_days && (
                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white/95 px-2.5 py-1 rounded-xl border border-orange-200 text-xs shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Runs:</span>
                  <span className="text-xs font-black text-orange-700">
                    {formatRunningDays(schedule.running_days)}
                  </span>
                </div>
              )}
            </div>

            {/* Complete Route Stops timeline / table */}
            {schedule?.stations && schedule.stations.length > 0 && (
              <TrainScheduleRoute
                stations={schedule.stations}
                selectedBoardingCode={selectedBoardingCode}
                onSelectBoardingStation={(code) => setSelectedBoardingCode(code)}
              />
            )}
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Submit Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isLoading || isSubmittingWithPendingSchedule || !selectedTrain}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98"
            id="btn-check-chart-status"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking Vacant Berths...</span>
              </>
            ) : isSubmittingWithPendingSchedule ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Preparing Chart...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Get Train Chart</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
