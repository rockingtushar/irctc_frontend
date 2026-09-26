import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Station, NormalizedStation } from '../types/station';
import { useStations } from '../context/StationsContext';
import { MapPin, Search, X, Check, Train, History, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import { getRecentStations, addRecentStation, removeRecentStation, clearRecentStations } from '../utils/searchStorage';
import { DEFAULT_MAJOR_STATIONS } from '../data/defaultStations';

interface StationAutocompleteProps {
  id: string;
  label: string;
  placeholder?: string;
  selectedStation: Station | null;
  onSelectStation: (station: Station | null) => void;
  disabled?: boolean;
}

export const StationAutocomplete: React.FC<StationAutocompleteProps> = ({
  id,
  label,
  placeholder = 'Enter station name or code...',
  selectedStation,
  onSelectStation,
  disabled = false,
}) => {
  const { stations, isLoading } = useStations();
  const [query, setQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [recentStations, setRecentStations] = useState<Station[]>(() => getRecentStations());

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync display text whenever selectedStation changes from outside (e.g. swap or quick-routes)
  useEffect(() => {
    if (selectedStation) {
      setQuery(`${selectedStation.name} (${selectedStation.code})`);
    } else {
      setQuery('');
    }
  }, [selectedStation]);

  // Refresh recent stations when dropdown opens
  const refreshRecentStations = useCallback(() => {
    setRecentStations(getRecentStations());
  }, []);

  // Pre-normalize stations into memory once for high-speed zero-delay substring checks
  const normalizedStations = useMemo<NormalizedStation[]>(() => {
    return stations.map((s) => ({
      ...s,
      normalizedCode: s.code.trim().toUpperCase(),
      normalizedName: s.name.trim().toUpperCase(),
    }));
  }, [stations]);

  // Determine if we are currently searching vs viewing suggestions/history
  const isTyping = useMemo(() => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return false;
    if (selectedStation && trimmed === `${selectedStation.name} (${selectedStation.code})`.toUpperCase()) {
      return false;
    }
    return true;
  }, [query, selectedStation]);

  // Popular major stations for quick selection
  const popularStations = useMemo<Station[]>(() => {
    return DEFAULT_MAJOR_STATIONS.slice(0, 6);
  }, []);

  // Client-side instant filtering with 5-tier matching priority
  const filteredSuggestions = useMemo<Station[]>(() => {
    if (!isTyping) {
      return [];
    }

    const trimmed = query.trim().toUpperCase();
    const priority1: Station[] = []; // Exact code
    const priority2: Station[] = []; // Code starts with
    const priority3: Station[] = []; // Name starts with
    const priority4: Station[] = []; // Code contains
    const priority5: Station[] = []; // Name contains

    for (let i = 0; i < normalizedStations.length; i++) {
      const item = normalizedStations[i];
      const { normalizedCode, normalizedName, code, name } = item;

      if (normalizedCode === trimmed) {
        priority1.push({ code, name });
      } else if (normalizedCode.startsWith(trimmed)) {
        priority2.push({ code, name });
      } else if (normalizedName.startsWith(trimmed)) {
        priority3.push({ code, name });
      } else if (normalizedCode.includes(trimmed)) {
        priority4.push({ code, name });
      } else if (normalizedName.includes(trimmed)) {
        priority5.push({ code, name });
      }

      if (priority1.length + priority2.length + priority3.length >= 24) {
        break;
      }
    }

    // Combine in priority order, deduping by code, cap strictly at 8 results
    const combined: Station[] = [];
    const seenCodes = new Set<string>();

    const candidateGroups = [priority1, priority2, priority3, priority4, priority5];
    for (const group of candidateGroups) {
      for (const st of group) {
        if (!seenCodes.has(st.code)) {
          seenCodes.add(st.code);
          combined.push(st);
          if (combined.length >= 8) {
            return combined;
          }
        }
      }
    }

    return combined;
  }, [query, isTyping, normalizedStations]);

  // Active items for keyboard navigation depending on view
  const activeNavigationList = useMemo<Station[]>(() => {
    if (isTyping) {
      return filteredSuggestions;
    }
    if (recentStations.length > 0) {
      return recentStations;
    }
    return popularStations;
  }, [isTyping, filteredSuggestions, recentStations, popularStations]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedStation) {
          setQuery(`${selectedStation.name} (${selectedStation.code})`);
        } else {
          setQuery('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedStation]);

  // Scroll active item into view
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

    if (!val.trim()) {
      onSelectStation(null);
    }
  };

  const handleSelect = useCallback((station: Station) => {
    onSelectStation(station);
    // Save to persistent 5 recent stations history
    const updated = addRecentStation(station);
    setRecentStations(updated);
    setQuery(`${station.name} (${station.code})`);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [onSelectStation]);

  const handleRemoveRecent = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    const updated = removeRecentStation(code);
    setRecentStations(updated);
  };

  const handleClearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentStations();
    setRecentStations([]);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectStation(null);
    setQuery('');
    setIsOpen(true);
    refreshRecentStations();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || isLoading) return;

    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      refreshRecentStations();
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
        if (selectedStation) {
          setQuery(`${selectedStation.name} (${selectedStation.code})`);
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
    <div ref={containerRef} className={`relative w-full text-left ${isOpen ? 'z-50' : 'z-20'}`} id={`container-${id}`}>
      <div className="flex items-center justify-between mb-1 sm:mb-1.5">
        <label htmlFor={id} className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </label>
        {selectedStation && (
          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-orange-600 bg-orange-50 px-1.5 sm:px-2 py-0.5 rounded-md border border-orange-100">
            {selectedStation.code}
          </span>
        )}
      </div>

      <div className="relative group">
        <div className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors pointer-events-none">
          <MapPin className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
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
              refreshRecentStations();
            }
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              refreshRecentStations();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-8 sm:pl-11 pr-7 sm:pr-10 py-2 sm:py-3.5 bg-slate-50 border-2 rounded-xl sm:rounded-2xl text-xs sm:text-base font-semibold text-slate-800 transition-all outline-none ${
            disabled
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              : 'border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100'
          } ${selectedStation ? 'border-orange-300 bg-orange-50/30' : ''}`}
        />

        {/* Action icons on right: clear or search */}
        <div className="absolute inset-y-0 right-0 pr-2 sm:pr-3.5 flex items-center">
          {query && !disabled ? (
            <button
              type="button"
              id={`btn-clear-${id}`}
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
              aria-label="Clear station input"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          ) : (
            <Search className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 pointer-events-none" />
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
              {filteredSuggestions.map((station, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected = selectedStation?.code === station.code;

                return (
                  <li
                    key={station.code}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(station)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      isHighlighted
                        ? 'bg-orange-50 border-l-4 border-orange-500 text-slate-900 shadow-2xs'
                        : isSelected
                        ? 'bg-orange-50/70 border-l-4 border-orange-400 text-slate-900'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isHighlighted ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Train className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-bold text-slate-800 truncate">
                          {station.name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>Code:</span>
                          <span className="font-mono font-bold text-slate-700">{station.code}</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="shrink-0 ml-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* VIEW 2: Custom code fallback if no search match */}
          {isTyping && filteredSuggestions.length === 0 && (
            <div className="p-3 text-left">
              <p className="text-xs text-slate-500 mb-2">
                No standard match found for <strong className="text-slate-800 font-semibold">"{query}"</strong>
              </p>
              <button
                type="button"
                onClick={() => {
                  const code = query.trim().toUpperCase();
                  handleSelect({ code, name: code });
                }}
                className="w-full text-left px-3 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-xs font-bold text-orange-700 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Use custom station code: <strong>{query.trim().toUpperCase()}</strong></span>
                <span className="text-[10px] bg-orange-200/80 px-2 py-0.5 rounded-md">Select</span>
              </button>
            </div>
          )}

          {/* VIEW 3: When not actively typing (Focus Mode) -> Show Recent 5 Stations History & Popular Stations */}
          {!isTyping && (
            <div className="p-2">
              {/* Recent 5 Stations Section */}
              {recentStations.length > 0 ? (
                <div className="mb-3">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <History className="w-3.5 h-3.5 text-orange-500" />
                      <span>Recent Stations (Max 5)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAllRecent}
                      className="text-[11px] font-semibold text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Clear all recent stations"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>

                  <ul ref={listRef} className="space-y-1">
                    {recentStations.map((station, index) => {
                      const isHighlighted = index === highlightedIndex;
                      const isSelected = selectedStation?.code === station.code;

                      return (
                        <li
                          key={`recent-${station.code}`}
                          id={`${id}-option-${index}`}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(station)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          className={`group/item flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                            isHighlighted
                              ? 'bg-orange-50 border-l-4 border-orange-500 text-slate-900'
                              : isSelected
                              ? 'bg-orange-50/70 border-l-4 border-orange-400 text-slate-900'
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0">
                              <History className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate text-left">
                              <span className="text-xs font-bold text-slate-800 truncate block">
                                {station.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-slate-500">
                                {station.code}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isSelected && <Check className="w-4 h-4 text-emerald-600 mr-1" />}
                            <button
                              type="button"
                              onClick={(e) => handleRemoveRecent(e, station.code)}
                              className="opacity-60 group-hover/item:opacity-100 hover:text-rose-500 p-1 rounded-md hover:bg-slate-200/60 transition-all"
                              title="Remove from history"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {/* Popular Stations Section */}
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 mb-1 text-xs font-bold text-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Popular Stations</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 p-1">
                  {popularStations.map((station) => (
                    <button
                      key={`popular-${station.code}`}
                      type="button"
                      onClick={() => handleSelect(station)}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-100 transition-all text-left group/pop"
                    >
                      <div className="truncate pr-1">
                        <div className="text-xs font-bold text-slate-800 truncate group-hover/pop:text-orange-700">
                          {station.name}
                        </div>
                        <div className="text-[10px] font-mono font-semibold text-slate-400">
                          {station.code}
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover/pop:text-orange-500 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

