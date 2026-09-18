/**
 * Centralized API Service for Indian Railways Chart Prepared & Vacant Berth Availability.
 * Connects to FastAPI backend endpoints:
 *  - POST /chart/train
 *  - POST /chart/coach
 *  - GET /train/schedule/{train_number}
 *
 * Implements in-memory caching and background prefetching for:
 *  - Train Schedules & Route Stops
 *  - Train Chart Vacancy Summaries
 *  - Coach Berth Composition Layouts
 */

import { getApiBaseUrl, getCandidateApiUrls } from '../config/apiConfig';
import {
  ChartTrainRequest,
  ChartTrainResponse,
  ChartTrainData,
  ChartCoachRequest,
  ChartCoachResponse,
  ChartCoachData,
  TrainSchedule,
  TrainScheduleResponse,
  CoachSummary,
} from '../types/chart';
import { normalizeBerthCode } from '../utils/berthUtils';

export class ChartApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ChartApiError';
    this.status = status;
  }
}

/**
 * Normalizes Date string to YYYY-MM-DD
 */
export function formatToYYYYMMDD(input: string | Date | undefined | null): string {
  if (!input) {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  }
  if (input instanceof Date) {
    const year = input.getFullYear();
    const month = String(input.getMonth() + 1).padStart(2, '0');
    const day = String(input.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const trimmed = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

/**
 * Normalizes a train number by removing leading/trailing spaces and non-digits if present.
 */
function cleanTrainNumber(trainNo: string | number | undefined | null): string {
  if (!trainNo) return '';
  const str = String(trainNo).trim();
  const digitMatch = str.match(/\b\d{4,5}\b/);
  if (digitMatch) {
    return digitMatch[0];
  }
  return str.split(/[\s-]/)[0].trim();
}

/**
 * Returns candidate URLs in priority order for maximum resiliency in browser environments.
 */
function getCandidateUrls(endpointPath: string): string[] {
  return getCandidateApiUrls(endpointPath);
}

/**
 * Executes a POST request across candidate URLs until one succeeds or all fail.
 */
async function postChartRequest<T>(endpointPath: string, payload: unknown): Promise<T> {
  const urls = getCandidateUrls(endpointPath);
  let lastError: Error | null = null;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
        },
        body: JSON.stringify(payload),
      });

      // If endpoint not found on this candidate, try next candidate
      if (response.status === 404 && i < urls.length - 1) {
        continue;
      }

      if (!response.ok) {
        let errorMsg = `Server error (HTTP ${response.status})`;
        try {
          const errBody = await response.json();
          if (errBody?.detail) {
            errorMsg = typeof errBody.detail === 'string' ? errBody.detail : JSON.stringify(errBody.detail);
          } else if (errBody?.error) {
            errorMsg = errBody.error;
          } else if (errBody?.message) {
            errorMsg = errBody.message;
          }
        } catch {
          // ignore json parse error
        }
        throw new ChartApiError(errorMsg, response.status);
      }

      const data = await response.json();
      return data as T;
    } catch (err) {
      if (err instanceof ChartApiError) {
        throw err;
      }
      lastError = err as Error;
      // If there are more candidate URLs, continue to next
      if (i < urls.length - 1) {
        continue;
      }
    }
  }

  throw new ChartApiError(
    lastError?.message || 'Unable to connect to Chart server. Please check your network or try again.',
    503
  );
}

/**
 * In-memory cache & deduplication maps for Train Chart Vacancy
 */
const trainChartCache = new Map<string, ChartTrainData>();
const trainChartRequests = new Map<string, Promise<ChartTrainData>>();

/**
 * In-memory cache & deduplication maps for Individual Coach Layouts
 */
const coachChartCache = new Map<string, ChartCoachData>();
const coachChartRequests = new Map<string, Promise<ChartCoachData>>();

/**
 * Generates cache key for a train chart request
 */
export function getTrainChartKey(
  trainNumber: string | number,
  journeyDate: string | Date,
  boardingStation: string
): string {
  const train = cleanTrainNumber(trainNumber);
  const date = formatToYYYYMMDD(journeyDate);
  const stn = (boardingStation || '').trim().toUpperCase();
  return `${train}_${date}_${stn}`;
}

/**
 * Generates cache key for a coach chart request
 */
export function getCoachChartKey(payload: ChartCoachRequest): string {
  const train = cleanTrainNumber(payload.train_number);
  const date = formatToYYYYMMDD(payload.journey_date);
  const stn = (payload.boarding_station || '').trim().toUpperCase();
  const coach = (payload.coach || '').trim().toUpperCase();
  return `${train}_${date}_${stn}_${coach}`;
}

