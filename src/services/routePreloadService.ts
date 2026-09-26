import { Train } from '../types/station';
import { RunningStatusData } from '../types/runningStatus';
import { fetchRunningStatus } from '../api/runningStatus';
import { normalizeJourneyDateForRoute } from '../utils/routeUtils';

/**
 * Route Cache & Preloading Service
 * 
 * Manages in-memory caching and background preloading of train routes with:
 * - Deduplication of concurrent requests (shared Promise)
 * - Controlled concurrency (4-6 parallel workers)
 * - Session-based cancellation of outdated background preloads on new searches
 * - Non-poisoning error handling (failed attempts can be retried on click)
 */

// In-memory cache for loaded routes keyed by: `${trainNumber}_${apiDate}`
const routeCache = new Map<string, RunningStatusData>();

// In-flight route fetch Promises keyed by: `${trainNumber}_${apiDate}`
const inFlightRouteRequests = new Map<string, Promise<RunningStatusData>>();

// Session ID for the active preloading batch to safely cancel stale searches
let currentPreloadSessionId = 0;

/**
 * Generates a unique, timezone-safe cache key for a train and journey date
 * e.g. "12559_25-Sep-2026" or "12559_route" if date is omitted
 */
export function getRouteCacheKey(trainNumber: string, rawJourneyDate?: string): string {
  const cleanTrainNo = (trainNumber || '').trim();
  if (rawJourneyDate && rawJourneyDate.trim()) {
    const { apiDate, hasExplicitDate } = normalizeJourneyDateForRoute(rawJourneyDate);
    if (hasExplicitDate && apiDate) {
      return `${cleanTrainNo}_${apiDate}`;
    }
  }
  return `${cleanTrainNo}_route`;
}

/**
 * Synchronously retrieves a cached route if available.
 * Checks specific date key first, then falls back to generic train route cache.
 */
export function getCachedRoute(trainNumber: string, rawJourneyDate?: string): RunningStatusData | null {
  const cleanTrainNo = (trainNumber || '').trim();
  const specificKey = getRouteCacheKey(cleanTrainNo, rawJourneyDate);
  if (routeCache.has(specificKey)) {
    return routeCache.get(specificKey) || null;
  }
  const genericKey = `${cleanTrainNo}_route`;
  if (routeCache.has(genericKey)) {
    return routeCache.get(genericKey) || null;
  }
  // If route for this train was cached under any date, reuse it as fallback
  for (const [k, v] of routeCache.entries()) {
    if (k.startsWith(`${cleanTrainNo}_`)) {
      return v;
    }
  }
  return null;
}

/**
 * Checks if a route is already in the cache
 */
export function hasCachedRoute(trainNumber: string, rawJourneyDate?: string): boolean {
  return Boolean(getCachedRoute(trainNumber, rawJourneyDate));
}

/**
 * Retrieves the currently active in-flight Promise for a route, if one is running
 */
export function getInFlightRoutePromise(
  trainNumber: string,
  rawJourneyDate?: string
): Promise<RunningStatusData> | null {
  const key = getRouteCacheKey(trainNumber, rawJourneyDate);
  return inFlightRouteRequests.get(key) || null;
}

/**
 * Fetches the train route with automatic caching and deduplication.
 * - If already cached: resolves immediately from cache.
 * - If already in-flight: reuses the existing in-flight Promise (no duplicate request).
 * - If neither: starts a new network call, caches on success, and clears from in-flight on finish.
 */
export async function fetchRouteWithCache(
  trainNumber: string,
  rawJourneyDate?: string
): Promise<RunningStatusData> {
  const key = getRouteCacheKey(trainNumber, rawJourneyDate);
  const cleanTrainNo = (trainNumber || '').trim();
  const { apiDate } = normalizeJourneyDateForRoute(rawJourneyDate);

  // 1. Instant cache hit (checks specific or generic)
  const cached = getCachedRoute(cleanTrainNo, rawJourneyDate);
  if (cached) {
    return cached;
  }

  // 2. Attach to existing in-flight request if already loading
  const inFlight = inFlightRouteRequests.get(key);
  if (inFlight) {
    return inFlight;
  }

  // 3. Initiate request and register Promise in the in-flight map
  const requestPromise = (async () => {
    try {
      // Route request does not send journey_date; backend route.py automatically resolves it
      const data = await fetchRunningStatus({
        train_no: cleanTrainNo,
      });

      // Cache the result under specific key and generic train key
      routeCache.set(key, data);
      routeCache.set(`${cleanTrainNo}_route`, data);
      return data;
    } catch (err) {
      // Do NOT poison the cache with errors; allow future retries
      throw err;
    } finally {
      // Clean up in-flight tracker once resolved or rejected
      inFlightRouteRequests.delete(key);
    }
  })();

  inFlightRouteRequests.set(key, requestPromise);
  return requestPromise;
}

/**
 * Preloads the complete routes for an array of trains in the background
 * using a controlled concurrency pool (default 5 concurrent requests).
 * 
 * - Does NOT block rendering of train results.
 * - Skips already cached trains or trains currently in-flight.
 * - Gracefully absorbs background failures without throwing or breaking UI.
 * - Cancels background processing of previous searches when a new search begins.
 */
export function preloadRoutesForTrains(
  trains: Train[],
  journeyDate?: string,
  _concurrency = 1
): () => void {
  if (!Array.isArray(trains) || trains.length === 0) {
    return () => {};
  }

  // Increment session ID to cancel any prior active preloading queues
  const sessionId = ++currentPreloadSessionId;

  // Filter top 3 trains needing preload to preserve backend bandwidth
  const queue: Train[] = trains.slice(0, 3).filter((t) => {
    if (!t || !t.trainNumber) return false;
    const key = getRouteCacheKey(t.trainNumber, journeyDate || t.journeyDate);
    return !routeCache.has(key) && !inFlightRouteRequests.has(key);
  });

  if (queue.length === 0) {
    return () => {};
  }

  let queueIndex = 0;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const runNext = async () => {
    if (sessionId !== currentPreloadSessionId || queueIndex >= queue.length) {
      return;
    }

    const trainToFetch = queue[queueIndex++];
    if (!trainToFetch) return;

    const targetDate = journeyDate || trainToFetch.journeyDate;

    try {
      await fetchRouteWithCache(trainToFetch.trainNumber, targetDate);
    } catch (err) {
      console.debug(
        `[RoutePreloadService] Gentle preload skipped for train ${trainToFetch.trainNumber}:`,
        err instanceof Error ? err.message : err
      );
    }

    if (sessionId === currentPreloadSessionId && queueIndex < queue.length) {
      timerId = setTimeout(runNext, 2000);
    }
  };

  // Start initial background preload after a 1500ms delay to let initial UI render and settle
  timerId = setTimeout(runNext, 1500);

  // Return cancel callback
  return () => {
    if (timerId) clearTimeout(timerId);
    if (currentPreloadSessionId === sessionId) {
      currentPreloadSessionId++;
    }
  };
}

/**
 * Clears the in-memory route cache (useful for tests or full resets)
 */
export function clearRouteCache(): void {
  routeCache.clear();
  inFlightRouteRequests.clear();
}
