/**
 * Alternate Availability Background Service
 * 
 * Manages background alternate availability searches:
 * 1. Automatically initiates search when WL status is detected.
 * 2. In-memory Map cache with a 15-minute TTL.
 * 3. Handles progressive SSE streams (`alternative_found`, `completed`, `error`).
 * 4. Deduplicates results and prevents duplicate background search jobs.
 * 5. Provides immediate synchronous access to already-received results.
 */

import {
  getApiBaseUrl,
  getCandidateApiUrls,
  SERVER_UNAVAILABLE_MESSAGE,
  normalizeApiError,
  sanitizeBackendError,
} from '../config/apiConfig';
import { getSavedTrainSessionId, startCaptchaSession, toStandardYYYYMMDD } from '../api/trains';
import { DEFAULT_MAJOR_STATIONS } from '../data/defaultStations';
import {
  AlternateAvailabilityRequest,
  AlternateResultItem,
  AlternateSearchState,
  AlternateSearchStatus,
  AlternateStateListener,
} from '../types/alternate';

export const ALTERNATE_CACHE_TTL = 15 * 60 * 1000; // 15 minutes TTL

// In-memory frontend cache
const alternateSearchCache = new Map<string, AlternateSearchState>();

// Active listeners for React component reactivity
const stateListeners = new Map<string, Set<AlternateStateListener>>();

// Active abort controllers to close SSE streams if needed
const activeStreamControllers = new Map<string, AbortController>();

/**
 * Safely extracts a string from potential object/string/null value
 */
function safeString(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    const s = val.trim();
    return s.startsWith('[object') ? fallback : s;
  }
  if (typeof val === 'number') {
    return String(val);
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    const cand = obj.name || obj.station_name || obj.stationName || obj.code || obj.station_code || obj.stationCode || obj.train_number || obj.train_name;
    if (typeof cand === 'string' && !cand.startsWith('[object')) {
      return cand.trim();
    }
  }
  return fallback;
}

/**
 * Extracts station code and station name cleanly from any string or object structure
 */
export function extractStationInfo(
  codeCandidate: unknown,
  nameCandidate: unknown,
  objCandidate?: unknown
): { code: string; name?: string } {
  let code = '';
  let name: string | undefined = undefined;

  // 1. Check if any candidate is an object
  const targetObj = (
    typeof objCandidate === 'object' && objCandidate !== null
      ? objCandidate
      : typeof codeCandidate === 'object' && codeCandidate !== null
      ? codeCandidate
      : typeof nameCandidate === 'object' && nameCandidate !== null
      ? nameCandidate
      : null
  ) as Record<string, unknown> | null;

  if (targetObj) {
    const rawCode = targetObj.code || targetObj.station_code || targetObj.stationCode || targetObj.stn_code || targetObj.stnCode || targetObj.stn;
    if (typeof rawCode === 'string' && !rawCode.startsWith('[object')) {
      code = rawCode.trim().toUpperCase();
    }
    const rawName = targetObj.name || targetObj.station_name || targetObj.stationName || targetObj.stn_name || targetObj.stnName;
    if (typeof rawName === 'string' && !rawName.startsWith('[object')) {
      name = rawName.trim();
    }
  }

  // 2. If codeCandidate is a string
  if (!code && typeof codeCandidate === 'string') {
    const s = codeCandidate.trim();
    if (s && !s.startsWith('[object')) {
      // Check if string contains parentheses like "BANARAS (BNRS)"
      const matchParen = s.match(/^(.*?)\s*\(([A-Z0-9]{2,6})\)$/i);
      if (matchParen) {
        name = name || matchParen[1].trim();
        code = matchParen[2].trim().toUpperCase();
      } else {
        code = s.toUpperCase();
      }
    }
  }

  // 3. If nameCandidate is a string
  if (!name && typeof nameCandidate === 'string') {
    const s = nameCandidate.trim();
    if (s && !s.startsWith('[object')) {
      const matchParen = s.match(/^(.*?)\s*\(([A-Z0-9]{2,6})\)$/i);
      if (matchParen) {
        name = matchParen[1].trim();
        if (!code) code = matchParen[2].trim().toUpperCase();
      } else {
        name = s;
      }
    }
  }

  // 4. Enrich station name from default major stations if missing or equals code
  if (code) {
    if (!name || name.toUpperCase() === code) {
      const known = DEFAULT_MAJOR_STATIONS.find(
        (s) => s.code.toUpperCase() === code.toUpperCase()
      );
      if (known?.name) {
        name = known.name;
      }
    }
  }

  return { code, name };
}

/**
 * Checks if a train availability status indicates a Waitlist
 */
export function isWaitlistStatus(rawStatus?: string | null): boolean {
  if (!rawStatus) return false;
  const upper = rawStatus.trim().toUpperCase();

  // Explicit positive confirmation / available indicators
  if (
    upper.startsWith('AVAILABLE') ||
    upper.includes('CURR_AVBL') ||
    upper === 'CNF' ||
    upper === 'CONFIRMED'
  ) {
    return false;
  }

  // RAC is reserved/sleeper guarantee, not waitlist
  if (upper.startsWith('RAC') || upper.includes('RAC')) {
    return false;
  }

  // Detect any Indian Railways waitlist codes
  return (
    upper.includes('WL') ||
    upper.includes('WAITLIST') ||
    upper.includes('WAITING LIST') ||
    upper.includes('RLWL') ||
    upper.includes('GNWL') ||
    upper.includes('PQWL') ||
    upper.includes('TQWL') ||
    upper.includes('RSWL') ||
    upper.includes('RQWL') ||
    upper.includes('REGRET') ||
    upper.includes('TRAIN DEPARTED') ||
    upper.includes('NOT AVAILABLE')
  );
}

/**
 * Robustly normalizes quota string like "General (GN)" or "GN" to standard 2-letter code "GN"
 */