/**
 * Returns cached Train Chart data if available in memory
 */
export function getCachedTrainChart(
  trainNumber: string | number,
  journeyDate: string | Date,
  boardingStation: string
): ChartTrainData | undefined {
  const key = getTrainChartKey(trainNumber, journeyDate, boardingStation);
  return trainChartCache.get(key);
}

/**
 * Returns true if train chart is in memory
 */
export function hasCachedTrainChart(
  trainNumber: string | number,
  journeyDate: string | Date,
  boardingStation: string
): boolean {
  const key = getTrainChartKey(trainNumber, journeyDate, boardingStation);
  return trainChartCache.has(key);
}

/**
 * API 1: Fetch Train Composition & Vacant Berths after Chart Preparation
 * POST /chart/train
 * With instant cache lookup and in-flight request deduplication.
 */
export async function getTrainChart(payload: ChartTrainRequest): Promise<ChartTrainData> {
  const trainNum = cleanTrainNumber(payload.train_number);
  const date = formatToYYYYMMDD(payload.journey_date);
  const station = payload.boarding_station.trim().toUpperCase();

  const cacheKey = getTrainChartKey(trainNum, date, station);

  // 1. Cache hit: Instant 0ms return
  const cached = trainChartCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. Request deduplication: If request is already running in background, return that promise
  const existing = trainChartRequests.get(cacheKey);
  if (existing) {
    return existing;
  }

  const requestBody: ChartTrainRequest = {
    train_number: trainNum,
    journey_date: date,
    boarding_station: station,
  };

  const reqPromise = (async (): Promise<ChartTrainData> => {
    try {
      const response = await postChartRequest<ChartTrainResponse>('/chart/train', requestBody);

      if (!response.success || !response.data) {
        const message =
          response.error ||
          response.data?.error ||
          'Unable to fetch chart information. Please verify the train number, journey date, and boarding station.';
        throw new ChartApiError(message, 400);
      }

      if (response.data.error) {
        throw new ChartApiError(response.data.error, 400);
      }

      const data = response.data;
      // Store in cache
      trainChartCache.set(cacheKey, data);

      // Opportunistically prefetch individual coach layouts in the background
      // Prioritize coaches that have vacant berths
      if (data.coaches && data.coaches.length > 0) {
        const vacantCoaches = data.coaches.filter((c: CoachSummary) => (c.vacant_berths || 0) > 0);
        const candidates = vacantCoaches.length > 0 ? vacantCoaches.slice(0, 3) : data.coaches.slice(0, 2);

        candidates.forEach((c: CoachSummary) => {
          prefetchCoachChart({
            train_number: data.train_number,
            journey_date: data.train_start_date || date,
            boarding_station: data.remote || data.from || station,
            remote_station: data.remote || data.from || station,
            train_source_station: data.from || station,
            travel_class: c.class_code,
            coach: c.coach_name,
          });
        });
      }

      return data;
    } finally {
      trainChartRequests.delete(cacheKey);
    }
  })();

  trainChartRequests.set(cacheKey, reqPromise);
  return reqPromise;
}

/**
 * Background prefetch for Train Chart Vacancy.
 * Fails silently so it never interrupts the user.
 */
export async function prefetchTrainChart(payload: ChartTrainRequest): Promise<ChartTrainData | null> {
  const trainNum = cleanTrainNumber(payload.train_number);
  const date = formatToYYYYMMDD(payload.journey_date);
  const station = payload.boarding_station?.trim().toUpperCase();

  if (!trainNum || !date || !station) {
    return null;
  }

  const cacheKey = getTrainChartKey(trainNum, date, station);
  if (trainChartCache.has(cacheKey)) {
    return trainChartCache.get(cacheKey)!;
  }

  try {
    return await getTrainChart({
      train_number: trainNum,
      journey_date: date,
      boarding_station: station,
    });
  } catch (err) {
    console.debug(`[chartApi] Background chart prefetch for ${trainNum} was deferred:`, err);
    return null;
  }
}

/**
 * Returns cached Coach Chart data if available in memory
 */
export function getCachedCoachChart(payload: ChartCoachRequest): ChartCoachData | undefined {
  const key = getCoachChartKey(payload);
  return coachChartCache.get(key);
}

/**
 * API 2: Fetch Individual Coach Berth Layout and Occupancy Breakdown
 * POST /chart/coach
 * With instant cache lookup and in-flight request deduplication.
 */
