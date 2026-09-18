import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { formatDateToDDMMMYYYY } from '../../api/runningStatus';
import { CustomDatePicker } from '../CustomDatePicker';
import { TrainAutocomplete } from '../TrainAutocomplete';
import { TrainMasterItem } from '../../types/train';
import { arrTrainList } from '../../data/train_data';
import { getIndianRailwaysTodayString, getIndianRailwaysShiftedDate } from '../../utils/dateUtils';

interface RunningStatusSearchFormProps {
  onSearch: (trainNo: string, journeyDate: string) => void;
  isLoading: boolean;
  initialTrainNo?: string;
  initialDate?: string;
}

export const RunningStatusSearchForm: React.FC<RunningStatusSearchFormProps> = ({
  onSearch,
  isLoading,
  initialTrainNo = '',
  initialDate = '',
}) => {
  // Always use official Indian Railways (IST) dates
  const todayStr = getIndianRailwaysTodayString();
  const yesterdayStr = getIndianRailwaysShiftedDate(-1);
  const tomorrowStr = getIndianRailwaysShiftedDate(1);

  // Parse initial train item from master list if possible
  const findTrainByNumber = (no: string): TrainMasterItem | null => {
    if (!no) return null;
    const clean = no.trim();
    const match = arrTrainList.find((raw: string) => raw.startsWith(clean + '-') || raw.startsWith(clean + ' '));
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
  };

  const [selectedTrain, setSelectedTrain] = useState<TrainMasterItem | null>(() =>
    initialTrainNo ? findTrainByNumber(initialTrainNo) : null
  );
  // Default to today's date in IST
  const [selectedDate, setSelectedDate] = useState(() => initialDate || todayStr);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync initial props if changed externally
  useEffect(() => {
    if (initialTrainNo) {
      const clean = initialTrainNo.trim().slice(0, 5);
      if (clean && (!selectedTrain || selectedTrain.trainNumber !== clean)) {
        setSelectedTrain(findTrainByNumber(clean));
      }
    } else {
      setSelectedTrain(null);
    }
  }, [initialTrainNo]);

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    } else {
      setSelectedDate(todayStr);
    }
  }, [initialDate, todayStr]);

  const handleTrainSelect = (train: TrainMasterItem | null) => {
    setSelectedTrain(train);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate submissions while loading

    if (!selectedTrain || !selectedTrain.trainNumber) {
      setValidationError('Please select or enter a 5-digit train number (e.g. 15132 or 12555).');
      return;
    }

    const cleanNo = selectedTrain.trainNumber.trim();
    if (!/^\d{5}$/.test(cleanNo)) {
      setValidationError('Train number must be a valid 5-digit number.');
      return;
    }

    const dateToUse = selectedDate || todayStr;
    setValidationError(null);
    const formattedDate = formatDateToDDMMMYYYY(dateToUse);
    onSearch(cleanNo, formattedDate);
  };

  return (
    <div
      id="running-status-search-card"
      className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 transition-all duration-200"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Form Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block animate-pulse" />
              Spot Your Train — Live Running Status
            </h2>
            <p className="text-xs text-slate-500">
              Live train running status & real-time delay updates
            </p>
          </div>

          
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-start">
          {/* Train Autocomplete Input (Col 1-7) */}
          <div className="md:col-span-7 space-y-1.5">
            <TrainAutocomplete
              id="train-autocomplete"
              label="Select Train"
              placeholder="Search by train number (e.g. 15132) or name..."
              selectedTrain={selectedTrain}
              onSelectTrain={handleTrainSelect}
              disabled={isLoading}
            />
          </div>

          {/* Journey Date Picker (Col 8-12) */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Journey Date <span className="text-orange-500">*</span>
            </label>

            <div className="flex flex-col gap-2">
              <CustomDatePicker
                value={selectedDate}
                onChange={(newD) => setSelectedDate(newD)}
                allowPastDates={true}
                disabled={isLoading}
              />

              {/* Quick Date Pills */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDate(yesterdayStr)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    selectedDate === yesterdayStr
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    selectedDate === todayStr
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(tomorrowStr)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    selectedDate === tomorrowStr
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Tomorrow
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold transition-all shadow-md shadow-orange-500/20 active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking Running Status...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Check Running Status</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
