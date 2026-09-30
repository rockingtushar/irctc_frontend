import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Station, StationCacheData } from '../types/station';
import { fetchAllStations, getApiBaseUrl, setApiBaseUrl } from '../api/stations';
import { DEFAULT_MAJOR_STATIONS } from '../data/defaultStations';

const STORAGE_CACHE_KEY = 'rail_stations_cache_v1';
const CACHE_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface StationsContextType {
  stations: Station[];
  isLoading: boolean;
  error: string | null;
  source: 'cache' | 'backend' | 'fallback' | 'none';
  lastUpdated: number | null;
  apiUrl: string;
  updateApiUrl: (url: string) => Promise<void>;
  refreshStations: () => Promise<void>;
  stationCount: number;
}

const StationsContext = createContext<StationsContextType | undefined>(undefined);

export const StationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stations, setStations] = useState<Station[]>(() => DEFAULT_MAJOR_STATIONS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'cache' | 'backend' | 'fallback' | 'none'>('fallback');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [apiUrl, setApiUrlState] = useState<string>(() => getApiBaseUrl());

  const saveToCache = (stationList: Station[]) => {
    try {
      const cachePayload: StationCacheData = {
        stations: stationList,
        timestamp: Date.now(),
        version: '1.0',
      };
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(cachePayload));
    } catch (err) {
      console.warn('[StationsContext] Cache write warning:', err);
    }
  };

  const loadStations = useCallback(async (isManualRefresh = false, overrideUrl?: string) => {
    setError(null);
    let hasValidCache = false;

    // 1. Check client localStorage cache
    if (!isManualRefresh) {
      try {
        const rawCache = localStorage.getItem(STORAGE_CACHE_KEY);
        if (rawCache) {
          const parsed: StationCacheData = JSON.parse(rawCache);
          const isFresh = Date.now() - parsed.timestamp < CACHE_VALIDITY_MS;
          if (Array.isArray(parsed.stations) && parsed.stations.length > 0 && isFresh) {
            hasValidCache = true;
            setStations(parsed.stations);
            setLastUpdated(parsed.timestamp);
            setSource('cache');
            setIsLoading(false);
          }
        }
      } catch {
        // ignore cache parse errors
      }
    }

    if (!hasValidCache && isManualRefresh) {
      setIsLoading(true);
    }

    // 2. Fetch directly from FastAPI Backend
    try {
      const freshStations = await fetchAllStations(overrideUrl);

      if (Array.isArray(freshStations) && freshStations.length > 0) {
        setStations(freshStations);
        setLastUpdated(Date.now());
        setSource('backend');
        saveToCache(freshStations);
        setIsLoading(false);
        setError(null);
        return;
      }
    } catch (apiErr: unknown) {
      const msg = apiErr instanceof Error ? apiErr.message : 'Backend connection failed';
      console.warn('[StationsContext] Notice during stations fetch:', msg);

      setIsLoading(false);
      // If we don't have fresh stations, we keep default stations so app stays 100% usable
      if (!hasValidCache) {
        setStations(DEFAULT_MAJOR_STATIONS);
        setSource('fallback');
      }
    }
  }, []);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  const refreshStations = useCallback(async () => {
    setIsLoading(true);
    await loadStations(true);
  }, [loadStations]);

  const updateApiUrl = useCallback(async (newUrl: string) => {
    const clean = newUrl.trim().replace(/\/$/, '');
    setApiBaseUrl(clean);
    setApiUrlState(clean);
    setIsLoading(true);
    await loadStations(true, clean);
  }, [loadStations]);

  const contextValue = useMemo<StationsContextType>(() => ({
    stations,
    isLoading,
    error,
    source,
    lastUpdated,
    apiUrl,
    updateApiUrl,
    refreshStations,
    stationCount: stations.length,
  }), [stations, isLoading, error, source, lastUpdated, apiUrl, updateApiUrl, refreshStations]);

  return (
    <StationsContext.Provider value={contextValue}>
      {children}
    </StationsContext.Provider>
  );
};

export function useStations(): StationsContextType {
  const context = useContext(StationsContext);
  if (!context) {
    throw new Error('useStations must be used within a <StationsProvider>');
  }
  return context;
}
