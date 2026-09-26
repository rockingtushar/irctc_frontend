import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (newDate: string) => void;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  allowPastDates?: boolean;
  disabled?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
  allowPastDates = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const parseDate = (dStr: string) => {
    try {
      const [y, m, d] = dStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    } catch {
      return new Date();
    }
  };

  const selectedDate = parseDate(value);

  // View state for calendar browsing (Year & Month)
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  // Keep view aligned when value changes externally
  useEffect(() => {
    const d = parseDate(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  // Determine whether to open upward or downward based on viewport space
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // If space below is tighter than 340px and there is plenty of room above, open upward
      if (spaceBelow < 340 && spaceAbove > 320) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Close on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const minDateParsed = minDate
    ? parseDate(minDate)
    : !allowPastDates
    ? (() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      })()
    : null;
  if (minDateParsed) {
    minDateParsed.setHours(0, 0, 0, 0);
  }

  const maxDateParsed = maxDate ? parseDate(maxDate) : null;
  if (maxDateParsed) {
    maxDateParsed.setHours(23, 59, 59, 999);
  }

  const canGoPrevMonth = minDateParsed
    ? viewYear > minDateParsed.getFullYear() ||
      (viewYear === minDateParsed.getFullYear() && viewMonth > minDateParsed.getMonth())
    : true;

  const canGoNextMonth = maxDateParsed
    ? viewYear < maxDateParsed.getFullYear() ||
      (viewYear === maxDateParsed.getFullYear() && viewMonth < maxDateParsed.getMonth())
    : true;

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canGoPrevMonth) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canGoNextMonth) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  // Generate date string YYYY-MM-DD
  const formatYMD = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDayIndex = firstDayOfMonth(viewYear, viewMonth); // 0=Sun, 1=Mon...

  // Format date display for box
  const formatDisplay = (dStr: string) => {
    try {
      const d = parseDate(dStr);
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dStr;
    }
  };

  const handleSelectDay = (day: number) => {
    const formatted = formatYMD(viewYear, viewMonth, day);
    onChange(formatted);
    setIsOpen(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayYMD = formatYMD(today.getFullYear(), today.getMonth(), today.getDate());

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayYMD = formatYMD(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowYMD = formatYMD(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  const isDateSelectable = (d: Date) => {
    if (minDateParsed && d < minDateParsed) return false;
    if (maxDateParsed && d > maxDateParsed) return false;
    return true;
  };

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-50' : 'z-10'}`}>
      {/* Clickable Full Box */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full min-h-[38px] sm:min-h-[46px] px-3 py-2 sm:py-2.5 bg-slate-50 border-2 rounded-xl sm:rounded-2xl transition-all cursor-pointer flex items-center justify-between text-left group ${
          isOpen
            ? 'border-orange-500 bg-white ring-2 ring-orange-500/20'
            : 'border-slate-100 hover:border-orange-400 focus:border-orange-500 focus:bg-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="w-4 h-4 text-orange-500 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
            {formatDisplay(value)}
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono shrink-0 ml-1">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Popover Calendar Dropdown with Guaranteed High Stacking (z-[9999]) */}
      {isOpen && (
        <div
          className={`absolute ${
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
          } left-0 z-[9999] w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/30 p-3.5 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Calendar Header with Month/Year Navigation */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
            <button
              type="button"
              disabled={!canGoPrevMonth}
              onClick={handlePrevMonth}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                canGoPrevMonth
                  ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  : 'text-slate-300 opacity-40 cursor-not-allowed'
              }`}
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
              {monthNames[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              disabled={!canGoNextMonth}
              onClick={handleNextMonth}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                canGoNextMonth
                  ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  : 'text-slate-300 opacity-40 cursor-not-allowed'
              }`}
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels (Sun to Sat) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} className="text-[10px] font-bold text-slate-400 py-0.5">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for previous month offset */}
            {Array.from({ length: startDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-7 sm:h-8" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: totalDays }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateObj = new Date(viewYear, viewMonth, dayNum);
              dateObj.setHours(0, 0, 0, 0);

              const isBeforeMin = minDateParsed ? dateObj < minDateParsed : false;
              const isAfterMax = maxDateParsed ? dateObj > maxDateParsed : false;
              const isDayDisabled = isBeforeMin || isAfterMax;

              const isSelected =
                selectedDate.getFullYear() === viewYear &&
                selectedDate.getMonth() === viewMonth &&
                selectedDate.getDate() === dayNum;

              const isToday =
                new Date().getFullYear() === viewYear &&
                new Date().getMonth() === viewMonth &&
                new Date().getDate() === dayNum;

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  disabled={isDayDisabled}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-7 sm:h-8 w-full rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white font-bold shadow-xs shadow-orange-500/30 ring-2 ring-orange-400/30'
                      : isDayDisabled
                      ? 'text-slate-300 opacity-40 cursor-not-allowed bg-slate-50/50'
                      : isToday
                      ? 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-600 font-bold border border-orange-200 hover:border-orange-300'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Quick Footer Options */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2.5">
              {isDateSelectable(today) && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(todayYMD);
                    setIsOpen(false);
                  }}
                  className="text-orange-600 hover:underline font-semibold cursor-pointer"
                >
                  Today
                </button>
              )}
              {allowPastDates && isDateSelectable(yesterday) && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(yesterdayYMD);
                    setIsOpen(false);
                  }}
                  className="text-amber-700 hover:underline font-semibold cursor-pointer"
                >
                  Yesterday
                </button>
              )}
              {isDateSelectable(tomorrow) && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(tomorrowYMD);
                    setIsOpen(false);
                  }}
                  className="text-slate-600 hover:underline font-semibold cursor-pointer"
                >
                  Tomorrow
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