export function extractQuotaCode(quota?: string | null): string {
  if (!quota) return 'GN';
  const str = String(quota).trim();
  const match = str.match(/\(([A-Z0-9]+)\)/i);
  if (match && match[1]) return match[1].toUpperCase();
  const upper = str.toUpperCase();
  if (upper.startsWith('GN') || upper.includes('GENERAL')) return 'GN';
  if (upper.startsWith('TQ') || upper.includes('TATKAL')) return 'TQ';
  if (upper.startsWith('PT') || upper.includes('PREMIUM')) return 'PT';
  if (upper.startsWith('LD') || upper.includes('LADIES')) return 'LD';
  return upper.replace(/[^A-Z0-9]/g, '') || 'GN';
}

/**
 * Generates a stable unique search key for the booking context
 */
export function generateAlternateSearchKey(params: {
  trainNumber: string;
  journeyDate: string;
  fromCode: string;
  toCode: string;
  travelClass: string;
  quota?: string;
}): string {
  const tNo = String(params.trainNumber || '').trim();
  const date = toStandardYYYYMMDD(params.journeyDate);
  const from = String(params.fromCode || '').trim().toUpperCase();
  const to = String(params.toCode || '').trim().toUpperCase();
  const cls = String(params.travelClass || '').trim().toUpperCase();
  const quota = extractQuotaCode(params.quota);

  return `${tNo}|${date}|${from}|${to}|${cls}|${quota}`;
}

/**
 * Generates a stable deduplication fingerprint for an alternate result item
 */
function generateResultFingerprint(item: AlternateResultItem): string {
  return [
    item.trainNumber || '',
    item.fromStationCode || '',
    item.toStationCode || '',
    item.journeyDate || '',
    item.class || '',
    item.status || '',
    item.type || '',
  ]
    .map((v) => String(v).trim().toUpperCase())
    .join('_');
}

/**
 * Normalizes backend SSE JSON data into a clean AlternateResultItem
 */
