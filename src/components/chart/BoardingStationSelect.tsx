import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Search, Check, ChevronDown, AlertCircle, Clock, Train } from 'lucide-react';
import { ScheduleStation, TrainSchedule } from '../../types/chart';
import { TrainMasterItem } from '../../types/train';
import { prefetchTrainChart } from '../../services/chartApi';

interface BoardingStationSelectProps {
  id?: string;
  selectedTrain: TrainMasterItem | null;
  schedule: TrainSchedule | null;
  scheduleLoading: boolean;
  selectedBoardingCode: string;
  journeyDate?: string;
  onSelectStation: (code: string) => void;
  disabled?: boolean;
}

export const BoardingStationSelect: React.FC<BoardingStationSelectProps> = ({
  id = 'boarding-station-select',
  selectedTrain,
  schedule,
  scheduleLoading,
  selectedBoardingCode,
  journeyDate = '',
  onSelectStation,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Helper getters
  const getStationCode = (st: ScheduleStation): string => (st.station_code || st.code || '').toUpperCase();
  const getStationName = (st: ScheduleStation): string => (st.station_name || st.name || '');

  // Filter valid boarding stations (exclude boarding_disabled === true)
  const selectableStations = useMemo(() => {
    if (!schedule?.stations) return [];
    return schedule.stations.filter((st) => !st.boarding_disabled);
  }, [schedule]);

  // Currently selected station object
  const currentStation = useMemo(() => {
    if (!selectedBoardingCode) return null;
    return selectableStations.find(
      (st) => getStationCode(st) === selectedBoardingCode.toUpperCase()
    ) || null;
  }, [selectableStations, selectedBoardingCode]);

  // Filtered stations based on internal search query
  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return selectableStations;
    const q = searchQuery.toLowerCase().trim();
    return selectableStations.filter((st) => {
      const code = getStationCode(st).toLowerCase();
      const name = getStationName(st).toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [selectableStations, searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Reset highlight index when query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setSearchQuery('');
  };

  const handleSelect = (station: ScheduleStation) => {
    const code = getStationCode(station);
    if (selectedTrain?.trainNumber && journeyDate && code) {
      prefetchTrainChart({
        train_number: selectedTrain.trainNumber,
        journey_date: journeyDate,
        boarding_station: code,
      });
    }
    onSelectStation(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
      return;
    }

    if (filteredStations.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredStations.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredStations.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredStations[highlightedIndex]) {
        handleSelect(filteredStations[highlightedIndex]);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full text-left" id={`wrapper-${id}`}>
      {/* Label */}
      <div className="flex items-center justify-between mb-1 sm:mb-1.5">
        <label
          htmlFor={id}
          className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"
        >
          <MapPin className="w-3.5 h-3.5 text-orange-500" />
          <span>Boarding Station</span>
          <span className="text-rose-500">*</span>
        </label>
        {selectedTrain && (
          <span className="text-[10px] text-slate-400 font-medium">
            {selectableStations.length > 0 ? `${selectableStations.length} Stops` : ''}
          </span>
        )}
      </div>

      {/* Main Interactive Box (Always Rendered, No Conditional Unmounting) */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`listbox-${id}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl flex items-center justify-between transition-all select-none ${
          disabled
            ? 'bg-slate-100/70 border border-slate-200 cursor-not-allowed opacity-60'
            : isOpen
            ? 'bg-white border-2 border-orange-500 ring-2 ring-orange-500/20 shadow-sm cursor-pointer'
            : currentStation
            ? 'bg-white border border-slate-300 hover:border-orange-400 shadow-xs cursor-pointer'
            : 'bg-white border border-slate-200 hover:border-slate-300 shadow-xs cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              currentStation
                ? 'bg-orange-100 text-orange-600'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0 flex-1">
            {!selectedTrain ? (
              <span className="text-xs sm:text-sm text-slate-400 font-normal truncate block">
                Select train to choose station
              </span>
            ) : currentStation ? (
              <div className="flex items-baseline gap-2 truncate">
                <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                  {getStationName(currentStation)}
                </span>
                <span className="text-[11px] font-extrabold text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200 shrink-0 font-mono">
                  {getStationCode(currentStation)}
                </span>
                {currentStation.departure_time || currentStation.departure ? (
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline-block shrink-0">
                    • Dep {currentStation.departure_time || currentStation.departure}
                  </span>
                ) : null}
              </div>
            ) : selectableStations.length > 0 ? (
              <span className="text-xs sm:text-sm text-slate-500 font-semibold truncate block">
                Select your boarding station
              </span>
            ) : scheduleLoading ? (
              <span className="text-xs text-orange-600 font-medium truncate block">
                Loading boarding stations...
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-normal truncate block">
                Select Boarding Station
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-500' : ''}`}
          />
        </div>
      </div>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div
          id={`listbox-${id}`}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl shadow-slate-900/15 border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Case 1: No train selected yet */}
          {!selectedTrain ? (
            <div className="p-4 text-center">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2.5 border border-amber-200/70">
                <Train className="w-5 h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                Please enter a Train first
              </h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                Once you select or type a train name or 5-digit number, all boarding stations will appear here instantly.
              </p>
            </div>
          ) : selectableStations.length === 0 ? (
            /* Case 2: Train selected but schedule is still loading or has no stations */
            <div className="p-4 text-center">
              {scheduleLoading ? (
                <div className="py-2">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Loading stations for {selectedTrain.trainNumber}...</p>
                </div>
              ) : (
                <div className="py-1 text-slate-500 text-xs">
                  <AlertCircle className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  No boarding stations found for this train.
                </div>
              )}
            </div>
          ) : (
            /* Case 3: Stations ready (Instant / Pre-cached, No delay) */
            <>
              {/* Search filter inside dropdown if more than 5 stations */}
              {selectableStations.length > 5 && (
                <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search station name or code (e.g. NDLS, CNB)..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Stations List */}
              <ul
                ref={listRef}
                className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1"
              >
                {filteredStations.length === 0 ? (
                  <li className="p-4 text-center text-xs text-slate-400">
                    No matching stations found for &ldquo;{searchQuery}&rdquo;
                  </li>
                ) : (
                  filteredStations.map((station, index) => {
                    const stCode = getStationCode(station);
                    const stName = getStationName(station);
                    const isSelected = selectedBoardingCode.toUpperCase() === stCode;
                    const isHighlighted = index === highlightedIndex;
                    const isOrigin = index === 0;
                    const depTime = station.departure_time || station.departure || station.arrival_time || station.arrival;

                    return (
                      <li
                        key={stCode}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(station)}
                        onMouseEnter={() => {
                          setHighlightedIndex(index);
                          if (selectedTrain?.trainNumber && journeyDate && stCode) {
                            prefetchTrainChart({
                              train_number: selectedTrain.trainNumber,
                              journey_date: journeyDate,
                              boarding_station: stCode,
                            });
                          }
                        }}
                        className={`p-2.5 sm:p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-orange-500 text-white font-bold'
                            : isHighlighted
                            ? 'bg-orange-50 text-slate-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black shrink-0 ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {stCode}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className={`text-xs sm:text-sm truncate ${isSelected ? 'font-black' : 'font-bold'}`}>
                                {stName}
                              </span>
                              {isOrigin && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase shrink-0 ${
                                    isSelected
                                      ? 'bg-white/25 text-white'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  Origin
                                </span>
                              )}
                            </div>
                            {depTime && (
                              <div
                                className={`text-[11px] flex items-center gap-1 mt-0.5 ${
                                  isSelected ? 'text-white/80' : 'text-slate-500'
                                }`}
                              >
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>Dep: {depTime}</span>
                                {station.day ? <span>(Day {station.day})</span> : null}
                              </div>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};
