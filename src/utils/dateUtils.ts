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
