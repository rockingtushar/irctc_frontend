import { getApiBaseUrl, getCandidateApiUrls } from '../config/apiConfig';
import {
  RunningStatusRequestBody,
  RunningStatusResponse,
  RunningStatusData,
  RunningStatusStation,
} from '../types/runningStatus';
import { arrTrainList } from '../data/train_data.js';

export class RunningStatusApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'RunningStatusApiError';
    this.status = status;
  }
}

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats a Date object or YYYY-MM-DD string into backend expected DD-MMM-YYYY format (e.g. "15-Sep-2026")
 */
export function formatDateToDDMMMYYYY(input?: Date | string): string {
  if (!input) {
    return formatSingleDate(new Date());
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    // If already in DD-MMM-YYYY format (e.g. "14-Sep-2026")
    if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      const day = parts[0]?.padStart(2, '0') || '01';
      const rawMonth = parts[1] || 'Jan';
      const mon = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1).toLowerCase();
      return `${day}-${mon}-${parts[2] || '2026'}`;
    }

    // If YYYY-MM-DD format (standard HTML date input)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [yearStr, monthStr, dayStr] = trimmed.split('-');
      const year = parseInt(yearStr, 10);
      const monthIdx = parseInt(monthStr, 10) - 1;
      const day = dayStr.padStart(2, '0');
      const mon = SHORT_MONTHS[monthIdx] || 'Jan';
      return `${day}-${mon}-${year}`;
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return formatSingleDate(parsed);
    }
    return trimmed;
  }

  return formatSingleDate(input);
}

function formatSingleDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const mon = SHORT_MONTHS[d.getMonth()] || 'Jan';
  const year = d.getFullYear();
  return `${day}-${mon}-${year}`;
}

/**
 * Normalizes live railway running status data to guarantee all stations, sequences,
 * and current station positions are properly populated.
 */
function normalizeRunningStatusData(raw: RunningStatusData): RunningStatusData {
  const data = { ...raw };

  if (!Array.isArray(data.stations)) {
    data.stations = [];
  }

  // Ensure clean stations sorted by sequence with non-null station_code
  data.stations = data.stations.map((s, idx) => {
    const seq = s.sequence ?? idx + 1;
    const rawCode = (s.station_code || '').trim();
    const cleanName = (s.station_name || `Station ${seq}`).trim();
    const fallbackCode = cleanName.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') || `STN${seq}`;

    const rawDist = (s as any).distance_km;
    const distance_km =
      typeof rawDist === 'number'
        ? rawDist
        : typeof rawDist === 'string' && rawDist.trim() !== '' && !isNaN(Number(rawDist))
        ? Number(rawDist)
        : null;

    const rawStatus = (s.status || '').trim();
    const isNonStopping =
      s.is_stopping === false ||
      rawStatus.toLowerCase().replace(/-/g, ' ') === 'non stopping' ||
      rawStatus.toLowerCase().replace(/-/g, ' ') === 'non stop';
    const status = isNonStopping
      ? 'Non-Stopping'
      : s.status || (s.delay_minutes ? `${s.delay_minutes} Min` : null);

    return {
      ...s,
      is_stopping: !isNonStopping,
      sequence: seq,
      station_name: cleanName,
      station_code: rawCode || fallbackCode,
      status: status,
      distance_km: distance_km,
    };
  });

  data.stations.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  // Determine current active station
  const hasCurrent = data.stations.some((s) => s.is_current === true);
  if (!hasCurrent && data.stations.length > 0) {
    let targetIdx = -1;
    const statusText = (data.status || '').trim();
    const upperStatus = statusText.toUpperCase();

    // 1. Check if status text contains station code in parentheses: "(LJN)" or "(PPH)"
    if (statusText) {
      const codeMatch = statusText.match(/\(([A-Z0-9]{2,5})\)/i);
      if (codeMatch && codeMatch[1]) {
        const code = codeMatch[1].toUpperCase();
        targetIdx = data.stations.findIndex(
          (s) => s.station_code?.toUpperCase() === code
        );
      }

      // 2. Check if status mentions station name
      if (targetIdx === -1) {
        for (let i = 0; i < data.stations.length; i++) {
          const sName = data.stations[i].station_name?.toUpperCase();
          if (sName && sName.length > 3 && upperStatus.includes(sName)) {
            targetIdx = i;
            break;
          }
        }
      }

      // 3. If arrived at destination / completed journey
      if (
        targetIdx === -1 &&
        (upperStatus.includes('ARRIVED AT') ||
          upperStatus.includes('DESTINATION') ||
          upperStatus.includes('JOURNEY FINISHED'))
      ) {
        targetIdx = data.stations.length - 1;
      }

      // 4. If yet to start
      if (
        targetIdx === -1 &&
        (upperStatus.includes('YET TO START') ||
          upperStatus.includes('NOT STARTED') ||
          upperStatus.includes('STARTS FROM'))
      ) {
        targetIdx = 0;
      }

      // 5. If status has a time (e.g. "Departed from INDARA JN(IAA) at 00:45 16-Sep")
      if (targetIdx === -1) {
        const timeMatch = statusText.match(/at\s+(\d{1,2}):(\d{2})/i);
        if (timeMatch) {
          const statusHour = parseInt(timeMatch[1], 10);
          const statusMinute = parseInt(timeMatch[2], 10);
          const statusTimeMinutes = statusHour * 60 + statusMinute;

          // Find the last station whose actual_time or departure_time is before or near the status time
          for (let i = data.stations.length - 1; i >= 0; i--) {
            const timeStr = data.stations[i].actual_time || data.stations[i].departure_time;
            if (timeStr) {
              const stnTimeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
              if (stnTimeMatch) {
                const sHour = parseInt(stnTimeMatch[1], 10);
                const sMinute = parseInt(stnTimeMatch[2], 10);
                const sTotal = sHour * 60 + sMinute;
                if (sTotal <= statusTimeMinutes + 30) {
                  targetIdx = i;
                  break;
                }
              }
            }
          }
        }
      }
    }

    // Default to last passed station or origin
    if (targetIdx === -1) {
      targetIdx = 0;
    }

    data.stations = data.stations.map((s, idx) => ({
      ...s,
      is_current: idx === targetIdx,
    }));

    if (!data.current_station) {
      const active = data.stations[targetIdx];
      data.current_station = {
        station_name: active.station_name,
        station_code: active.station_code,
        sequence: active.sequence,
        platform: active.platform || null,
      };
    }
  }

  // Remove NTES branding if present in source or status
  if (typeof data.source === 'string' && data.source.toUpperCase().includes('NTES')) {
    data.source = 'Live Railway Tracking System';
  }

  return data;
}

