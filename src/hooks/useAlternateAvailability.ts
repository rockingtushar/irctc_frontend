import { useState, useEffect, useMemo } from 'react';
import {
  generateAlternateSearchKey,
  getAlternateSearchState,
  subscribeToAlternateSearch,
  startAlternateAvailability,
  isWaitlistStatus,
} from '../services/alternateAvailabilityService';
import { AlternateSearchState } from '../types/alternate';

export interface UseAlternateAvailabilityParams {
  trainNumber: string;
  fromCode: string;
  toCode: string;
  journeyDate: string;
  travelClass: string;
  quota?: string;
  trainType?: string;
  initialStatus?: string | null;
  autoStartOnWL?: boolean;
}

export function useAlternateAvailability({
  trainNumber,
  fromCode,
  toCode,
  journeyDate,
  travelClass,
  quota = 'GN',
  trainType,
  initialStatus,
  autoStartOnWL = true,
}: UseAlternateAvailabilityParams) {
  const searchKey = useMemo(() => {
    return generateAlternateSearchKey({
      trainNumber,
      journeyDate,
      fromCode,
      toCode,
      travelClass,
      quota,
    });
  }, [trainNumber, journeyDate, fromCode, toCode, travelClass, quota]);

  // Initial state from in-memory cache
  const [state, setState] = useState<AlternateSearchState>(() => {
    return (
      getAlternateSearchState(searchKey) || {
        status: 'idle',
        results: [],
        error: null,
        startedAt: Date.now(),
        expiresAt: Date.now() + 15 * 60 * 1000,
        searchKey,
      }
    );
  });

  // Subscribe to service updates for this key
  useEffect(() => {
    const unsubscribe = subscribeToAlternateSearch(searchKey, (newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, [searchKey]);

  // Auto-start in background if WL is detected
  useEffect(() => {
    if (autoStartOnWL && initialStatus && isWaitlistStatus(initialStatus)) {
      const cleanFrom = (fromCode || '').trim();
      const cleanTo = (toCode || '').trim();
      if (!cleanFrom || !cleanTo) {
        return;
      }
      startAlternateAvailability({
        trainNumber,
        fromCode: cleanFrom,
        toCode: cleanTo,
        journeyDate,
        travelClass,
        quota,
        trainType,
        initialStatus,
      });
    }
  }, [
    autoStartOnWL,
    initialStatus,
    trainNumber,
    fromCode,
    toCode,
    journeyDate,
    travelClass,
    quota,
    trainType,
  ]);

  const startSearch = () => {
    return startAlternateAvailability({
      trainNumber,
      fromCode,
      toCode,
      journeyDate,
      travelClass,
      quota,
      trainType,
      initialStatus: initialStatus || undefined,
    });
  };

  const isWL = isWaitlistStatus(initialStatus);

  return {
    searchKey,
    state,
    results: state.results,
    status: state.status,
    error: state.error,
    progress: state.progress,
    isSearching: state.status === 'starting' || state.status === 'searching',
    isCompleted: state.status === 'completed',
    isWL,
    startSearch,
  };
}
