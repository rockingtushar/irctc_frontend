import { getApiBaseUrl, getCandidateApiUrls } from '../config/apiConfig';
import {
  CaptchaStartResponse,
  CaptchaRefreshResponse,
  TrainSearchRequestBody,
  TrainSearchResponse,
  Train,
  TrainAvailabilityRequestBody,
  TrainAvailabilityData,
  AvailabilityDayItem,
} from '../types/station';

const TRAIN_SESSION_KEY = 'rail_train_session_id';

export class InvalidCaptchaError extends Error {
  constructor(message = 'Incorrect captcha. A new captcha has been loaded.') {
    super(message);
    this.name = 'InvalidCaptchaError';
  }
}

export class SessionExpiredError extends Error {
  constructor(message = 'Session expired, please solve captcha again.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export class TrainApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'TrainApiError';
    this.status = status;
  }
}

/**
 * Gets saved train session ID from localStorage
 */
export function getSavedTrainSessionId(): string | null {
  try {
    return localStorage.getItem(TRAIN_SESSION_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Saves valid train session ID to localStorage
 */
export function saveTrainSessionId(sessionId: string): void {
  try {
    localStorage.setItem(TRAIN_SESSION_KEY, sessionId);
  } catch {
    // fallback
  }
}

/**
 * Clears expired or invalid train session ID
 */
export function clearTrainSessionId(): void {
  try {
    localStorage.removeItem(TRAIN_SESSION_KEY);
  } catch {
    // fallback
  }
}

/**
 * 1. START CAPTCHA SESSION
 * Creates a completely new backend session and gets initial CAPTCHA.
 * POST /api/trains/captcha/start (or candidate endpoints)
 */
export async function startCaptchaSession(): Promise<CaptchaStartResponse> {
  const candidateEndpoints = getCandidateApiUrls('/api/trains/captcha/start');
  const uniqueEndpoints = Array.from(new Set(candidateEndpoints));
  const baseUrl = getApiBaseUrl();

  let lastError: Error | null = null;

  for (const url of uniqueEndpoints) {
    const controller = new AbortController();
    // 25s timeout for fast response
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: CaptchaStartResponse = await response.json();
        if (data.session_id) {
          saveTrainSessionId(data.session_id);
        }
        return data;
      } else if (response.status !== 404) {
        const errBody = await response.json().catch(() => null);
        const msg = errBody?.detail || errBody?.message || response.statusText;
        throw new TrainApiError(`Server error (${response.status}): ${msg}`, response.status);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof TrainApiError) {
        throw err;
      }
      const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'));
      if (!isAbort) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  if (lastError) {
    const msg = lastError.message || 'Failed to fetch';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      throw new TrainApiError(
        `Backend server at ${baseUrl || 'configured endpoint'} is unreachable (Failed to fetch). Ensure your backend server is running and accessible.`,
        0
      );
    }
    throw new TrainApiError(`Unable to start captcha session: ${msg}`, 0);
  }

  throw new TrainApiError(`Could not reach CAPTCHA endpoint on ${baseUrl || 'server'}. Check server status and URL configuration.`, 0);
}

/**
 * 2. REFRESH CAPTCHA
 * Keeps the SAME session_id and refreshes the CAPTCHA image.
 * POST /api/trains/captcha/refresh (or candidate endpoints)
 */
export async function refreshCaptcha(sessionId: string): Promise<CaptchaRefreshResponse> {
  const candidateEndpoints = getCandidateApiUrls('/api/trains/captcha/refresh');
  const uniqueEndpoints = Array.from(new Set(candidateEndpoints));
  const baseUrl = getApiBaseUrl();

  let lastError: Error | null = null;

  for (const url of uniqueEndpoints) {
    const controller = new AbortController();
    // 25s timeout for captcha refresh
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
        },
        body: JSON.stringify({ session_id: sessionId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401 || response.status === 404) {
        clearTrainSessionId();
        throw new SessionExpiredError('Session expired or not found on server, please start new captcha.');
      }

      if (response.ok) {
        const data: CaptchaRefreshResponse = await response.json();
        return data;
      } else {
        const errBody = await response.json().catch(() => null);
        const msg = errBody?.detail || errBody?.message || response.statusText;
        throw new TrainApiError(`Failed to refresh captcha: ${msg}`, response.status);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof SessionExpiredError || err instanceof TrainApiError) {
        throw err;
      }
      const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'));
      if (!isAbort) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  if (lastError) {
    const msg = lastError.message || 'Failed to fetch';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      throw new TrainApiError(
        `Backend server at ${baseUrl || 'configured endpoint'} is unreachable. Check your network connection.`,
        0
      );
    }
    throw new TrainApiError(`Failed to refresh captcha: ${msg}`, 0);
  }

  throw new TrainApiError('Unable to refresh captcha from server.', 0);
}

/**
 * 3. SEARCH TRAINS
 * Searches trains between stations with session & captcha.
 * POST /api/trains/search
 */
export async function searchTrains(payload: TrainSearchRequestBody): Promise<Train[]> {
  const candidateEndpoints = getCandidateApiUrls('/api/trains/search');
  const uniqueEndpoints = Array.from(new Set(candidateEndpoints));
  const baseUrl = getApiBaseUrl();

  const formattedPayload = {
    ...payload,
    journey_date: toStandardYYYYMMDD(payload.journey_date),
    captcha_answer: payload.captcha_answer ? payload.captcha_answer.trim() : null,
    session_id: payload.session_id ? payload.session_id.trim() : '',
  };

  console.log('[searchTrains] Submitting live search request for route:', {
    from: formattedPayload.from_code,
    to: formattedPayload.to_code,
    date: formattedPayload.journey_date,
    has_session: !!formattedPayload.session_id,
    has_captcha: !!formattedPayload.captcha_answer,
  });

  let lastError: Error | null = null;

  for (const url of uniqueEndpoints) {
    const controller = new AbortController();
    // 25s timeout for fast response
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
        },
        body: JSON.stringify(formattedPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 400) {
        clearTrainSessionId();
        const errBody = await response.json().catch(() => null);
        const msg = errBody?.detail || errBody?.message || 'Incorrect captcha. A new captcha has been loaded.';
        console.warn('[searchTrains] HTTP 400 returned:', msg);
        if (typeof msg === 'string' && msg.toLowerCase().includes('captcha answer required')) {
          throw new SessionExpiredError('Captcha answer required.');
        }
        throw new InvalidCaptchaError(typeof msg === 'string' ? msg : 'Incorrect captcha. A new captcha has been loaded.');
      }

      if (response.status === 401) {
        // Session expired: old session discarded
        clearTrainSessionId();
        throw new SessionExpiredError('Session expired, please solve captcha again.');
      }

      if (response.status === 404) {
        // Continue to candidate fallback
        continue;
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const msg = errBody?.detail || errBody?.message || `Server returned HTTP ${response.status} (${response.statusText})`;
        throw new TrainApiError(
          typeof msg === 'string' && msg ? msg : 'Unable to fetch trains right now. Please try again.',
          response.status
        );
      }

      const data: TrainSearchResponse = await response.json();
      console.log('[searchTrains] Successful response with trains:', data.trains?.length || 0);

      // Ensure session persistence upon success
      if (payload.session_id) {
        saveTrainSessionId(payload.session_id);
      }
      return data.trains || [];
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof InvalidCaptchaError || error instanceof SessionExpiredError || error instanceof TrainApiError) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (lastError) {
    const errMessage = lastError.message || 'Failed to fetch';
    if (errMessage.includes('Failed to fetch') || errMessage.includes('NetworkError')) {
      throw new TrainApiError(
        `Backend server is waking up or dropped connection (Failed to fetch). Please tap Search again.`,
        0
      );
    }
    throw new TrainApiError(`Connection error: ${errMessage}`, 0);
  }

  throw new TrainApiError('Search endpoint not reachable on backend server.', 0);
}

export function toStandardYYYYMMDD(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const s = dateStr.trim();
  // If already standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }
  // If DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  // If YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // Attempt standard JS Date parsing
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return s;
}

/**
 * Normalizes backend availability response from various potential wrapper formats
 */
function normalizeAvailabilityResponse(
  rawJson: Record<string, unknown>,
  payload: TrainAvailabilityRequestBody
): TrainAvailabilityData {
  const avlWrapper = (rawJson.availability && typeof rawJson.availability === 'object'
    ? (rawJson.availability as Record<string, unknown>)
    : null) || rawJson;

  let rawDays: unknown[] = [];
  if (Array.isArray(rawJson.days)) {
    rawDays = rawJson.days;
  } else if (Array.isArray(avlWrapper.days)) {
    rawDays = avlWrapper.days as unknown[];
  } else if (Array.isArray(avlWrapper.avlDayList)) {
    rawDays = avlWrapper.avlDayList as unknown[];
  } else if (Array.isArray(rawJson.avlDayList)) {
    rawDays = rawJson.avlDayList as unknown[];
  }

  const days: AvailabilityDayItem[] = rawDays.map((item) => {
    if (!item || typeof item !== 'object') {
      return {
        date: payload.journey_date,
        status: String(item || 'Unknown'),
      };
    }
    const itemObj = item as Record<string, unknown>;
    const date = String(itemObj.date || itemObj.availabilityDate || itemObj.availablityDate || payload.journey_date);
    const status = String(itemObj.status || itemObj.availabilityStatus || itemObj.availablityStatus || itemObj.availablityType || 'Unknown');

    return {
      date,
      status,
      reasonType: itemObj.reasonType ? String(itemObj.reasonType) : undefined,
      reason: itemObj.reason ? String(itemObj.reason) : undefined,
      availabilityType: (itemObj.availabilityType as number | string | undefined),
      currentBookingFlag: itemObj.currentBookingFlag ? String(itemObj.currentBookingFlag) : undefined,
      waitListType: (itemObj.waitListType as number | string | undefined),
      ...itemObj,
    };
  });

  const fareObj = (rawJson.fare && typeof rawJson.fare === 'object' ? rawJson.fare as Record<string, unknown> : null);

  const totalFare =
    typeof rawJson.totalFare === 'number'
      ? rawJson.totalFare
      : typeof fareObj?.totalFare === 'number'
      ? (fareObj.totalFare as number)
      : typeof fareObj?.totalCollectibleAmount === 'number'
      ? (fareObj.totalCollectibleAmount as number)
      : typeof avlWrapper.totalFare === 'number'
      ? (avlWrapper.totalFare as number)
      : typeof rawJson.baseFare === 'number'
      ? rawJson.baseFare
      : typeof fareObj?.baseFare === 'number'
      ? (fareObj.baseFare as number)
      : undefined;

  const baseFare =
    typeof rawJson.baseFare === 'number'
      ? rawJson.baseFare
      : typeof fareObj?.baseFare === 'number'
      ? (fareObj.baseFare as number)
      : typeof avlWrapper.baseFare === 'number'
      ? (avlWrapper.baseFare as number)
      : undefined;

  const fetchedAt =
    rawJson.fetchedAt ||
    avlWrapper.fetchedAt ||
    new Date().toISOString();

  return {
    trainNumber: String(rawJson.trainNumber || rawJson.trainNo || avlWrapper.trainNo || payload.train_number),
    trainName: rawJson.trainName ? String(rawJson.trainName) : avlWrapper.trainName ? String(avlWrapper.trainName) : undefined,
    class: String(rawJson.class || rawJson.enqClass || avlWrapper.enqClass || payload.travel_class || payload.class_code),
    quota: String(rawJson.quota || avlWrapper.quota || payload.quota),
    days,
    result: rawJson.result,
    raw: rawJson.raw,
    totalFare,
    baseFare,
    fetchedAt: (fetchedAt as string | number),
    ...rawJson,
  };
}

/**
 * 4. FETCH LIVE AVAILABILITY FOR A SINGLE SPECIFIC TRAIN + CLASS
 * Calls backend POST /api/trains/availability strictly on-demand.
 */
export async function fetchTrainAvailability(
  payload: TrainAvailabilityRequestBody
): Promise<TrainAvailabilityData> {
  const candidateEndpoints = getCandidateApiUrls('/api/trains/availability');
  const uniqueEndpoints = Array.from(new Set(candidateEndpoints));
  const baseUrl = getApiBaseUrl();

  // Prepare standard payload matching FastAPI schema expectations
  const baseSessionId = payload.session_id || getSavedTrainSessionId() || '';
  const cleanTrainNumber = String(payload.train_number || '').trim();
  const cleanFromCode = String(payload.from_code || '').trim().toUpperCase();
  const cleanToCode = String(payload.to_code || '').trim().toUpperCase();
  // Convert any journey_date format into strict YYYY-MM-DD for backend convert_date_to_dd_mm_yyyy validation
  const cleanJourneyDate = toStandardYYYYMMDD(payload.journey_date);
  const cleanQuota = String(payload.quota || 'GN').trim().toUpperCase();
  const cleanTrainType = payload.train_type || '';
  const cleanClass = String(payload.travel_class || payload.class_code || '').trim().toUpperCase();

  const requestBody = {
    session_id: baseSessionId,
    train_number: cleanTrainNumber,
    from_code: cleanFromCode,
    to_code: cleanToCode,
    journey_date: cleanJourneyDate,
    travel_class: cleanClass,
    class_code: cleanClass,
    quota: cleanQuota,
    train_type: cleanTrainType,
  };

  console.log('[fetchTrainAvailability] Submitting availability request payload:', requestBody);

  let lastError: Error | null = null;

  for (const url of candidateEndpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        clearTrainSessionId();
        throw new SessionExpiredError('Session expired. Please search again.');
      }

      if (response.status === 422) {
        const errBody = await response.json().catch(() => null);
        console.error('[fetchTrainAvailability] 422 Unprocessable Entity details:', errBody);
        let detailMsg = 'Invalid request parameters for availability.';
        if (Array.isArray(errBody?.detail)) {
          detailMsg = errBody.detail
            .map((d: { loc?: string[]; msg?: string; type?: string }) => {
              const field = d.loc && d.loc.length > 0 ? d.loc[d.loc.length - 1] : 'field';
              return `${field}: ${d.msg}`;
            })
            .join(' | ');
        } else if (typeof errBody?.detail === 'string') {
          detailMsg = errBody.detail;
        }
        throw new TrainApiError(`Validation Error (422): ${detailMsg}`, 422);
      }

      if (response.status === 400) {
        const errBody = await response.json().catch(() => null);
        const msg =
          errBody?.detail ||
          errBody?.message ||
          `Failed to fetch seat availability for class ${payload.class_code}.`;
        throw new TrainApiError(typeof msg === 'string' ? msg : 'Failed to fetch availability.', 400);
      }

      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const msg =
          errBody?.detail ||
          errBody?.message ||
          `Server returned HTTP ${response.status} (${response.statusText})`;
        throw new TrainApiError(
          typeof msg === 'string' && msg ? msg : `Unable to fetch availability for ${payload.class_code}.`,
          response.status
        );
      }

      const rawJson = (await response.json()) as Record<string, unknown>;
      const normalizedData = normalizeAvailabilityResponse(rawJson, payload);
      console.log(
        `[fetchTrainAvailability] Successfully loaded availability for ${payload.train_number} - ${payload.class_code}:`,
        normalizedData.days?.length || 0,
        'days'
      );
      return normalizedData;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof SessionExpiredError || error instanceof TrainApiError) {
        throw error;
      }
      const isAbort = error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'));
      if (isAbort) {
        lastError = new Error('Request timed out after 15 seconds. Please try again.');
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
  }

  if (lastError) {
    const errMessage = lastError.message || 'Failed to fetch';
    if (errMessage.includes('Failed to fetch') || errMessage.includes('NetworkError')) {
      throw new TrainApiError(
        `Backend server at ${baseUrl} is unreachable or dropped connection. Please ensure your FastAPI backend is running and tunnel/port is active.`,
        0
      );
    }
    throw new TrainApiError(`Availability Error: ${errMessage}`, 0);
  }

  throw new TrainApiError('Availability endpoint not reachable on backend server.', 0);
}