export function normalizeAlternateResult(
  raw: Record<string, unknown>,
  fallbackParams?: { trainNumber?: string; class?: string; quota?: string; journeyDate?: string }
): AlternateResultItem {
  const trainNumber = safeString(
    raw.train_number ||
    raw.trainNumber ||
    raw.train_no ||
    raw.trainNo ||
    fallbackParams?.trainNumber,
    ''
  );

  const trainName = safeString(
    raw.train_name ||
    raw.trainName ||
    raw.train_title,
    ''
  ) || undefined;

  // Extract From Station Info cleanly
  const fromInfo = extractStationInfo(
    raw.from_station_code || raw.from_code || raw.fromStationCode || raw.from_stn_code,
    raw.from_station_name || raw.fromStationName || raw.from_name || raw.fromName,
    raw.from_station || raw.fromStation || raw.from || raw.source_station || raw.source
  );

  // Extract To Station Info cleanly
  const toInfo = extractStationInfo(
    raw.to_station_code || raw.to_code || raw.toStationCode || raw.to_stn_code,
    raw.to_station_name || raw.toStationName || raw.to_name || raw.toName,
    raw.to_station || raw.toStation || raw.to || raw.dest_station || raw.destination
  );

  const fromStationCode = fromInfo.code;
  const fromStationName = fromInfo.name;
  const toStationCode = toInfo.code;
  const toStationName = toInfo.name;

  const journeyDate = safeString(
    raw.journey_date ||
    raw.journeyDate ||
    raw.date ||
    fallbackParams?.journeyDate,
    ''
  );

  const cls = safeString(
    raw.class ||
    raw.travel_class ||
    raw.class_code ||
    raw.enqClass ||
    fallbackParams?.class,
    ''
  ).toUpperCase();

  const quota = extractQuotaCode(
    safeString(raw.quota || fallbackParams?.quota, 'GN')
  );

  // 1. Raw status candidate
  let rawStatusStr = safeString(
    raw.status ||
    raw.availability_status ||
    raw.availability ||
    raw.availablityStatus ||
    raw.current_status,
    ''
  );

  // Check days list or avlDayList if status was empty
  if (!rawStatusStr) {
    if (Array.isArray(raw.avlDayList) && raw.avlDayList.length > 0) {
      const d0 = raw.avlDayList[0] as Record<string, unknown>;
      rawStatusStr = safeString(d0.availablityStatus || d0.status || d0.availableSeats, '');
    } else if (Array.isArray(raw.days) && raw.days.length > 0) {
      const d0 = raw.days[0] as Record<string, unknown>;
      rawStatusStr = safeString(d0.status || d0.availablityStatus || d0.availableSeats, '');
    }
  }

  if (!rawStatusStr) {
    rawStatusStr = 'AVAILABLE';
  }

  // 2. Candidate ticket counts from dedicated numeric / string fields
  let parsedTicketCount: number | undefined = undefined;
  const directCountCandidate =
    raw.available_seats ??
    raw.availableSeats ??
    raw.seats ??
    raw.seats_available ??
    raw.seatsAvailable ??
    raw.seat_count ??
    raw.seats_count ??
    raw.ticket_count ??
    raw.tickets ??
    raw.ticketCount ??
    raw.tickets_count ??
    raw.no_of_seats ??
    raw.number_of_seats ??
    raw.count ??
    raw.confirmed_seats ??
    raw.cnf_seats;

  if (typeof directCountCandidate === 'number' && !isNaN(directCountCandidate) && directCountCandidate >= 0) {
    parsedTicketCount = directCountCandidate;
  } else if (typeof directCountCandidate === 'string' && directCountCandidate.trim()) {
    const num = parseInt(directCountCandidate.replace(/[^\d]/g, ''), 10);
    if (!isNaN(num)) {
      parsedTicketCount = num;
    }
  }

  // 3. If no direct numeric field, parse numbers from availability/status string (e.g. "AVAILABLE-0014" -> 14, "AVAILABLE 5" -> 5)
  if (parsedTicketCount === undefined) {
    const textSources = [
      rawStatusStr,
      safeString(raw.availability),
      safeString(raw.availability_status),
      safeString(raw.availablityStatus),
      safeString(raw.current_status),
    ];

    for (const text of textSources) {
      if (!text) continue;
      const numMatch =
        text.match(/(?:AVAILABLE|CURR_AVBL|AVBL|AVL|RAC|WL|GNWL|RLWL|PQWL)[\s\-_]*0*(\d+)/i) ||
        text.match(/(?:CNF|CONFIRMED)[\s\-_]*0*(\d+)/i) ||
        text.match(/0*(\d{1,4})/);
      if (numMatch && numMatch[1]) {
        const num = parseInt(numMatch[1], 10);
        if (!isNaN(num) && num > 0) {
          parsedTicketCount = num;
          break;
        }
      }
    }
  }

  // 4. Clean status formatting & ticketStatusLabel
  const upperStatus = rawStatusStr.toUpperCase();
  let status = rawStatusStr;
  let ticketStatusLabel = '';

  const isNotAvailable =
    upperStatus.includes('NOT AVAILABLE') ||
    upperStatus.includes('NOT-AVAILABLE') ||
    upperStatus.includes('NOT AVBL') ||
    upperStatus.includes('NAVBL') ||
    upperStatus.includes('NOT_AVAILABLE') ||
    upperStatus.includes('REGRET') ||
    upperStatus.includes('CLASS NOT') ||
    upperStatus.includes('CANCEL') ||
    upperStatus.startsWith('NOT') ||
    upperStatus === 'NA';

  if (isNotAvailable) {
    status = 'NOT AVAILABLE';
    ticketStatusLabel = 'Not Available';
  } else if (
    upperStatus.startsWith('AVAILABLE') ||
    upperStatus.includes('AVAILABLE') ||
    upperStatus.includes('CURR_AVBL') ||
    upperStatus.startsWith('AVL') ||
    upperStatus.startsWith('AVBL') ||
    upperStatus === 'CNF'
  ) {
    if (typeof parsedTicketCount === 'number') {
      status = `AVAILABLE ${parsedTicketCount}`;
      ticketStatusLabel = `${parsedTicketCount} Seats Available`;
    } else {
      status = 'AVAILABLE';
      ticketStatusLabel = 'Confirmed Seats Available';
    }
  } else if (upperStatus.includes('RAC')) {
    if (typeof parsedTicketCount === 'number') {
      status = `RAC ${parsedTicketCount}`;
      ticketStatusLabel = `RAC ${parsedTicketCount} (Seat Guaranteed)`;
    } else {
      status = 'RAC';
      ticketStatusLabel = 'RAC Seat Guaranteed';
    }
  } else if (upperStatus.includes('WL')) {
    if (typeof parsedTicketCount === 'number') {
      status = `WL ${parsedTicketCount}`;
      ticketStatusLabel = `Waitlist ${parsedTicketCount}`;
    } else {
      ticketStatusLabel = rawStatusStr;
    }
  } else {
    ticketStatusLabel = rawStatusStr;
  }

  const totalFare =
    typeof raw.total_fare === 'number'
      ? raw.total_fare
      : typeof raw.totalFare === 'number'
      ? raw.totalFare
      : typeof raw.fare === 'number'
      ? raw.fare
      : typeof raw.base_fare === 'number'
      ? raw.base_fare
      : typeof raw.baseFare === 'number'
      ? raw.baseFare
      : undefined;

  const baseFare =
    typeof raw.base_fare === 'number'
      ? raw.base_fare
      : typeof raw.baseFare === 'number'
      ? raw.baseFare
      : undefined;

  const departureTime = raw.departure_time
    ? String(raw.departure_time)
    : raw.departureTime
    ? String(raw.departureTime)
    : raw.dep_time
    ? String(raw.dep_time)
    : undefined;

  const arrivalTime = raw.arrival_time
    ? String(raw.arrival_time)
    : raw.arrivalTime
    ? String(raw.arrivalTime)
    : raw.arr_time
    ? String(raw.arr_time)
    : undefined;

  const duration = raw.duration ? String(raw.duration) : undefined;

  const distanceKm =
    typeof raw.distance_km === 'number'
      ? raw.distance_km
      : typeof raw.distance === 'number'
      ? raw.distance
      : typeof raw.distanceKm === 'number'
      ? raw.distanceKm
      : undefined;

  const type = raw.type
    ? String(raw.type)
    : raw.alternative_type
    ? String(raw.alternative_type)
    : raw.strategy
    ? String(raw.strategy)
    : undefined;

  const description = raw.description
    ? String(raw.description)
    : raw.message
    ? String(raw.message)
    : raw.reason
    ? String(raw.reason)
    : undefined;

  const bookingTip = raw.booking_tip
    ? String(raw.booking_tip)
    : raw.bookingTip
    ? String(raw.bookingTip)
    : raw.tip
    ? String(raw.tip)
    : undefined;

  return {
    id: String(raw.id || raw._id || `${trainNumber}_${fromStationCode}_${toStationCode}`),
    trainNumber,
    trainName,
    fromStationCode,
    fromStationName,
    toStationCode,
    toStationName,
    journeyDate,
    class: cls,
    quota,
    status,
    availableSeats: parsedTicketCount ?? status,
    ticketCount: parsedTicketCount,
    ticketStatusLabel,
    totalFare,
    baseFare,
    departureTime,
    arrivalTime,
    duration,
    distanceKm,
    type,
    description,
    bookingTip,
    raw,
  };
}

/**
 * Returns current cached state for a search key, or null if expired/missing
 */
export function getAlternateSearchState(searchKey: string): AlternateSearchState | null {
  const cached = alternateSearchCache.get(searchKey);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    alternateSearchCache.delete(searchKey);
    return null;
  }

  return cached;
}

/**
 * Subscribes a React listener to updates for a specific search key
 */
