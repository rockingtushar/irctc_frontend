import { Train } from '../types/station';

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

const MONTH_MAP: Record<string, string> = {
  jan: 'Jan', january: 'Jan',
  feb: 'Feb', february: 'Feb',
  mar: 'Mar', march: 'Mar',
  apr: 'Apr', april: 'Apr',
  may: 'May',
  jun: 'Jun', june: 'Jun',
  jul: 'Jul', july: 'Jul',
  aug: 'Aug', august: 'Aug',
  sep: 'Sep', september: 'Sep',
  oct: 'Oct', october: 'Oct',
  nov: 'Nov', november: 'Nov',
  dec: 'Dec', december: 'Dec',
};

export interface NormalizedRouteDate {
  apiDate: string;      // "25-Sep-2026" (expected by POST /api/trains/running-status)
  displayDate: string;  // "25 Sep 2026"
}

/**
 * Normalizes any train journeyDate string (e.g. "Sep 25, 2026 12:00:00 AM",
 * "2026-09-25", or "25-Sep-2026") into the exact API date format ("DD-MMM-YYYY")
 * and an identical, user-facing display string without timezone drift.
 */
export function normalizeJourneyDateForRoute(rawDate?: string): NormalizedRouteDate {
  if (!rawDate || !rawDate.trim()) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const mon = SHORT_MONTHS[now.getMonth()];
    const year = String(now.getFullYear());
    return {
      apiDate: `${day}-${mon}-${year}`,
      displayDate: `${day} ${mon} ${year}`,
    };
  }

  const trimmed = rawDate.trim();

  // 1. Format: "Sep 25, 2026 12:00:00 AM" or "Sep 25, 2026"
  const monthFirstMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/i);
  if (monthFirstMatch) {
    const rawMon = monthFirstMatch[1].toLowerCase();
    const mon = MONTH_MAP[rawMon] || rawMon.slice(0, 3);
    const capitalizedMon = mon.charAt(0).toUpperCase() + mon.slice(1).toLowerCase();
    const day = monthFirstMatch[2].padStart(2, '0');
    const year = monthFirstMatch[3];
    return {
      apiDate: `${day}-${capitalizedMon}-${year}`,
      displayDate: `${day} ${capitalizedMon} ${year}`,
    };
  }

  // 2. Format: "YYYY-MM-DD" (e.g. "2026-09-25")
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const monthNum = parseInt(isoMatch[2], 10);
    const mon = SHORT_MONTHS[Math.max(0, Math.min(11, monthNum - 1))] || 'Jan';
    const day = isoMatch[3].padStart(2, '0');
    return {
      apiDate: `${day}-${mon}-${year}`,
      displayDate: `${day} ${mon} ${year}`,
    };
  }

  // 3. Format: "DD-MMM-YYYY" (e.g. "25-Sep-2026")
  const ddMmmYyyyMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (ddMmmYyyyMatch) {
    const day = ddMmmYyyyMatch[1].padStart(2, '0');
    const rawMon = ddMmmYyyyMatch[2].toLowerCase();
    const mon = MONTH_MAP[rawMon] || rawMon.charAt(0).toUpperCase() + rawMon.slice(1, 3).toLowerCase();
    const year = ddMmmYyyyMatch[3];
    return {
      apiDate: `${day}-${mon}-${year}`,
      displayDate: `${day} ${mon} ${year}`,
    };
  }

  // 4. Fallback: Parse with standard Date
  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const mon = SHORT_MONTHS[parsed.getMonth()] || 'Jan';
      const year = String(parsed.getFullYear());
      return {
        apiDate: `${day}-${mon}-${year}`,
        displayDate: `${day} ${mon} ${year}`,
      };
    }
  } catch {
    // ignore
  }

  return {
    apiDate: trimmed,
    displayDate: trimmed,
  };
}

export interface RunningDayItem {
  key: string;
  dayName: string;
  shortLabel: string;
  runs: boolean;
}

/**
 * Extracts running days from existing Train result fields:
 * runningMon, runningTue, runningWed, runningThu, runningFri, runningSat, runningSun
 */
export function extractTrainRunningDays(train: Train): RunningDayItem[] {
  return [
    { key: 'runningMon', dayName: 'Monday', shortLabel: 'M', runs: train.runningMon === 'Y' },
    { key: 'runningTue', dayName: 'Tuesday', shortLabel: 'T', runs: train.runningTue === 'Y' },
    { key: 'runningWed', dayName: 'Wednesday', shortLabel: 'W', runs: train.runningWed === 'Y' },
    { key: 'runningThu', dayName: 'Thursday', shortLabel: 'T', runs: train.runningThu === 'Y' },
    { key: 'runningFri', dayName: 'Friday', shortLabel: 'F', runs: train.runningFri === 'Y' },
    { key: 'runningSat', dayName: 'Saturday', shortLabel: 'S', runs: train.runningSat === 'Y' },
    { key: 'runningSun', dayName: 'Sunday', shortLabel: 'S', runs: train.runningSun === 'Y' },
  ];
}
