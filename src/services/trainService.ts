/**
 * Centralized Train Schedule Service with In-Memory Caching & Request Deduplication.
 * Optimizes schedule loading for instant/perceived-instant performance in Indian Railways UI.
 *
 * Architecture:
 *   getTrainSchedule()
 *       ↓
 *   check in-memory cache (instant return if hit)
 *       ↓
 *   check in-flight request deduplication map (return existing promise)
 *       ↓
 *   request backend: GET /train/schedule/{train_number}
 *       ↓
 *   cache response
 *       ↓
 *   return response
 */

import { TrainSchedule, TrainScheduleResponse } from '../types/chart';
import { getChartRequest, ChartApiError } from './chartApi';

// 1. In-memory cache for loaded train schedules (persists during the frontend session)
const scheduleCache = new Map<string, TrainSchedule>();

// 2. In-flight request deduplication map to prevent multiple simultaneous calls for the same train
const scheduleRequests = new Map<string, Promise<TrainSchedule>>();

/**
 * Normalizes a train number string by extracting the 4 or 5 digit number.
 * Handles inputs like "12560", " 12560 ", or "12560 - SHIV GANGA EXP".
 */
export function normalizeTrainNumber(trainNumber: string | number | undefined | null): string {
  if (!trainNumber) return '';
  const str = String(trainNumber).trim();
  const digitMatch = str.match(/\b\d{4,5}\b/);
  if (digitMatch) {
    return digitMatch[0];
  }
  return str.split(/[\s-]/)[0].trim();
}

/**
 * Synchronously checks if a train schedule is already cached in memory.
 */
export function hasCachedSchedule(trainNumber: string | number): boolean {
  const clean = normalizeTrainNumber(trainNumber);
  if (!clean) return false;
  return scheduleCache.has(clean);
}

/**
 * Returns the cached TrainSchedule if available, or undefined if not cached.
 */
export function getCachedTrainSchedule(trainNumber: string | number): TrainSchedule | undefined {
  const clean = normalizeTrainNumber(trainNumber);
  if (!clean) return undefined;
  return scheduleCache.get(clean);
}

/**
 * Returns true if an HTTP request is currently in-flight for this train number.
 */
export function isScheduleLoading(trainNumber: string | number): boolean {
  const clean = normalizeTrainNumber(trainNumber);
  if (!clean) return false;
  return scheduleRequests.has(clean);
}

/**
 * Fetches the train schedule with transparent cache verification and request deduplication.
 *
 * 1. Checks in-memory cache -> returns immediately if present.
 * 2. Checks in-flight requests -> returns the running Promise if already being fetched.
 * 3. Otherwise calls backend GET /train/schedule/{train_number}, caches result, and resolves.
 */
export async function getTrainSchedule(trainNumber: string | number): Promise<TrainSchedule> {
  const clean = normalizeTrainNumber(trainNumber);
  if (!clean) {
    throw new ChartApiError('Please provide a valid train number.', 400);
  }

  // 1. Cache hit: Return immediately (instant 0ms resolution)
  const cached = scheduleCache.get(clean);
  if (cached) {
    return cached;
  }

  // 2. Request deduplication: If a request is already in-flight for this train, return that promise
  const existingPromise = scheduleRequests.get(clean);
  if (existingPromise) {
    return existingPromise;
  }

  // 3. Initiate backend fetch
  const requestPromise = (async (): Promise<TrainSchedule> => {
    try {
      const response = await getChartRequest<TrainScheduleResponse>(
        `/train/schedule/${encodeURIComponent(clean)}`
      );

      if (!response.success || !response.data) {
        const message = response.error || `Train schedule could not be loaded for train ${clean}.`;
        throw new ChartApiError(message, 404);
      }

      const scheduleData = response.data;

      // Store in in-memory cache for all subsequent lookups in this session
      scheduleCache.set(clean, scheduleData);

      return scheduleData;
    } finally {
      // Remove from in-flight tracker once settled
      scheduleRequests.delete(clean);
    }
  })();

  // Track in-flight request
  scheduleRequests.set(clean, requestPromise);
  return requestPromise;
}

/**
 * Prefetches the train schedule in the background as soon as a train is selected,
 * recognized, or mounted from URL.
 * Catches errors silently to prevent interrupting user actions.
 */
export async function prefetchTrainSchedule(
  trainNumber: string | number
): Promise<TrainSchedule | null> {
  const clean = normalizeTrainNumber(trainNumber);
  if (!clean || clean.length < 4) {
    return null;
  }

  // If already in memory cache, return immediately
  const cached = scheduleCache.get(clean);
  if (cached) {
    return cached;
  }

  try {
    return await getTrainSchedule(clean);
  } catch (err) {
    // Background prefetch should fail gracefully without disrupting UI
    console.debug(`[TrainService] Background prefetch for train ${clean} was not completed:`, err);
    return null;
  }
}

/**
 * Clears the schedule cache (e.g. for testing or explicit manual refresh).
 */
export function clearScheduleCache(): void {
  scheduleCache.clear();
}