export function subscribeToAlternateSearch(
  searchKey: string,
  listener: AlternateStateListener
): () => void {
  if (!stateListeners.has(searchKey)) {
    stateListeners.set(searchKey, new Set());
  }
  const listeners = stateListeners.get(searchKey)!;
  listeners.add(listener);

  // Return current state immediately if present
  const current = getAlternateSearchState(searchKey);
  if (current) {
    try {
      listener(current);
    } catch (err) {
      console.error('[AlternateAvailabilityService] Error in subscriber initial callback:', err);
    }
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stateListeners.delete(searchKey);
    }
  };
}

/**
 * Notifies all subscribers of state changes
 */
function notifySubscribers(searchKey: string, state: AlternateSearchState) {
  const listeners = stateListeners.get(searchKey);
  if (listeners) {
    listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[AlternateAvailabilityService] Error notifying subscriber:', err);
      }
    });
  }
}

/**
 * Updates in-memory state and notifies subscribers
 */
function updateState(
  searchKey: string,
  updater: (prev: AlternateSearchState) => Partial<AlternateSearchState>
): AlternateSearchState {
  const existing = alternateSearchCache.get(searchKey) || {
    status: 'idle',
    results: [],
    error: null,
    startedAt: Date.now(),
    expiresAt: Date.now() + ALTERNATE_CACHE_TTL,
    searchKey,
  };

  const partial = updater(existing);

  // Late Event Protection: If search was manually cancelled, reject any updates
  // that would revive it to searching/completed or append late results (unless starting a fresh search)
  if (existing.status === 'cancelled' && partial.status !== 'starting') {
    return existing;
  }

  const updated: AlternateSearchState = {
    ...existing,
    ...partial,
    searchKey,
    // Maintain or extend TTL
    expiresAt: Math.max(existing.expiresAt, Date.now() + ALTERNATE_CACHE_TTL),
  };

  alternateSearchCache.set(searchKey, updated);
  notifySubscribers(searchKey, updated);
  return updated;
}

/**
 * Manually stops an active alternate availability search:
 * 1. Aborts the active SSE stream.
 * 2. Sets status to 'cancelled'.
 * 3. Preserves all already-found results.
 * 4. Prevents late events from reviving or altering the state.
 */
/**
 * Manually stops an active alternate availability search:
 * 1. Sends fire-and-forget POST to backend /api/trains/alternate/cancel/{jobId} to stop server background task.
 * 2. Aborts the active SSE stream & status polling via existing AbortController.
 * 3. Sets status to 'cancelled'.
 * 4. Preserves all already-found results.
 * 5. Prevents late events from reviving or altering the state.
 */
export function stopAlternateAvailability(searchKey: string): void {
  // 1. Get current search state & read existing jobId
  const current = getAlternateSearchState(searchKey);
  const jobId = current?.jobId;
  const isRunning = current && (current.status === 'starting' || current.status === 'searching');
  const isShared = current?.shared === true;

  // 2. Fire-and-forget backend cancellation ONLY if jobId exists, status is active, AND job is NOT shared!
  // If User B is watching User A's shared job, User B clicking Stop should only disconnect
  // their own client connection, and NOT terminate the server task for User A.
  if (jobId && isRunning && !isShared) {
    const cancelCandidateUrls = getCandidateApiUrls(
      `/api/trains/alternate/cancel/${encodeURIComponent(jobId)}`
    );
    // Non-blocking fire-and-forget call; UI cancellation is never delayed
    (async () => {
      for (const url of cancelCandidateUrls) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
            },
          });
          if (res.ok) {
            console.log(`[AlternateAvailabilityService] Backend alternate job ${jobId} cancelled successfully via ${url}`);
            break;
          }
        } catch (err) {
          console.error('[AlternateAvailabilityService] Backend cancellation error:', err);
        }
      }
    })().catch((err) => {
      console.error('[AlternateAvailabilityService] Backend cancel request failed:', err);
    });
  }

  // 3. Immediately abort active SSE stream
  const ctrl = activeStreamControllers.get(searchKey);
  if (ctrl) {
    try {
      ctrl.abort();
    } catch {
      // ignore
    }
    activeStreamControllers.delete(searchKey);
  }

  // 4. Mark state as cancelled without clearing results
  if (isRunning) {
    const updated: AlternateSearchState = {
      ...current,
      status: 'cancelled',
    };
    alternateSearchCache.set(searchKey, updated);
    notifySubscribers(searchKey, updated);
    console.log(`[AlternateAvailabilityService] Search manually cancelled for ${searchKey}`);
  }
}

/**
 * Cancels all active background alternate availability searches and aborts open SSE streams.
 * Frees browser connection pool slots when navigating away from search results.
 */
export function stopAllAlternateSearches(): void {
  const keys = Array.from(activeStreamControllers.keys());
  for (const key of keys) {
    stopAlternateAvailability(key);
  }
  activeStreamControllers.clear();
}

/**
 * Initiates the Alternate Availability search and background SSE stream.
 * 
 * Safe against React re-renders:
 * If a search is already 'starting', 'searching', or 'completed' (and not expired),
 * it immediately returns the existing state and does NOT make duplicate requests.
 */
