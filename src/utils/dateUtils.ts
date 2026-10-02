/**
 * Date utilities for Indian Railways time calculations (Indian Standard Time - Asia/Kolkata, UTC+5:30)
 */

/**
 * Returns today's date formatted as YYYY-MM-DD in Indian Standard Time (IST)
 */
export function getIndianRailwaysTodayString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 3600000 * 5.5);
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Returns a date shifted by dayOffset from today in Indian Standard Time (YYYY-MM-DD)
 * e.g., -1 for Yesterday, 0 for Today, +1 for Tomorrow
 */
export function getIndianRailwaysShiftedDate(dayOffset: number): string {
  const todayStr = getIndianRailwaysTodayString();
  const [year, month, day] = todayStr.split('-').map((v) => parseInt(v, 10));
  const target = new Date(year, month - 1, day + dayOffset);
  const targetYear = target.getFullYear();
  const targetMonth = String(target.getMonth() + 1).padStart(2, '0');
  const targetDay = String(target.getDate()).padStart(2, '0');
  return `${targetYear}-${targetMonth}-${targetDay}`;
}

/**
 * Checks if a given date (YYYY-MM-DD or DD-MMM-YYYY) is strictly before today in IST
 */
export function isPastDateInIST(dateStr: string): boolean {
  if (!dateStr) return false;
  const todayStr = getIndianRailwaysTodayString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr < todayStr;
  }
  return false;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface TrainJourneyDates {
  departureDateStr: string; // e.g. "Fri, 02 Oct"
  arrivalDateStr: string;   // e.g. "Sat, 03 Oct"
  departureDateISO: string; // e.g. "2026-10-02"
  arrivalDateISO: string;   // e.g. "2026-10-03"
  dayOffset: number;        // e.g. 0, 1, 2
  dayOffsetLabel: string | null; // e.g. null, "+1 Day", "+2 Days"
}

/**
 * Robustly parses a date string in YYYY-MM-DD, DD-MMM-YYYY, or standard ISO formats
 */