export async function getCoachChart(payload: ChartCoachRequest): Promise<ChartCoachData> {
  const cacheKey = getCoachChartKey(payload);

  // 1. Cache hit: instant return
  const cached = coachChartCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. In-flight request deduplication
  const existing = coachChartRequests.get(cacheKey);
  if (existing) {
    return existing;
  }

  const requestBody: ChartCoachRequest = {
    train_number: cleanTrainNumber(payload.train_number),
    journey_date: formatToYYYYMMDD(payload.journey_date),
    boarding_station: payload.boarding_station.trim().toUpperCase(),
    remote_station: (payload.remote_station || payload.boarding_station).trim().toUpperCase(),
    train_source_station: (payload.train_source_station || payload.boarding_station).trim().toUpperCase(),
    travel_class: payload.travel_class.trim().toUpperCase(),
    coach: payload.coach.trim().toUpperCase(),
  };

  const reqPromise = (async (): Promise<ChartCoachData> => {
    try {
      const response = await postChartRequest<ChartCoachResponse>('/chart/coach', requestBody);

      if (!response.success || !response.data) {
        const message =
          response.error ||
          response.data?.error ||
          `Unable to fetch berth layout for coach ${payload.coach}.`;
        throw new ChartApiError(message, 400);
      }

      if (response.data.error) {
        throw new ChartApiError(response.data.error, 400);
      }

      const data = response.data;

      // Normalize and sanitize all berth codes across the coach
      if (data && Array.isArray(data.berths)) {
        data.berths = data.berths.map((b) => {
          const rawCode =
            b.berth_code ||
            (b as unknown as Record<string, unknown>).berthCode ||
            (b as unknown as Record<string, unknown>).berth_type ||
            (b as unknown as Record<string, unknown>).berthType ||
            null;
          const normalized = normalizeBerthCode(
            typeof rawCode === 'string' ? rawCode : null,
            b.berth_no,
            data.class_code
          );
          return {
            ...b,
            berth_code: normalized || (typeof rawCode === 'string' ? rawCode : null),
          };
        });
      }

      coachChartCache.set(cacheKey, data);
      return data;
    } finally {
      coachChartRequests.delete(cacheKey);
    }
  })();

  coachChartRequests.set(cacheKey, reqPromise);
  return reqPromise;
}

/**
 * Background prefetch for Coach Berth Layout
 */
export async function prefetchCoachChart(payload: ChartCoachRequest): Promise<ChartCoachData | null> {
  const cacheKey = getCoachChartKey(payload);
  if (coachChartCache.has(cacheKey)) {
    return coachChartCache.get(cacheKey)!;
  }

  try {
    return await getCoachChart(payload);
  } catch (err) {
    console.debug(`[chartApi] Background coach prefetch for ${payload.coach} was deferred:`, err);
    return null;
  }
}

/**
 * Clears all chart and coach caches (useful for testing or manual refresh)
 */
export function clearAllChartCache(): void {
  trainChartCache.clear();
  coachChartCache.clear();
}

/**
 * Executes a GET request across candidate URLs until one succeeds or all fail.
 */
export async function getChartRequest<T>(endpointPath: string): Promise<T> {
  const urls = getCandidateUrls(endpointPath);
  let lastError: Error | null = null;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
        },
      });

      if (response.status === 404 && i < urls.length - 1) {
        continue;
      }

      if (!response.ok) {
        let errorMsg = `Server error (HTTP ${response.status})`;
        try {
          const errBody = await response.json();
          if (errBody?.detail) {
            errorMsg = typeof errBody.detail === 'string' ? errBody.detail : JSON.stringify(errBody.detail);
          } else if (errBody?.error) {
            errorMsg = errBody.error;
          } else if (errBody?.message) {
            errorMsg = errBody.message;
          }
        } catch {
          // ignore
        }
        throw new ChartApiError(errorMsg, response.status);
      }

      const data = await response.json();
      return data as T;
    } catch (err) {
      if (err instanceof ChartApiError) {
        throw err;
      }
      lastError = err as Error;
      if (i < urls.length - 1) {
        continue;
      }
    }
  }

  throw new ChartApiError(
    lastError?.message || 'Train schedule could not be loaded.',
    503
  );
}

// Re-export schedule methods and cache handlers from trainService
export {
  getTrainSchedule,
  prefetchTrainSchedule,
  getCachedTrainSchedule,
  hasCachedSchedule,
  isScheduleLoading,
  clearScheduleCache,
} from './trainService';