export async function startAlternateAvailability(params: {
  trainNumber: string;
  fromCode: string;
  toCode: string;
  journeyDate: string;
  travelClass: string;
  quota?: string;
  trainType?: string;
  initialStatus?: string;
  sessionId?: string;
  forceRefresh?: boolean;
}): Promise<AlternateSearchState> {
  const cleanFrom = (params.fromCode || '').trim().toUpperCase();
  const cleanTo = (params.toCode || '').trim().toUpperCase();

  const searchKey = generateAlternateSearchKey({
    trainNumber: params.trainNumber,
    journeyDate: params.journeyDate,
    fromCode: cleanFrom,
    toCode: cleanTo,
    travelClass: params.travelClass,
    quota: params.quota,
  });

  // Defensive validation: if actual selected-train source code or destination code is missing
  if (!cleanFrom || !cleanTo) {
    const errorMsg = 'Selected train source or destination station code is missing.';
    console.warn(`[AlternateAvailabilityService] Cannot start alternate search: ${errorMsg}`);
    return updateState(searchKey, () => ({
      status: 'error',
      error: errorMsg,
      startedAt: Date.now(),
      results: [],
    }));
  }

  // 1. Guard against duplicate search: check in-memory cache
  // If forceRefresh is requested, explicitly bypass in-memory cache
  const existing = getAlternateSearchState(searchKey);
  if (
    !params.forceRefresh &&
    existing &&
    (existing.status === 'starting' ||
      existing.status === 'searching' ||
      existing.status === 'completed')
  ) {
    console.log(`[AlternateAvailabilityService] Reusing active/completed search for ${searchKey} (status: ${existing.status})`);
    return existing;
  }

  // If force-refreshing and a stream controller was active, abort it
  if (params.forceRefresh) {
    const activeCtrl = activeStreamControllers.get(searchKey);
    if (activeCtrl) {
      try {
        activeCtrl.abort();
      } catch {
        // ignore
      }
      activeStreamControllers.delete(searchKey);
    }
  }

  // 2. Initialize starting state in memory (fresh search starts with empty results)
  const initial = updateState(searchKey, () => ({
    status: 'starting',
    error: null,
    startedAt: Date.now(),
    results: params.forceRefresh ? [] : existing?.results || [],
    cached: undefined,
    shared: undefined,
  }));

  // Execute background job (asynchronous & non-blocking)
  runAlternateJobInBackground(searchKey, params).catch((err) => {
    console.error(`[AlternateAvailabilityService] Job failed for ${searchKey}:`, err);
  });

  return initial;
}

interface StartJobResult {
  isCacheHit?: boolean;
  jobId?: string | null;
  baseUrl?: string;
  shared?: boolean;
  streamUrl?: string;
  statusUrl?: string;
}

/**
 * Background worker that starts the job on backend and opens SSE stream
 */
