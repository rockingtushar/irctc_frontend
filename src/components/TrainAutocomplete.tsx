import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TrainMasterItem, NormalizedTrainMasterItem } from '../types/train';
import { arrTrainList } from '../data/train_data';
import { Train, Search, X, Check, History, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import { getRecentTrains, addRecentTrain, removeRecentTrain, clearRecentTrains } from '../utils/trainStorage';
import { prefetchTrainSchedule } from '../services/trainService';

interface TrainAutocompleteProps {
  id: string;
  label: string;
  placeholder?: string;
  selectedTrain: TrainMasterItem | null;
  onSelectTrain: (train: TrainMasterItem | null) => void;
  disabled?: boolean;
}

// Pre-parse and normalize raw train items once for high-performance substring checks
const parsedTrainDataset: NormalizedTrainMasterItem[] = arrTrainList.map((rawString) => {
  const dashIdx = rawString.indexOf('-');
  let trainNumber = '';
  let trainName = '';
  if (dashIdx !== -1) {
    trainNumber = rawString.slice(0, dashIdx).trim();
    trainName = rawString.slice(dashIdx + 1).trim();
  } else {
    const parts = rawString.trim().split(/\s+/);
    trainNumber = parts[0] || '';
    trainName = parts.slice(1).join(' ') || '';
  }

  return {
    trainNumber,
    trainName,
    fullString: rawString,
    normalizedNumber: trainNumber.toUpperCase(),
    normalizedName: trainName.toUpperCase(),
  };
});

// Dynamic initial suggestions from loaded train directory without manual hardcoding
const INITIAL_TRAIN_SUGGESTIONS: TrainMasterItem[] = parsedTrainDataset
  .slice(0, 8)
  .map(({ trainNumber, trainName, fullString }) => ({ trainNumber, trainName, fullString }));

export const TrainAutocomplete: React.FC<TrainAutocompleteProps> = ({
  id,
  label,
  placeholder = 'Enter 5-digit train number or train name...',
  selectedTrain,
  onSelectTrain,
  disabled = false,
}) => {
  const [query, setQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [recentTrains, setRecentTrains] = useState<TrainMasterItem[]>(() => getRecentTrains());

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync display text whenever selectedTrain changes from outside
  useEffect(() => {
    if (selectedTrain) {
      setQuery(`${selectedTrain.trainNumber} - ${selectedTrain.trainName}`);
    } else {
      setQuery('');
    }
  }, [selectedTrain]);

  // Refresh recent trains when dropdown opens
  const refreshRecentTrains = useCallback(() => {
    setRecentTrains(getRecentTrains());
  }, []);

  const normalizedTrainDataset = parsedTrainDataset;

  // Determine if user is typing a search query vs viewing the established selection
  const isTyping = useMemo(() => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return false;
    if (
      selectedTrain &&
      (trimmed === `${selectedTrain.trainNumber} - ${selectedTrain.trainName}`.toUpperCase() ||
        trimmed === selectedTrain.trainNumber.toUpperCase())
    ) {
      return false;
    }
    return true;
  }, [query, selectedTrain]);

  // Instant client-side filtering with tiered priority matching
  const filteredSuggestions = useMemo<TrainMasterItem[]>(() => {
    if (!isTyping) {
      return [];
    }

    const trimmed = query.trim().toUpperCase();
    const cleanNumbersOnly = trimmed.replace(/\D/g, '');

    const priority1: TrainMasterItem[] = []; // Exact train number match
    const priority2: TrainMasterItem[] = []; // Train number starts with input
    const priority3: TrainMasterItem[] = []; // Train name starts with input
    const priority4: TrainMasterItem[] = []; // Train number contains input
    const priority5: TrainMasterItem[] = []; // Train name contains input

    for (let i = 0; i < normalizedTrainDataset.length; i++) {
      const item = normalizedTrainDataset[i];
      const { normalizedNumber, normalizedName, trainNumber, trainName, fullString } = item;
      const trainItem: TrainMasterItem = { trainNumber, trainName, fullString };

      if (cleanNumbersOnly && normalizedNumber === cleanNumbersOnly) {
        priority1.push(trainItem);
      } else if (cleanNumbersOnly && normalizedNumber.startsWith(cleanNumbersOnly)) {
        priority2.push(trainItem);
      } else if (normalizedName.startsWith(trimmed)) {
        priority3.push(trainItem);
      } else if (cleanNumbersOnly && normalizedNumber.includes(cleanNumbersOnly)) {
        priority4.push(trainItem);
      } else if (normalizedName.includes(trimmed)) {
        priority5.push(trainItem);
      }

      // Optimization: Break early if we've accumulated plenty of high-priority candidates
      if (priority1.length + priority2.length + priority3.length >= 25) {
        break;
      }
    }

    // Combine in strict priority order, deduplicating by trainNumber, cap at 10 results
    const combined: TrainMasterItem[] = [];
    const seenNumbers = new Set<string>();

    const candidateGroups = [priority1, priority2, priority3, priority4, priority5];
    for (const group of candidateGroups) {
      for (const t of group) {
        if (!seenNumbers.has(t.trainNumber)) {
          seenNumbers.add(t.trainNumber);
          combined.push(t);
          if (combined.length >= 10) {
            return combined;
          }
        }
      }
    }

    return combined;
  }, [query, isTyping, normalizedTrainDataset]);

  // Active items for keyboard navigation depending on view
  const activeNavigationList = useMemo<TrainMasterItem[]>(() => {
    if (isTyping) {
      return filteredSuggestions;
    }
    if (recentTrains.length > 0) {
      return recentTrains;
    }
    return INITIAL_TRAIN_SUGGESTIONS;
  }, [isTyping, filteredSuggestions, recentTrains]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedTrain) {
          setQuery(`${selectedTrain.trainNumber} - ${selectedTrain.trainName}`);
        } else {
          const digits = query.trim().replace(/\D/g, '');
          if (digits.length === 5) {
            const match = normalizedTrainDataset.find((item) => item.trainNumber === digits);
            if (match) {
              handleSelect(match);
              return;
            }
          }
          setQuery('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedTrain]);

  // Scroll active item into view during keyboard navigation
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    setHighlightedIndex(-1);

    // If input is cleared, unselect
    if (!val.trim()) {
      onSelectTrain(null);
      return;
    }

    // Auto-select when a 5-digit number is typed
    const cleanDigits = val.trim().replace(/\D/g, '');
    if (cleanDigits.length === 5) {
      prefetchTrainSchedule(cleanDigits);
      const match = normalizedTrainDataset.find((item) => item.trainNumber === cleanDigits);
      if (match) {
        onSelectTrain(match);
      } else {
        onSelectTrain({
          trainNumber: cleanDigits,
          trainName: `Train ${cleanDigits}`,
          fullString: `${cleanDigits} - Train ${cleanDigits}`,
        });
      }
    } else if (selectedTrain && !val.includes(selectedTrain.trainNumber)) {
      onSelectTrain(null);
    }
  };

  const handleSelect = useCallback(
    (train: TrainMasterItem) => {
      // Prefetch immediately on selection
      prefetchTrainSchedule(train.trainNumber);
      onSelectTrain(train);
      // Save to persistent recent trains history (Max 5)
      const updated = addRecentTrain(train);
      setRecentTrains(updated);
      setQuery(`${train.trainNumber} - ${train.trainName}`);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onSelectTrain]
  );

  const handleRemoveRecent = (e: React.MouseEvent, trainNumber: string) => {
    e.stopPropagation();
    const updated = removeRecentTrain(trainNumber);
    setRecentTrains(updated);
  };

  const handleClearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentTrains();
    setRecentTrains([]);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectTrain(null);
    setQuery('');
    setIsOpen(true);
    refreshRecentTrains();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      refreshRecentTrains();
      return;
    }

    if (!isOpen || activeNavigationList.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < activeNavigationList.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : activeNavigationList.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < activeNavigationList.length) {
          handleSelect(activeNavigationList[highlightedIndex]);
        } else if (activeNavigationList.length > 0) {
          handleSelect(activeNavigationList[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        if (selectedTrain) {
          setQuery(`${selectedTrain.trainNumber} - ${selectedTrain.trainName}`);
        }
        break;
      case 'Tab':
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < activeNavigationList.length) {
          handleSelect(activeNavigationList[highlightedIndex]);
        }
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full text-left" id={`container-${id}`}>
      {/* Label and Badge Row */}
      <div className="flex items-center justify-between mb-1 sm:mb-1.5">
        <label
          htmlFor={id}
          className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider"
        >
          {label} <span className="text-orange-500">*</span>
        </label>
        {selectedTrain && (
          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200 shadow-2xs">
            #{selectedTrain.trainNumber}
          </span>
        )}
      </div>

      {/* Input Box */}
      <div className="relative group">
        <div className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors pointer-events-none">
          <Train className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={`listbox-${id}`}
          aria-activedescendant={
            highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined
          }
          autoComplete="off"
          disabled={disabled}
          value={query}
          onChange={handleInputChange}
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              refreshRecentTrains();
            }
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              refreshRecentTrains();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-9 sm:pl-11 pr-8 sm:pr-10 py-2.5 sm:py-3.5 bg-slate-50 border rounded-xl sm:rounded-2xl text-xs sm:text-base font-semibold text-slate-800 transition-all outline-none ${
            disabled
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              : 'border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100'
          } ${selectedTrain ? 'border-orange-300 bg-orange-50/30' : ''}`}
        />

        {/* Clear Button or Search Icon */}
        <div className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3.5 flex items-center">
          {query && !disabled ? (
            <button
              type="button"
              id={`btn-clear-${id}`}
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Clear train input"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          ) : (
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div
          id={`listbox-${id}`}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-1 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* VIEW 1: Live Type Search Results */}
          {isTyping && filteredSuggestions.length > 0 && (
            <ul ref={listRef} className="p-1 space-y-0.5">
              {filteredSuggestions.map((train, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected = selectedTrain?.trainNumber === train.trainNumber;

                return (
                  <li
                    key={train.trainNumber}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(train)}
                    onMouseEnter={() => {
                      setHighlightedIndex(index);
                      prefetchTrainSchedule(train.trainNumber);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      isHighlighted
                        ? 'bg-orange-50 border-l-4 border-orange-500 text-slate-900 shadow-2xs'
                        : isSelected
                        ? 'bg-orange-50/70 border-l-4 border-orange-400 text-slate-900'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isHighlighted || isSelected
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Train className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm sm:text-base text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                            {train.trainNumber}
                          </span>
                          <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                            {train.trainName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-orange-600 shrink-0 ml-2">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* VIEW 2: Empty / No Matches Found */}
          {isTyping && filteredSuggestions.length === 0 && (
            <div className="p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-2">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                No train found matching "{query}"
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Try typing a 5-digit train number (e.g. 15132) or train name (e.g. SHATABDI)
              </p>
            </div>
          )}

          {/* VIEW 3: Recent Searches (When not actively typing) */}
          {!isTyping && recentTrains.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100 bg-slate-50/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  Recent Trains
                </span>
                <button
                  type="button"
                  onClick={handleClearAllRecent}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>

              <ul ref={listRef} className="p-1 space-y-0.5">
                {recentTrains.map((train, index) => {
                  const isHighlighted = index === highlightedIndex;
                  const isSelected = selectedTrain?.trainNumber === train.trainNumber;

                  return (
                    <li
                      key={train.trainNumber}
                      id={`${id}-option-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(train)}
                      onMouseEnter={() => {
                        setHighlightedIndex(index);
                        prefetchTrainSchedule(train.trainNumber);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                        isHighlighted
                          ? 'bg-orange-50 border-l-4 border-orange-500 text-slate-900'
                          : isSelected
                          ? 'bg-orange-50/70 border-l-4 border-orange-400 text-slate-900'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0">
                          <History className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs sm:text-sm text-orange-600">
                              {train.trainNumber}
                            </span>
                            <span className="font-semibold text-xs sm:text-sm text-slate-800 truncate">
                              {train.trainName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleRemoveRecent(e, train.trainNumber)}
                        className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors ml-2 cursor-pointer"
                        title="Remove from history"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* VIEW 4: Directory Suggestions */}
          {!isTyping && (
            <div className={recentTrains.length > 0 ? 'border-t border-slate-100 pt-2' : ''}>
              <div className="px-3.5 py-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Suggested Trains
              </div>
              <ul className="p-1 space-y-0.5">
                {INITIAL_TRAIN_SUGGESTIONS.map((train, index) => {
                  const globalIdx = recentTrains.length > 0 ? recentTrains.length + index : index;
                  const isHighlighted = globalIdx === highlightedIndex;
                  const isSelected = selectedTrain?.trainNumber === train.trainNumber;

                  return (
                    <li
                      key={train.trainNumber}
                      id={`${id}-option-${globalIdx}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(train)}
                      onMouseEnter={() => {
                        setHighlightedIndex(globalIdx);
                        prefetchTrainSchedule(train.trainNumber);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                        isHighlighted
                          ? 'bg-orange-50 border-l-4 border-orange-500 text-slate-900'
                          : isSelected
                          ? 'bg-orange-50/70 border-l-4 border-orange-400 text-slate-900'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                          <Train className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs sm:text-sm text-orange-600">
                              {train.trainNumber}
                            </span>
                            <span className="font-medium text-xs sm:text-sm text-slate-800 truncate">
                              {train.trainName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0 ml-2" />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
