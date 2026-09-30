import { Station, Train } from '../types/station';
import { getIndianRailwaysTodayString } from './dateUtils';

const SEARCH_STATE_STORAGE_KEY = 'confirmtkt_search_state_v1';
const RECENT_SEARCHES_STORAGE_KEY = 'confirmtkt_recent_searches_v1';
const RECENT_STATIONS_STORAGE_KEY = 'confirmtkt_recent_stations_v1';
const MAX_RECENT_STATIONS = 5;
const MAX_RECENT_SEARCHES = 6;

// ConfirmTkt standard: Train results expire after 2 hours (in milliseconds)
export const SEARCH_RESULTS_CACHE_TTL_MS = 2 * 60 * 60 * 1000;

export interface SavedSearchState {
  fromStation: Station | null;
  toStation: Station | null;
  journeyDate: string;
  travelClass: string;
  quota: string;
  trains: Train[];
  hasSearched: boolean;
  lastSearchedAt?: number;
}

export interface RecentSearchItem {
  id: string;
  fromStation: Station;
  toStation: Station;
  journeyDate: string;
  travelClass: string;
  quota: string;
  timestamp: number;
}

/**
 * Gets formatted today date YYYY-MM-DD in Indian Railways Standard Time (IST)
 */
function getTodayDateString(): string {
  return getIndianRailwaysTodayString();
}

/**
 * Loads persisted search form & train results state from localStorage.
 * Stations, Class & Quota stay persistent, while Train results expire after 2 hours (ConfirmTkt standard) or past date.
 */
export function loadSavedSearchState(): SavedSearchState | null {
  try {
    const raw = localStorage.getItem(SEARCH_STATE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const todayStr = getTodayDateString();
    const lastSearchedAt = typeof parsed.lastSearchedAt === 'number' ? parsed.lastSearchedAt : 0;
    const isExpired = Date.now() - lastSearchedAt > SEARCH_RESULTS_CACHE_TTL_MS;
    const isPastDate = Boolean(parsed.journeyDate && parsed.journeyDate < todayStr);

    // If results are older than 2 hours or journey date has passed, clear stale train results but keep form inputs
    const shouldKeepResults = !isExpired && !isPastDate && Array.isArray(parsed.trains) && parsed.trains.length > 0;

    return {
      fromStation: parsed.fromStation || null,
      toStation: parsed.toStation || null,
      journeyDate: typeof parsed.journeyDate === 'string' && parsed.journeyDate >= todayStr ? parsed.journeyDate : todayStr,
      travelClass: typeof parsed.travelClass === 'string' ? parsed.travelClass : 'All Classes',
      quota: typeof parsed.quota === 'string' ? parsed.quota : 'General (GN)',
      trains: shouldKeepResults ? parsed.trains : [],
      hasSearched: shouldKeepResults ? Boolean(parsed.hasSearched) : false,
      lastSearchedAt: parsed.lastSearchedAt,
    };
  } catch (err) {
    console.warn('[searchStorage] Failed to load saved search state:', err);
    return null;
  }
}

/**
 * Saves current search state & results to localStorage
 */
export function saveSearchState(state: SavedSearchState): void {
  try {
    const payload: SavedSearchState = {
      fromStation: state.fromStation,
      toStation: state.toStation,
      journeyDate: state.journeyDate,
      travelClass: state.travelClass,
      quota: state.quota,
      trains: state.trains || [],
      hasSearched: state.hasSearched,
      lastSearchedAt: Date.now(),
    };
    localStorage.setItem(SEARCH_STATE_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[searchStorage] Failed to persist search state:', err);
  }
}

/**
 * Clears saved search state and results
 */
export function clearSavedSearchState(): void {
  try {
    localStorage.removeItem(SEARCH_STATE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Loads recent searches history
 */
export function getRecentSearches(): RecentSearchItem[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Adds a new search to recent searches list (ConfirmTkt style)
 */
export function addRecentSearch(
  fromStation: Station,
  toStation: Station,
  journeyDate: string,
  travelClass = 'All Classes',
  quota = 'General (GN)'
): RecentSearchItem[] {
  try {
    const existing = getRecentSearches();

    const newItem: RecentSearchItem = {
      id: `${fromStation.code}-${toStation.code}-${Date.now()}`,
      fromStation,
      toStation,
      journeyDate,
      travelClass,
      quota,
      timestamp: Date.now(),
    };

    // Filter out previous search with same from & to station code to avoid clutter
    const filtered = existing.filter(
      (item) =>
        !(
          item.fromStation.code.toUpperCase() === fromStation.code.toUpperCase() &&
          item.toStation.code.toUpperCase() === toStation.code.toUpperCase()
        )
    );

    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[searchStorage] Failed to add recent search:', err);
    return [];
  }
}

/**
 * Removes a specific recent search item
 */
export function removeRecentSearch(id: string): RecentSearchItem[] {
  try {
    const existing = getRecentSearches();
    const updated = existing.filter((item) => item.id !== id);
    localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Clears all recent searches
 */
export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Loads recent individual stations (Max 5, ConfirmTkt style)
 */
export function getRecentStations(): Station[] {
  try {
    const raw = localStorage.getItem(RECENT_STATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Adds a station to recent stations list (Max 5, removes duplicates, persistent on refresh)
 */
export function addRecentStation(station: Station): Station[] {
  if (!station || !station.code) return getRecentStations();
  try {
    const existing = getRecentStations();
    const filtered = existing.filter(
      (s) => s.code.trim().toUpperCase() !== station.code.trim().toUpperCase()
    );
    const updated = [station, ...filtered].slice(0, MAX_RECENT_STATIONS);
    localStorage.setItem(RECENT_STATIONS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[searchStorage] Failed to save recent station:', err);
    return [];
  }
}

/**
 * Removes a specific recent station
 */
export function removeRecentStation(stationCode: string): Station[] {
  try {
    const existing = getRecentStations();
    const updated = existing.filter(
      (s) => s.code.trim().toUpperCase() !== stationCode.trim().toUpperCase()
    );
    localStorage.setItem(RECENT_STATIONS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentStations(): void {
  try {
    localStorage.removeItem(RECENT_STATIONS_STORAGE_KEY);
  } catch {}
}
