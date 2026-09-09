import React, { useState, useId, useRef, useEffect, useCallback } from 'react';
import { Station, TrainSearchParams, Train, TrainAvailabilityData, ClassAvailability } from '../types/station';
import { StationAutocomplete } from './StationAutocomplete';
import { useStations } from '../context/StationsContext';
import { CaptchaModal } from './CaptchaModal';
import { TrainResultsList } from './TrainResultsList';
import {
  searchTrains,
  getSavedTrainSessionId,
  clearTrainSessionId,
  SessionExpiredError,
  InvalidCaptchaError,
} from '../api/trains';
import {
  loadSavedSearchState,
  saveSearchState,
  getRecentSearches,
  addRecentSearch,
  addRecentStation,
  clearRecentSearches,
  removeRecentSearch,
  RecentSearchItem,
} from '../utils/searchStorage';
import { 
  ArrowLeftRight, 
  Search, 
  AlertCircle, 
  Loader2,
  History,
  RotateCcw,
  X,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { CustomDatePicker } from './CustomDatePicker';
import { TravelUtilities } from './TravelUtilities';

interface TrainSearchFormProps {
  onSearch?: (params: TrainSearchParams) => void;
}

export const TrainSearchForm: React.FC<TrainSearchFormProps> = ({ onSearch }) => {
  const fromInputId = useId();
  const toInputId = useId();

  const { isLoading } = useStations();

  // Ref for auto-scrolling smoothly to results list
  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Helper date generators
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFutureDateString = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
    } catch (_) {}
    return dateStr;
  };

  const todayStr = getTodayString();

  // Initialize all states from localStorage (ConfirmTkt Persistence)
  const [savedState] = useState(() => loadSavedSearchState());

  const [fromStation, setFromStation] = useState<Station | null>(() => savedState?.fromStation || null);
  const [toStation, setToStation] = useState<Station | null>(() => savedState?.toStation || null);
  const [journeyDate, setJourneyDate] = useState<string>(() => {
    if (savedState?.journeyDate && savedState.journeyDate >= todayStr) {
      return savedState.journeyDate;
    }
    return todayStr;
  });
  const [travelClass, setTravelClass] = useState<string>(() => savedState?.travelClass || 'All Classes');
  const [quota, setQuota] = useState<string>(() => savedState?.quota || 'General (GN)');

  // Train Search & CAPTCHA states restored from storage
  const [trains, setTrains] = useState<Train[]>(() => savedState?.trains || []);
  const [hasSearched, setHasSearched] = useState<boolean>(() => Boolean(savedState?.hasSearched && savedState?.trains?.length));
  const [isCaptchaOpen, setIsCaptchaOpen] = useState<boolean>(false);
  const [isDirectSearching, setIsDirectSearching] = useState<boolean>(false);
  const [activeRouteKey, setActiveRouteKey] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchCount, setSearchCount] = useState<number>(0);

  // Recent Searches History
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(() => getRecentSearches());

  // Animation state for swap button
  const [isSwapping, setIsSwapping] = useState<boolean>(false);

  // Smooth scroll down to train results list (works every time, first time or repeated search)
  const scrollToResults = useCallback(() => {
    setTimeout(() => {
      const el = resultsRef.current || document.getElementById('train-results-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  }, []);

  // Trigger scroll whenever search count increments (active user search only, not on initial refresh)
  useEffect(() => {
    if (searchCount > 0 && hasSearched) {
      scrollToResults();
    }
  }, [searchCount, hasSearched, scrollToResults]);

  // Automatically persist search state whenever key fields update
  useEffect(() => {
    saveSearchState({
      fromStation,
      toStation,
      journeyDate,
      travelClass,
      quota,
      trains,
      hasSearched,
    });
  }, [fromStation, toStation, journeyDate, travelClass, quota, trains, hasSearched]);

  // Format date helper for recent searches display (e.g. "31 Aug")
  const formatShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Validation
  const isSameStation = Boolean(
    fromStation && toStation && fromStation.code.trim().toUpperCase() === toStation.code.trim().toUpperCase()
  );

  const isFormValid = Boolean(
    fromStation &&
    toStation &&
    journeyDate &&
    !isSameStation &&
    !isLoading
  );

  // Swap From & To station objects
  const handleSwap = () => {
    setIsSwapping(true);
    setTimeout(() => setIsSwapping(false), 300);

    const prevFrom = fromStation;
    const prevTo = toStation;
    setFromStation(prevTo);
    setToStation(prevFrom);
  };

  // Reset form and clear results
  const handleResetForm = () => {
    setFromStation(null);
    setToStation(null);
    setJourneyDate(todayStr);
    setTravelClass('All Classes');
    setQuota('General (GN)');
    setTrains([]);
    setHasSearched(false);
    setSearchError(null);
  };

  // Core Search Execution for Submit, Recent Search, & Popular Routes
  const executeSearch = async (
    targetFrom: Station,
    targetTo: Station,
    targetDate: string = journeyDate,
    targetClass: string = travelClass,
    targetQuota: string = quota
  ) => {
    if (isDirectSearching) return;
    if (targetFrom.code.trim().toUpperCase() === targetTo.code.trim().toUpperCase()) {
      setSearchError("Origin and Destination stations cannot be identical. Please choose distinct stations.");
      return;
    }

    setFromStation(targetFrom);
    setToStation(targetTo);
    setJourneyDate(targetDate);
    setTravelClass(targetClass);
    setQuota(targetQuota);
    setSearchError(null);

    const payload: TrainSearchParams = {
      fromCode: targetFrom.code,
      fromName: targetFrom.name,
      toCode: targetTo.code,
      toName: targetTo.name,
      date: targetDate,
      travelClass: targetClass,
      quota: targetQuota,
    };

    if (onSearch) {
      onSearch(payload);
    }

    // Save to ConfirmTkt Recent Searches & Recent Stations
    const updatedRecents = addRecentSearch(targetFrom, targetTo, targetDate, targetClass, targetQuota);
    addRecentStation(targetFrom);
    addRecentStation(targetTo);
    setRecentSearches(updatedRecents);

    // Check if we have an existing Indian Railways session
    const existingSession = getSavedTrainSessionId();

    if (existingSession) {
      // Reuse existing session without captcha (captcha_answer = null)
      setIsDirectSearching(true);

      try {
        const resultTrains = await searchTrains({
          session_id: existingSession,
          captcha_answer: null,
          from_code: targetFrom.code,
          from_name: targetFrom.name,
          to_code: targetTo.code,
          to_name: targetTo.name,
          journey_date: targetDate,
          travel_class: targetClass,
          quota: targetQuota,
        });

        setTrains(resultTrains);
        setHasSearched(true);
        setIsDirectSearching(false);
        setSearchCount((c) => c + 1);
        scrollToResults();
        return;
      } catch (err: unknown) {
        setIsDirectSearching(false);

        if (err instanceof SessionExpiredError || err instanceof InvalidCaptchaError) {
          // Session expired or captcha required: open modal to solve captcha
          clearTrainSessionId();
          setIsCaptchaOpen(true);
          return;
        }

        console.warn('[TrainSearchForm] Direct search failed, opening CAPTCHA:', err);
        setIsCaptchaOpen(true);
      }
    } else {
      // First search: Open CAPTCHA Modal
      setIsCaptchaOpen(true);
    }
  };

  // Submit search with Session reuse and CAPTCHA fallback
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isFormValid || !fromStation || !toStation || isDirectSearching) return;
    executeSearch(fromStation, toStation, journeyDate, travelClass, quota);
  };

  const handleSearchSuccess = (resultTrains: Train[]) => {
    setTrains(resultTrains);
    setHasSearched(true);
    setSearchCount((c) => c + 1);
    scrollToResults();
    if (fromStation && toStation) {
      const updatedRecents = addRecentSearch(fromStation, toStation, journeyDate, travelClass, quota);
      addRecentStation(fromStation);
      addRecentStation(toStation);
      setRecentSearches(updatedRecents);
    }
  };

  // Handler to cache availability inside the train object and auto-persist
  const handleUpdateTrainAvailability = useCallback((trainNumber: string, classCode: string, data: TrainAvailabilityData) => {
    setTrains((prev) =>
      prev.map((t) => {
        if (t.trainNumber === trainNumber) {
          return {
            ...t,
            availability: {
              ...(t.availability || {}),
              [classCode]: data as unknown as ClassAvailability,
            },
          };
        }
        return t;
      })
    );
  }, []);

  // Quick tap on recent search chip (instantly searches)
  const handleSelectRecentSearch = (item: RecentSearchItem) => {
    const dateToUse = item.journeyDate && item.journeyDate >= todayStr ? item.journeyDate : todayStr;
    const classToUse = item.travelClass || 'All Classes';
    const quotaToUse = item.quota || 'General (GN)';
    executeSearch(item.fromStation, item.toStation, dateToUse, classToUse, quotaToUse);
  };

  // Quick select popular route (instantly searches)
  const handleSelectPopularRoute = (from: Station, to: Station) => {
    setActiveRouteKey(`${from.code}-${to.code}`);
    executeSearch(from, to, journeyDate, travelClass, quota);
  };

  return (
    <div className="space-y-3 sm:space-y-6 w-full overflow-visible relative z-0">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg shadow-orange-500/5 border border-slate-200/90 p-4 sm:p-6 md:p-8 flex flex-col justify-between relative overflow-visible z-10" id="train-search-card">
        {/* Top Gradient Decorative Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-t-2xl sm:rounded-t-3xl" />

        <div>
          {/* Bento Card Title Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-5 pt-1">
            <div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-800">
                Search Your Trains Ticket
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Live IRCTC Train Search with seat availability & instant confirmation
              </p>
            </div>

            {hasSearched && (
              <button
                type="button"
                id="btn-reset-search"
                onClick={handleResetForm}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-slate-700 hover:text-orange-700 bg-gradient-to-r from-slate-100 to-orange-50/60 hover:from-slate-200 hover:to-orange-100 border border-slate-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Start a new fresh search"
              >
                <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500" />
                <span>New Search</span>
              </button>
            )}
          </div>

          {/* ConfirmTkt Recent Searches Quick Chips */}
          {recentSearches.length > 0 && (
            <div className="mb-2.5 pb-2 sm:mb-4 sm:pb-3 border-b border-slate-100" id="recent-searches-section">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <History className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500" />
                  <span>Recent Searches</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearRecentSearches();
                    setRecentSearches([]);
                  }}
                  className="text-[10px] sm:text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>

              {/* Horizontal Scrollable Recent Searches Strip */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
                {recentSearches.map((item) => (
                  <div
                    key={item.id}
                    className="group shrink-0 flex items-center bg-gradient-to-r from-slate-50 to-orange-50/30 hover:from-orange-50 hover:to-amber-50/60 border border-slate-200 hover:border-orange-300 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 transition-all text-xs cursor-pointer shadow-2xs hover:shadow-xs"
                    onClick={() => handleSelectRecentSearch(item)}
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className="font-bold text-slate-800 group-hover:text-orange-600">
                        {item.fromStation.code}
                      </span>
                      <ArrowLeftRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 group-hover:text-orange-500" />
                      <span className="font-bold text-slate-800 group-hover:text-orange-600">
                        {item.toStation.code}
                      </span>
                    </div>

                    <span className="text-slate-300 mx-1 sm:mx-1.5">|</span>

                    <span className="text-[10px] sm:text-[11px] font-medium text-slate-500">
                      {formatShortDate(item.journeyDate)}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = removeRecentSearch(item.id);
                        setRecentSearches(updated);
                      }}
                      className="ml-1 sm:ml-1.5 -mr-0.5 p-0.5 text-slate-400 hover:text-rose-500 rounded-full transition-colors cursor-pointer"
                      title="Remove from history"
                    >
                      <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-5" id="train-search-form">
            {/* Same Station Validation Error Alert */}
            {isSameStation && (
              <div
                id="same-station-error"
                role="alert"
                className="p-2.5 sm:p-3 bg-rose-50 border border-rose-200 rounded-xl sm:rounded-2xl flex items-center gap-2 text-rose-700 text-xs sm:text-sm font-medium animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Origin and Destination stations cannot be identical. Please choose distinct stations.</span>
              </div>
            )}

            {/* General Search Error Alert */}
            {searchError && (
              <div
                role="alert"
                className="p-2.5 sm:p-3 bg-rose-50 border border-rose-200 rounded-xl sm:rounded-2xl flex items-center gap-2 text-rose-700 text-xs sm:text-sm font-medium animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Station Selectors Row (From ⇄ To) with responsive swap button */}
            <div className="relative z-30 flex flex-col md:flex-row gap-1 sm:gap-3 md:gap-4 items-center">
              {/* FROM Station */}
              <div className="flex-1 w-full relative z-40">
                <StationAutocomplete
                  id={fromInputId}
                  label="From Station"
                  placeholder="Enter origin station or code..."
                  selectedStation={fromStation}
                  onSelectStation={setFromStation}
                  disabled={isLoading || isDirectSearching}
                />
              </div>

              {/* Circular Swap Button */}
              <button
                type="button"
                id="btn-swap-stations"
                onClick={handleSwap}
                disabled={isLoading || isDirectSearching || (!fromStation && !toStation)}
                title="Swap Origin and Destination"
                aria-label="Swap From and To stations"
                className={`z-30 -my-3 md:my-0 md:-mx-3 md:mt-5 p-1.5 sm:p-2.5 md:p-3 bg-white border-2 border-slate-100 rounded-full shadow-md text-orange-500 hover:scale-110 active:scale-95 transition-all shrink-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                  isSwapping ? 'rotate-180' : 'rotate-0'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              </button>

              {/* TO Station */}
              <div className="flex-1 w-full relative z-30">
                <StationAutocomplete
                  id={toInputId}
                  label="To Station"
                  placeholder="Enter destination station or code..."
                  selectedStation={toStation}
                  onSelectStation={setToStation}
                  disabled={isLoading || isDirectSearching}
                />
              </div>
            </div>

            {/* Date, Class, & Quota Row (2-col on mobile, 3-col on desktop) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 pt-0.5 relative z-20">
              {/* Journey Date */}
              <div className="col-span-2 sm:col-span-1 relative z-30">
                <div className="flex items-center justify-between mb-1">
                  <span className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Travel Date
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isDirectSearching}
                      onClick={(e) => {
                        e.stopPropagation();
                        setJourneyDate(todayStr);
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                        journeyDate === todayStr ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-xs shadow-orange-500/20' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      disabled={isDirectSearching}
                      onClick={(e) => {
                        e.stopPropagation();
                        setJourneyDate(getFutureDateString(1));
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                        journeyDate === getFutureDateString(1) ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-xs shadow-orange-500/20' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Tmrw
                    </button>
                  </div>
                </div>
                <CustomDatePicker
                  value={journeyDate}
                  onChange={setJourneyDate}
                  minDate={todayStr}
                  disabled={isDirectSearching}
                />
              </div>

              {/* Travel Class */}
              <div className="col-span-1 relative z-10">
                <label htmlFor="travel-class-select" className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Class
                </label>
                <select
                  id="travel-class-select"
                  value={travelClass}
                  disabled={isDirectSearching}
                  onChange={(e) => setTravelClass(e.target.value)}
                  className="w-full px-2.5 sm:px-3.5 py-2 sm:py-3 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl focus:border-orange-500 focus:bg-white focus:outline-none text-xs sm:text-sm font-semibold text-slate-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  <option value="All Classes">All Classes</option>
                  <option value="Second Sitting (2S)">Second Sitting (2S)</option>
                  <option value="Sleeper (SL)">Sleeper (SL)</option>
                  <option value="AC Chair Car (CC)">Chair Car (CC)</option>
                  <option value="AC 3 Economy (3E)">AC 3 Econ (3E)</option>
                  <option value="AC 3 Tier (3A)">AC 3 Tier (3A)</option>
                  <option value="AC 2 Tier (2A)">AC 2 Tier (2A)</option>
                  <option value="AC First Class (1A)">AC First (1A)</option>
                  <option value="Executive Anubhuti (EA)">Executive (EA)</option>
                </select>
              </div>

              {/* Quota */}
              <div className="col-span-1 relative z-10">
                <label htmlFor="quota-select" className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Quota
                </label>
                <select
                  id="quota-select"
                  value={quota}
                  disabled={isDirectSearching}
                  onChange={(e) => setQuota(e.target.value)}
                  className="w-full px-2.5 sm:px-3.5 py-2 sm:py-3 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl focus:border-orange-500 focus:bg-white focus:outline-none text-xs sm:text-sm font-semibold text-slate-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  <option value="General (GN)">General (GN)</option>
                  <option value="Tatkal (TQ)">Tatkal (TQ)</option>
                  <option value="Premium Tatkal (PT)">Premium Tatkal (PT)</option>
                  <option value="Ladies (LD)">Ladies (LD)</option>
                  <option value="Senior Citizen (SS)">Senior Citizen (SS)</option>
                  <option value="Divyang (HP)">Divyang (HP)</option>
                </select>
              </div>
            </div>

            {/* Search Button */}
            <div className="pt-0.5 sm:pt-1 relative z-10">
              <button
                type="submit"
                id="btn-search-trains"
                disabled={!isFormValid || isDirectSearching}
                className="w-full h-11 sm:h-13 md:h-15 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:via-orange-600 hover:to-amber-600 text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 sm:gap-3 shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.99] cursor-pointer"
              >
                {isDirectSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                    <span>Searching Trains Live...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Search Trains</span>
                  </>
                )}
              </button>
              {!isFormValid && (
                <p className="text-center text-[10px] sm:text-xs text-slate-500 mt-1">
                  Please select both origin and destination stations to search.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Train Search Results Section */}
      {hasSearched ? (
        <div
          ref={resultsRef}
          id="train-results-section"
          className="pt-4 scroll-mt-6 animate-in fade-in slide-in-from-top-4 duration-500"
        >
          <TrainResultsList
            trains={trains}
            selectedClass={travelClass}
            selectedQuota={quota}
            journeyDate={journeyDate}
            fromStationCode={fromStation?.code}
            toStationCode={toStation?.code}
            onUpdateTrainAvailability={handleUpdateTrainAvailability}
          />
        </div>
      ) : (
        /* Discovery & Travel Utilities (Popular Routes, Quick PNR, Live Status) */
        <TravelUtilities 
          onSelectRoute={handleSelectPopularRoute} 
          isSearching={isDirectSearching} 
          activeRouteKey={activeRouteKey}
        />
      )}

      {/* Controlled CAPTCHA Modal */}
      {fromStation && toStation && (
        <CaptchaModal
          open={isCaptchaOpen}
          onClose={() => setIsCaptchaOpen(false)}
          from_code={fromStation.code}
          from_name={fromStation.name}
          to_code={toStation.code}
          to_name={toStation.name}
          journey_date={journeyDate}
          travel_class={travelClass}
          quota={quota}
          onSearchSuccess={handleSearchSuccess}
        />
      )}
    </div>
  );
};