async function runAlternateJobInBackground(
  searchKey: string,
  params: {
    trainNumber: string;
    fromCode: string;
    toCode: string;
    journeyDate: string;
    travelClass: string;
    quota?: string;
    trainType?: string;
    initialStatus?: string;
    sessionId?: string;
    forceRefresh?: boolean;
  }
): Promise<void> {
  let baseSessionId = params.sessionId || getSavedTrainSessionId() || '';
  const cleanTrainNumber = String(params.trainNumber || '').trim().padStart(5, '0');
  const cleanFromCode = String(params.fromCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanToCode = String(params.toCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanJourneyDate = toStandardYYYYMMDD(params.journeyDate);
  const cleanClass = String(params.travelClass || '').trim().toUpperCase();
  const cleanQuota = extractQuotaCode(params.quota);

  if (!cleanFromCode || !cleanToCode) {
    const errMsg = 'Selected train source or destination station code is missing.';
    updateState(searchKey, () => ({
      status: 'error',
      error: errMsg,
      results: [],
    }));
    return;
  }

  // If no session_id exists in storage, immediately fetch a fresh session from backend
  if (!baseSessionId) {
    try {
      const captchaStart = await startCaptchaSession();
      if (captchaStart.session_id) {
        baseSessionId = captchaStart.session_id;
      }
    } catch (err) {
      console.warn('[AlternateAvailabilityService] Failed to acquire initial session for alternate search:', err);
    }
  }

  const startEndpoints = getCandidateApiUrls('/api/trains/alternate/start');
  let jobId: string | null = null;
  let successfulBaseUrl = '';
  let lastStartError: Error | null = null;

  const tryStartJob = async (sessionIdToUse: string): Promise<StartJobResult | null> => {
    if (!sessionIdToUse) return null;

    const payload: AlternateAvailabilityRequest = {
      session_id: sessionIdToUse,
      train_number: cleanTrainNumber,
      from_code: cleanFromCode,
      to_code: cleanToCode,
      journey_date: cleanJourneyDate,
      travel_class: cleanClass,
      quota: cleanQuota,
      train_type: params.trainType || null,
      initial_status: params.initialStatus || null,
      force_refresh: params.forceRefresh ?? false,
    };

    for (const url of startEndpoints) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = (await res.json()) as Record<string, unknown>;

          // CASE A: REDIS CACHE HIT (data.cached === true or status is completed with results)
          if (data.cached === true || (data.status === 'completed' && Array.isArray(data.results))) {
            const rawResults = Array.isArray(data.results) ? data.results : [];
            const normalizedResults: AlternateResultItem[] = [];
            const seenFp = new Set<string>();

            const fallbackParams = {
              trainNumber: cleanTrainNumber,
              class: cleanClass,
              quota: cleanQuota,
              journeyDate: cleanJourneyDate,
            };

            for (const item of rawResults) {
              if (item && typeof item === 'object') {
                const norm = normalizeAlternateResult(item as Record<string, unknown>, fallbackParams);
                const fp = generateResultFingerprint(norm);
                if (!seenFp.has(fp)) {
                  seenFp.add(fp);
                  normalizedResults.push(norm);
                }
              }
            }

            const checked = typeof data.checked === 'number' ? data.checked : undefined;
            const total = typeof data.total === 'number' ? data.total : undefined;
            const found = typeof data.found === 'number' ? data.found : normalizedResults.length;
            const errors = typeof data.errors === 'number' ? data.errors : 0;
            const fetchedAt =
              typeof data.fetched_at === 'string'
                ? data.fetched_at
                : typeof data.fetchedAt === 'string'
                ? data.fetchedAt
                : new Date().toISOString();

            updateState(searchKey, () => ({
              status: 'completed',
              cached: true,
              shared: false,
              jobId: undefined,
              results: normalizedResults,
              fetchedAt,
              checked,
              total,
              found,
              errors,
              progress:
                typeof total === 'number' && total > 0
                  ? {
                      checked: checked ?? total,
                      total,
                      percent: 100,
                      remaining: 0,
                    }
                  : undefined,
              error: null,
            }));

            console.log(
              `[AlternateAvailabilityService] Redis cache hit for ${searchKey}: ${normalizedResults.length} alternatives, fetchedAt: ${fetchedAt}`
            );
            return { isCacheHit: true };
          }

          // CASE B & C: SHARED RUNNING JOB OR NEW LIVE JOB
          const receivedJobId =
            typeof data.job_id === 'string'
              ? data.job_id
              : typeof data.jobId === 'string'
              ? data.jobId
              : null;

          if (receivedJobId) {
            let matchedBase = '';
            if (url.startsWith('http://') || url.startsWith('https://')) {
              try {
                matchedBase = new URL(url).origin;
              } catch {
                matchedBase = '';
              }
            }

            const isShared = data.shared === true;
            const streamUrl = typeof data.stream_url === 'string' ? data.stream_url : undefined;
            const statusUrl = typeof data.status_url === 'string' ? data.status_url : undefined;

            return {
              isCacheHit: false,
              jobId: receivedJobId,
              baseUrl: matchedBase,
              shared: isShared,
              streamUrl,
              statusUrl,
            };
          }
        } else {
          const errBody = await res.json().catch(() => null);
          const msg = errBody?.detail || errBody?.message || res.statusText;
          lastStartError = new Error(`HTTP ${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);

          // If session expired (401 / 404 / 422), return null to trigger retry with fresh session
          if (res.status === 401 || res.status === 404 || (res.status === 422 && String(msg).includes('session_id'))) {
            return null;
          }
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'));
        if (!isAbort) {
          lastStartError = err instanceof Error ? err : new Error(String(err));
        }
      }
    }
    return null;
  };

  // 1st attempt with current session
  let startResult: StartJobResult | null = await tryStartJob(baseSessionId);
  if (startResult?.isCacheHit) {
    // Redis Cache Hit: Results already placed in state and completed. Done!
    return;
  }
  if (startResult?.jobId) {
    jobId = startResult.jobId;
    successfulBaseUrl = startResult.baseUrl || '';
  }

  // If first attempt failed due to session expired or not found, automatically get fresh session and retry
  if (!jobId) {
    console.log('[AlternateAvailabilityService] First start attempt failed or session expired, acquiring fresh session...');
    try {
      const freshCaptcha = await startCaptchaSession();
      if (freshCaptcha?.session_id) {
        baseSessionId = freshCaptcha.session_id;
        startResult = await tryStartJob(baseSessionId);
        if (startResult?.isCacheHit) {
          return;
        }
        if (startResult?.jobId) {
          jobId = startResult.jobId;
          successfulBaseUrl = startResult.baseUrl || '';
        }
      }
    } catch (sessionErr) {
      console.warn('[AlternateAvailabilityService] Failed to get fresh session for retry:', sessionErr);
    }
  }

  if (!jobId) {
    const errMsg = normalizeApiError(lastStartError, SERVER_UNAVAILABLE_MESSAGE);
    console.warn(`[AlternateAvailabilityService] Could not start alternate search:`, errMsg);
    updateState(searchKey, (prev) => ({
      status: 'error',
      error: errMsg,
    }));
    return;
  }

  // Update state to 'searching' with shared/stream metadata
  updateState(searchKey, (prev) => ({
    status: 'searching',
    jobId: jobId!,
    shared: startResult?.shared === true,
    cached: false,
    streamUrl: startResult?.streamUrl,
    statusUrl: startResult?.statusUrl,
    error: null,
  }));

  // Step 2: Open SSE Stream and Poll status in parallel for immediate completion detection
  const previousCtrl = activeStreamControllers.get(searchKey);
  if (previousCtrl) {
    previousCtrl.abort();
  }

  const sseAbortCtrl = new AbortController();
  activeStreamControllers.set(searchKey, sseAbortCtrl);

  const fallbackParams = {
    trainNumber: cleanTrainNumber,
    class: cleanClass,
    quota: cleanQuota,
    journeyDate: cleanJourneyDate,
  };

  // Launch lightweight status polling concurrently to bypass any proxy SSE buffering
  pollAlternateJobStatus(
    searchKey,
    jobId!,
    fallbackParams,
    sseAbortCtrl.signal,
    successfulBaseUrl,
    startResult?.statusUrl
  ).catch((err) => {
    console.warn('[AlternateAvailabilityService] Status polling warning:', err);
  });

  // Launch SSE stream reader
  await connectToAlternateSseStream(
    searchKey,
    jobId!,
    fallbackParams,
    sseAbortCtrl,
    successfulBaseUrl,
    startResult?.streamUrl
  );
}

/**
 * Concurrent status poller for /api/trains/alternate/status/{job_id}
 * Ensures status progress detection without aborting active SSE connections.
 */
async function pollAlternateJobStatus(
  searchKey: string,
  jobId: string,
  fallbackParams: { trainNumber: string; class: string; quota: string; journeyDate: string },
  signal: AbortSignal,
  baseUrl = '',
  statusUrlOverride?: string
): Promise<void> {
  const statusEndpoints: string[] = [];
  if (statusUrlOverride) {
    if (statusUrlOverride.startsWith('http://') || statusUrlOverride.startsWith('https://')) {
      statusEndpoints.push(statusUrlOverride);
    } else {
      if (baseUrl) {
        statusEndpoints.push(`${baseUrl}${statusUrlOverride.startsWith('/') ? '' : '/'}${statusUrlOverride}`);
      }
      for (const c of getCandidateApiUrls(statusUrlOverride)) {
        if (!statusEndpoints.includes(c)) {
          statusEndpoints.push(c);
        }
      }
    }
  }
  if (baseUrl) {
    statusEndpoints.push(`${baseUrl}/api/trains/alternate/status/${jobId}`);
  }
  for (const c of getCandidateApiUrls(`/api/trains/alternate/status/${jobId}`)) {
    if (!statusEndpoints.includes(c)) {
      statusEndpoints.push(c);
    }
  }
  const statusUrl = statusEndpoints[0];
  const maxPolls = 20; // 24 seconds max
  let pollCount = 0;

  const seenFingerprints = new Set<string>();
  const current = getAlternateSearchState(searchKey);
  if (current?.results) {
    current.results.forEach((r) => seenFingerprints.add(generateResultFingerprint(r)));
  }

  while (!signal.aborted && pollCount < maxPolls) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (signal.aborted) break;

    const currentState = getAlternateSearchState(searchKey);
    if (!currentState || currentState.status === 'completed' || currentState.status === 'error' || currentState.status === 'cancelled') {
      break;
    }

    pollCount++;

    try {
      const res = await fetch(statusUrl, {
        headers: {
          'Accept': 'application/json',
          'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
        },
        signal,
      });

      if (!res.ok) {
        if (res.status === 404 || res.status === 410) {
          // Job not found on backend (e.g. expired or invalid job_id)
          break;
        }
        continue;
      }

      const data = (await res.json()) as Record<string, unknown>;

      // Check if job is expired or not found
      if (typeof data.detail === 'string' && data.detail.toLowerCase().includes('not found')) {
        break;
      }

      // Track live progress stats
      const checked = typeof data.checked === 'number' ? data.checked : undefined;
      const total = typeof data.total === 'number' ? data.total : undefined;
      const remaining = typeof data.remaining === 'number' ? data.remaining : undefined;

      if (typeof checked === 'number' && typeof total === 'number' && total > 0) {
        updateState(searchKey, (prev) => ({
          progress: {
            checked,
            total,
            remaining,
            percent: Math.round((checked / total) * 100),
          },
        }));
      }

      // Check alternatives in status response if any
      const rawAlts = Array.isArray(data.alternatives)
        ? data.alternatives
        : Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.data)
        ? data.data
        : null;

      if (rawAlts && rawAlts.length > 0) {
        const newResults: AlternateResultItem[] = [];
        for (const item of rawAlts) {
          if (item && typeof item === 'object') {
            const normalized = normalizeAlternateResult(item as Record<string, unknown>, fallbackParams);
            const fp = generateResultFingerprint(normalized);
            if (!seenFingerprints.has(fp)) {
              seenFingerprints.add(fp);
              newResults.push(normalized);
            }
          }
        }
        if (newResults.length > 0) {
          updateState(searchKey, (prev) => ({
            results: [...prev.results, ...newResults],
          }));
        }
      }

      // Check status completion
      const statusStr = String(data.status || '').toLowerCase();
      if (statusStr === 'completed' || statusStr === 'done' || statusStr === 'finished') {
        console.log(`[AlternateAvailabilityService] Status poller detected completed in ${pollCount} polls for ${searchKey}`);
        // Allow SSE stream 2.5 seconds to receive its own completed event; if it doesn't, finalize state and release connection
        setTimeout(() => {
          const ctrl = activeStreamControllers.get(searchKey);
          if (ctrl) {
            try {
              ctrl.abort();
            } catch {
              // ignore
            }
            activeStreamControllers.delete(searchKey);
          }
          const s = getAlternateSearchState(searchKey);
          if (s && s.status === 'searching') {
            updateState(searchKey, () => ({ status: 'completed' }));
          }
        }, 2500);
        break;
      }

      if (statusStr === 'error' || statusStr === 'failed') {
        updateState(searchKey, (prev) => ({
          status: prev.results.length > 0 ? 'completed' : 'error',
          error: String(data.error || data.message || 'Alternate search encountered an error'),
        }));
        break;
      }
    } catch {
      // Continue polling loop
    }
  }
}

/**
 * Connects to the SSE stream via fetch + ReadableStream reader
 * (Handles both EventSource protocols and streaming fetch robustly with failover)
 */
async function connectToAlternateSseStream(
  searchKey: string,
  jobId: string,
  fallbackParams: { trainNumber: string; class: string; quota: string; journeyDate: string },
  abortCtrl: AbortController,
  baseUrl = '',
  streamUrlOverride?: string
): Promise<void> {
  const streamEndpoints: string[] = [];
  if (streamUrlOverride) {
    if (streamUrlOverride.startsWith('http://') || streamUrlOverride.startsWith('https://')) {
      streamEndpoints.push(streamUrlOverride);
    } else {
      if (baseUrl) {
        streamEndpoints.push(`${baseUrl}${streamUrlOverride.startsWith('/') ? '' : '/'}${streamUrlOverride}`);
      }
      for (const c of getCandidateApiUrls(streamUrlOverride)) {
        if (!streamEndpoints.includes(c)) {
          streamEndpoints.push(c);
        }
      }
    }
  }
  if (baseUrl) {
    streamEndpoints.push(`${baseUrl}/api/trains/alternate/stream/${jobId}`);
  }
  for (const c of getCandidateApiUrls(`/api/trains/alternate/stream/${jobId}`)) {
    if (!streamEndpoints.includes(c)) {
      streamEndpoints.push(c);
    }
  }
  let connected = false;

  for (const streamUrl of streamEndpoints) {
    if (abortCtrl.signal.aborted) return;

    try {
      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream, application/json',
          'Cache-Control': 'no-cache',
          'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
        },
        signal: abortCtrl.signal,
      });

      if (!response.ok || !response.body) {
        continue;
      }

      connected = true;
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const seenFingerprints = new Set<string>();
      // Seed seen fingerprints from any existing results
      const current = getAlternateSearchState(searchKey);
      if (current?.results) {
        current.results.forEach((r) => seenFingerprints.add(generateResultFingerprint(r)));
      }

      let shouldStopStream = false;

      while (!abortCtrl.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep partial line in buffer

        let currentEvent = 'message';
        let currentData = '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            // Empty line indicates dispatch of SSE message block
            if (currentData) {
              const stop = processSseMessage(
                searchKey,
                currentEvent,
                currentData,
                fallbackParams,
                seenFingerprints
              );
              if (stop) {
                shouldStopStream = true;
                break;
              }
            }
            currentEvent = 'message';
            currentData = '';
            continue;
          }

          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.substring(6).trim();
          } else if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.substring(5).trim();
            currentData = currentData ? `${currentData}\n${dataStr}` : dataStr;
          }
        }

        // Process any leftover message
        if (!shouldStopStream && currentData) {
          const stop = processSseMessage(
            searchKey,
            currentEvent,
            currentData,
            fallbackParams,
            seenFingerprints
          );
          if (stop) {
            shouldStopStream = true;
          }
        }

        if (shouldStopStream) {
          await reader.cancel().catch(() => {});
          break;
        }
      }

      // If stream ended normally or completed
      const state = getAlternateSearchState(searchKey);
      if (state && state.status === 'searching') {
        updateState(searchKey, () => ({
          status: 'completed',
        }));
      }

      break; // Successfully connected and read stream
    } catch (err: unknown) {
      if (abortCtrl.signal.aborted) {
        return;
      }
      console.warn(`[AlternateAvailabilityService] SSE endpoint ${streamUrl} failed, trying next candidate:`, err);
    }
  }

  activeStreamControllers.delete(searchKey);

  if (!connected && !abortCtrl.signal.aborted) {
    const currentState = getAlternateSearchState(searchKey);
    // If we received any results before connection failure, keep status completed or error
    if (currentState && currentState.results.length > 0) {
      updateState(searchKey, () => ({
        status: 'completed',
      }));
    } else {
      updateState(searchKey, () => ({
        status: 'error',
        error: SERVER_UNAVAILABLE_MESSAGE,
      }));
    }
  }
}

/**
 * Dispatches and processes an individual SSE event block
 * Returns true if stream should close immediately (completed or error)
 */
function processSseMessage(
  searchKey: string,
  eventName: string,
  dataStr: string,
  fallbackParams: { trainNumber: string; class: string; quota: string; journeyDate: string },
  seenFingerprints: Set<string>
): boolean {
  try {
    // Late Event Protection: If search was manually cancelled, ignore all SSE events and stop reader
    const currentState = getAlternateSearchState(searchKey);
    if (currentState?.status === 'cancelled') {
      return true; // Stop reading stream immediately
    }

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(dataStr);
    } catch {
      // Non-JSON string data
      parsed = { message: dataStr };
    }

    const payload = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
    const effectiveEvent = String(
      eventName !== 'message'
        ? eventName
        : payload.event || payload.type || payload.status || 'alternative_found'
    ).toLowerCase();

    // 1. EVENT: progress
    if (effectiveEvent === 'progress') {
      const checked = typeof payload.checked === 'number' ? payload.checked : 0;
      const total = typeof payload.total === 'number' ? payload.total : 0;
      const remaining = typeof payload.remaining === 'number' ? payload.remaining : 0;
      const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
      const currentObj = payload.current as Record<string, unknown> | undefined;
      const currentFrom = safeString(currentObj?.from_code || currentObj?.from);
      const currentTo = safeString(currentObj?.to_code || currentObj?.to);

      updateState(searchKey, (prev) => ({
        progress: { checked, total, percent, remaining, currentFrom, currentTo },
        status: 'searching',
      }));
      return false;
    }

    // 2. EVENT: alternative_found (or object containing train / availability details)
    if (
      effectiveEvent === 'alternative_found' ||
      effectiveEvent === 'alternative' ||
      effectiveEvent === 'result' ||
      (payload.train_number && payload.status) ||
      (payload.trainNumber && payload.status)
    ) {
      const resultObj = (payload.data && typeof payload.data === 'object'
        ? (payload.data as Record<string, unknown>)
        : payload.result && typeof payload.result === 'object'
        ? (payload.result as Record<string, unknown>)
        : payload) as Record<string, unknown>;

      const normalized = normalizeAlternateResult(resultObj, fallbackParams);
      const fp = generateResultFingerprint(normalized);

      // Deduplication check
      if (!seenFingerprints.has(fp)) {
        seenFingerprints.add(fp);
        updateState(searchKey, (prev) => ({
          results: [...prev.results, normalized],
          status: prev.status === 'completed' ? 'completed' : 'searching',
        }));
        console.log(`[AlternateAvailabilityService] Stored progressive alternative for ${searchKey}:`, normalized.trainNumber, normalized.fromStationCode, '->', normalized.toStationCode, normalized.status);
      }
      return false;
    }

    // 3. EVENT: completed / finished / end
    if (
      effectiveEvent === 'completed' ||
      effectiveEvent === 'finished' ||
      effectiveEvent === 'done' ||
      effectiveEvent === 'end'
    ) {
      updateState(searchKey, () => ({
        status: 'completed',
      }));
      console.log(`[AlternateAvailabilityService] Search completed for ${searchKey}`);
      return true; // Stop reading stream immediately!
    }

    // 4. EVENT: error / failed
    if (
      effectiveEvent === 'error' ||
      effectiveEvent === 'failed' ||
      effectiveEvent === 'failure'
    ) {
      const rawDetail = payload.message || payload.detail || payload.error;
      const errDetail = sanitizeBackendError(rawDetail);
      updateState(searchKey, (prev) => ({
        status: prev.results.length > 0 ? 'completed' : 'error',
        error: errDetail || SERVER_UNAVAILABLE_MESSAGE,
      }));
      return true; // Stop reading stream immediately!
    }
  } catch (err) {
    console.error('[AlternateAvailabilityService] Error processing SSE line:', err);
  }
  return false;
}