export function parseRailwayDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.split(/[-T ]/).map((v) => parseInt(v, 10));
    return new Date(y, m - 1, d);
  }
  const parts = trimmed.split(/[-/ ]/);
  if (parts.length === 3) {
    if (parts[0].length <= 2 && parts[2].length === 4) {
      const d = parseInt(parts[0], 10);
      const y = parseInt(parts[2], 10);
      const mIdx = SHORT_MONTHS.findIndex((mn) => mn.toLowerCase() === parts[1].toLowerCase());
      if (mIdx !== -1) {
        return new Date(y, mIdx, d);
      }
      const m = parseInt(parts[1], 10);
      if (!isNaN(m)) {
        return new Date(y, m - 1, d);
      }
    }
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Computes exact departure and arrival dates, formatted labels, and day difference (+1 Day, etc.)
 * based on search journeyDate, departureTime, arrivalTime, and train duration.
 */
export function calculateTrainJourneyDates(params: {
  journeyDate?: string;
  departureDate?: string;
  arrivalDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
}): TrainJourneyDates {
  const baseDateStr = params.departureDate || params.journeyDate || getIndianRailwaysTodayString();
  const depDate = parseRailwayDate(baseDateStr) || new Date();

  let depHour = 0;
  let depMin = 0;
  if (params.departureTime) {
    const timeMatch = params.departureTime.trim().match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      depHour = parseInt(timeMatch[1], 10);
      depMin = parseInt(timeMatch[2], 10);
    }
  }

  const depDateTime = new Date(depDate.getFullYear(), depDate.getMonth(), depDate.getDate(), depHour, depMin, 0);

  let arrDateTime: Date;

  if (params.arrivalDate) {
    const parsedArrival = parseRailwayDate(params.arrivalDate);
    if (parsedArrival) {
      let arrHour = depHour;
      let arrMin = depMin;
      if (params.arrivalTime) {
        const arrTimeMatch = params.arrivalTime.trim().match(/(\d{1,2}):(\d{2})/);
        if (arrTimeMatch) {
          arrHour = parseInt(arrTimeMatch[1], 10);
          arrMin = parseInt(arrTimeMatch[2], 10);
        }
      }
      arrDateTime = new Date(parsedArrival.getFullYear(), parsedArrival.getMonth(), parsedArrival.getDate(), arrHour, arrMin, 0);
    } else {
      arrDateTime = calculateArrivalFromDuration(depDateTime, params.departureTime, params.arrivalTime, params.duration);
    }
  } else {
    arrDateTime = calculateArrivalFromDuration(depDateTime, params.departureTime, params.arrivalTime, params.duration);
  }

  const depMidnight = new Date(depDateTime.getFullYear(), depDateTime.getMonth(), depDateTime.getDate()).getTime();
  const arrMidnight = new Date(arrDateTime.getFullYear(), arrDateTime.getMonth(), arrDateTime.getDate()).getTime();
  const diffDays = Math.round((arrMidnight - depMidnight) / (24 * 60 * 60 * 1000));
  const dayOffset = Math.max(0, diffDays);

  const formatDisplay = (d: Date) => {
    const dayName = SHORT_WEEKDAYS[d.getDay()];
    const dateNum = String(d.getDate()).padStart(2, '0');
    const monthName = SHORT_MONTHS[d.getMonth()];
    return `${dayName}, ${dateNum} ${monthName}`;
  };

  const formatISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    departureDateStr: formatDisplay(depDateTime),
    arrivalDateStr: formatDisplay(arrDateTime),
    departureDateISO: formatISO(depDateTime),
    arrivalDateISO: formatISO(arrDateTime),
    dayOffset,
    dayOffsetLabel: dayOffset > 0 ? `+${dayOffset} ${dayOffset === 1 ? 'Day' : 'Days'}` : null,
  };
}

function calculateArrivalFromDuration(
  depDateTime: Date,
  departureTime?: string,
  arrivalTime?: string,
  durationStr?: string
): Date {
  if (durationStr) {
    const s = durationStr.trim();
    // Format "HH:MM"
    const colonMatch = s.match(/^(\d{1,3}):(\d{2})/);
    if (colonMatch) {
      const h = parseInt(colonMatch[1], 10);
      const m = parseInt(colonMatch[2], 10);
      return new Date(depDateTime.getTime() + (h * 60 + m) * 60 * 1000);
    }
    // Format "X hrs Y mins" or "Xh Ym"
    const hoursMatch = s.match(/(\d+)\s*(?:hrs?|h)/i);
    const minsMatch = s.match(/(\d+)\s*(?:mins?|m)/i);
    if (hoursMatch || minsMatch) {
      const h = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
      const m = minsMatch ? parseInt(minsMatch[1], 10) : 0;
      return new Date(depDateTime.getTime() + (h * 60 + m) * 60 * 1000);
    }
  }

  // Fallback comparing arrival and departure time strings
  if (departureTime && arrivalTime) {
    const depMatch = departureTime.match(/(\d{1,2}):(\d{2})/);
    const arrMatch = arrivalTime.match(/(\d{1,2}):(\d{2})/);
    if (depMatch && arrMatch) {
      const depM = parseInt(depMatch[1], 10) * 60 + parseInt(depMatch[2], 10);
      const arrM = parseInt(arrMatch[1], 10) * 60 + parseInt(arrMatch[2], 10);
      const nextDay = arrM < depM ? 1 : 0;
      const arrDate = new Date(depDateTime);
      arrDate.setDate(arrDate.getDate() + nextDay);
      arrDate.setHours(parseInt(arrMatch[1], 10), parseInt(arrMatch[2], 10), 0, 0);
      return arrDate;
    }
  }

  return new Date(depDateTime);
}