/**
 * Calls POST /api/trains/running-status to retrieve real-time train running status
 */
export async function fetchRunningStatus(
  payload: RunningStatusRequestBody
): Promise<RunningStatusData> {
  const cleanTrainNo = payload.train_no.trim();
  const cleanJourneyDate = formatDateToDDMMMYYYY(payload.journey_date);

  if (!/^\d{5}$/.test(cleanTrainNo)) {
    throw new RunningStatusApiError('Please enter a valid 5-digit train number (e.g. 15132 or 12555).', 400);
  }

  const candidateEndpoints = [
    ...getCandidateApiUrls('/api/trains/running-status'),
    ...getCandidateApiUrls('/trains/running-status'),
  ];

  const uniqueEndpoints = Array.from(new Set(candidateEndpoints));
  const requestBody = {
    train_no: cleanTrainNo,
    journey_date: cleanJourneyDate,
  };

  let lastError: Error | null = null;

  for (const url of uniqueEndpoints) {
    const controller = new AbortController();
    // Allow up to 28 seconds for the live NTES railway scraper to retrieve all station records
    const timeoutId = setTimeout(() => controller.abort(), 28000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Tunnel-Skip-Anti-Abuse-Page': 'true',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        lastError = new RunningStatusApiError(
          `Train ${cleanTrainNo} was not found on live railway servers for ${cleanJourneyDate}.`,
          404
        );
        continue;
      }

      if (response.status === 502) {
        const errBody = await response.json().catch(() => null);
        const detail = typeof errBody?.detail === 'string' ? errBody.detail : '';
        lastError = new RunningStatusApiError(
          detail || `Live NTES tracking record was not found for Train ${cleanTrainNo} on ${cleanJourneyDate}.`,
          502
        );
        continue;
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const msg = errBody?.detail || errBody?.message || `Railway server returned HTTP ${response.status}`;
        lastError = new RunningStatusApiError(String(msg), response.status);
        continue;
      }

      const jsonResult = (await response.json()) as RunningStatusResponse;
      if (jsonResult && jsonResult.success !== false && jsonResult.data) {
        return normalizeRunningStatusData(jsonResult.data);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' || err.message.includes('aborted'));
      if (isAbort) {
        lastError = new RunningStatusApiError(
          'Live railway server request timed out after 28 seconds. Please check your connection or tap Refresh.',
          408
        );
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  // Throw authentic error from backend instead of hiding with fake mock data
  if (lastError) {
    throw lastError;
  }

  throw new RunningStatusApiError(
    `Unable to retrieve live running status for train ${cleanTrainNo}. Please verify the train number and date.`,
    500
  );
}

