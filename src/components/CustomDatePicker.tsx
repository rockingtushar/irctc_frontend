import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (newDate: string) => void;
  minDate?: string; // YYYY-MM-DD
  disabled?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  minDate,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const minDateParsed = minDate ? parseDate(minDate) : new Date();
  minDateParsed.setHours(0, 0, 0, 0);

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

  return (
    <div ref={containerRef} className="relative w-full">
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

      {/* Popover Calendar Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/15 p-3.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Calendar Header with Month/Year Navigation */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
              {monthNames[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
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

              const isPast = dateObj < minDateParsed;
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
                  disabled={isPast}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-7 sm:h-8 w-full rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white font-bold shadow-xs shadow-orange-500/30'
                      : isPast
                      ? 'text-slate-300 cursor-not-allowed'
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
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const str = formatYMD(today.getFullYear(), today.getMonth(), today.getDate());
                onChange(str);
                setIsOpen(false);
              }}
              className="text-orange-600 hover:underline font-semibold cursor-pointer"
            >
              Select Today
            </button>
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
