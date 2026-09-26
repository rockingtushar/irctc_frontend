import { Train } from '../types/station';
import { RunningStatusData } from '../types/runningStatus';
import { fetchTrainRoute } from '../api/runningStatus';

/**
 * Route Cache & Preloading Service
 * 
 * Manages in-memory caching and background preloading of train routes with:
 * - Train-number based cache identity (date-independent route cache)
 * - Deduplication of concurrent requests (shared Promise)
 * - Controlled concurrency (4-6 parallel workers)
 * - Session-based cancellation of outdated background preloads on new searches
 * - Non-poisoning error handling (failed attempts can be retried on click)
 */

// In-memory cache for loaded routes keyed by: `${trainNumber}`
const routeCache = new Map<string, RunningStatusData>();

// In-flight route fetch Promises keyed by: `${trainNumber}`
const inFlightRouteRequests = new Map<string, Promise<RunningStatusData>>();

// Session ID for the active preloading batch to safely cancel stale searches
let currentPreloadSessionId = 0;

/**
 * Generates a unique cache key for a train route based purely on train number
 * e.g. "12559"
 */
export function getRouteCacheKey(trainNumber: string, _rawJourneyDate?: string): string {
  return (trainNumber || '').trim();
}

/**
 * Synchronously retrieves a cached route if available
 */
export function getCachedRoute(trainNumber: string, rawJourneyDate?: string): RunningStatusData | null {
  const key = getRouteCacheKey(trainNumber, rawJourneyDate);
  return routeCache.get(key) || null;
}

/**
 * Checks if a route is already in the cache
 */
export function hasCachedRoute(trainNumber: string, rawJourneyDate?: string): boolean {
  const key = getRouteCacheKey(trainNumber, rawJourneyDate);
  return routeCache.has(key);
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
 * - Calls GET /api/trains/route/{trainNumber} (NO journey_date parameter).
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

  // 1. Instant cache hit
  const cached = routeCache.get(key);
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
      // Calls GET /api/trains/route/{cleanTrainNo} without date
      const data = await fetchTrainRoute(cleanTrainNo);

      // Cache the result upon successful fetch
      routeCache.set(key, data);
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
  concurrency = 5
): () => void {
  if (!Array.isArray(trains) || trains.length === 0) {
    return () => {};
  }

  // Increment session ID to cancel any prior active preloading queues
  const sessionId = ++currentPreloadSessionId;

  // Filter trains needing preload
  const queue: Train[] = trains.filter((t) => {
    if (!t || !t.trainNumber) return false;
    const key = getRouteCacheKey(t.trainNumber, journeyDate || t.journeyDate);
    return !routeCache.has(key) && !inFlightRouteRequests.has(key);
  });

  if (queue.length === 0) {
    return () => {};
  }

  let queueIndex = 0;
  const poolLimit = Math.max(1, Math.min(concurrency, 6));

  const runWorker = async () => {
    while (queueIndex < queue.length) {
      // Check if this preloading session has been superseded by a new search
      if (sessionId !== currentPreloadSessionId) {
        return;
      }

      const trainToFetch = queue[queueIndex++];
      if (!trainToFetch) continue;

      try {
        await fetchRouteWithCache(trainToFetch.trainNumber);
      } catch (err) {
        // Background preloading failures are non-fatal.
        // We log softly and allow manual retry on click without poisoning cache.
        console.debug(
          `[RoutePreloadService] Background preload skipped/failed for train ${trainToFetch.trainNumber}:`,
          err instanceof Error ? err.message : err
        );
      }
    }
  };

  // Launch parallel workers up to concurrency limit
  const activeWorkers = Math.min(poolLimit, queue.length);
  for (let i = 0; i < activeWorkers; i++) {
    // Schedule on microtask queue so current render completes with zero delay
    Promise.resolve().then(() => runWorker());
  }

  // Return cancel callback
  return () => {
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
