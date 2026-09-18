import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Armchair,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
} from 'lucide-react';
import { CoachSummary, ChartCoachData } from '../../types/chart';
import { CoachBerthView } from './CoachBerthView';

interface HorizontalTrainRakeProps {
  trainNumber: string;
  trainName: string;
  fromStation?: string;
  toStation?: string;
  coaches: CoachSummary[];
  selectedCoach: string | null;
  onSelectCoach: (coach: CoachSummary) => void;
  isLoadingCoach: boolean;
  loadingCoachName?: string | null;
  activeCoachData: ChartCoachData | null;
}

/**
 * Returns authentic livery style and color accents based on coach class code
 */
function getCoachColorTheme(classCode: string = '') {
  const code = classCode.toUpperCase().trim();
  switch (code) {
    case '1A':
    case 'EA':
      return {
        bg: 'from-amber-700 to-amber-900',
        border: 'border-amber-600',
        accent: 'bg-amber-400 text-amber-950',
        windowTint: 'bg-amber-950/80',
        tag: 'First AC',
      };
    case '2A':
      return {
        bg: 'from-sky-700 to-blue-900',
        border: 'border-sky-500',
        accent: 'bg-sky-400 text-sky-950',
        windowTint: 'bg-slate-900/80',
        tag: 'AC 2-Tier',
      };
    case '3A':
    case '3E':
      return {
        bg: 'from-blue-700 to-indigo-900',
        border: 'border-blue-500',
        accent: 'bg-blue-300 text-blue-950',
        windowTint: 'bg-slate-900/80',
        tag: 'AC 3-Tier',
      };
    case 'CC':
    case 'EC':
      return {
        bg: 'from-emerald-700 to-teal-900',
        border: 'border-emerald-500',
        accent: 'bg-emerald-300 text-emerald-950',
        windowTint: 'bg-slate-900/80',
        tag: 'Chair Car',
      };
    case 'SL':
      return {
        bg: 'from-red-800 to-rose-950', // LHB Red Livery
        border: 'border-rose-700',
        accent: 'bg-rose-300 text-rose-950',
        windowTint: 'bg-slate-900/80',
        tag: 'Sleeper',
      };
    case '2S':
    case 'GS':
    case 'GEN':
      return {
        bg: 'from-amber-800 to-stone-900',
        border: 'border-amber-700',
        accent: 'bg-amber-300 text-amber-950',
        windowTint: 'bg-stone-900/80',
        tag: 'Second Sitting',
      };
    default:
      return {
        bg: 'from-slate-700 to-slate-900',
        border: 'border-slate-600',
        accent: 'bg-slate-300 text-slate-950',
        windowTint: 'bg-slate-950/80',
        tag: 'Coach',
      };
  }
}

export const HorizontalTrainRake: React.FC<HorizontalTrainRakeProps> = ({
  trainNumber,
  trainName,
  fromStation,
  toStation,
  coaches,
  selectedCoach,
  onSelectCoach,
  isLoadingCoach,
  loadingCoachName,
  activeCoachData,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedCoachRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const [filterClass, setFilterClass] = useState<string>('all');
  const [onlyVacant, setOnlyVacant] = useState<boolean>(false);

  // Available classes in train
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    coaches.forEach((c) => {
      if (c.class_code) set.add(c.class_code.toUpperCase());
    });
    return Array.from(set);
  }, [coaches]);

  // Total vacant berths tally across entire train rake
  const totalVacantBerths = useMemo(() => {
    return coaches.reduce((sum, c) => sum + (c.vacant_berths || 0), 0);
  }, [coaches]);

  const totalCoaches = coaches.length;

  // Horizontal scroll buttons
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Auto-scroll selected coach into view within rake
  useEffect(() => {
    if (selectedCoach && selectedCoachRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = selectedCoachRef.current;
      const containerLeft = container.getBoundingClientRect().left;
      const elLeft = el.getBoundingClientRect().left;
      const scrollOffset = elLeft - containerLeft - 100;
      container.scrollBy({ left: scrollOffset, behavior: 'smooth' });
    }
  }, [selectedCoach]);

  const selectedCoachObj = useMemo(() => {
    if (!selectedCoach) return null;
    return coaches.find((c) => c.coach_name === selectedCoach) || null;
  }, [coaches, selectedCoach]);

  return (
    <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl p-3 sm:p-4 space-y-3 relative">
      {/* Top Filter & View Mode Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1">
            <Filter className="w-3 h-3 text-orange-400" />
            Filter:
          </span>

          <button
            type="button"
            onClick={() => setOnlyVacant(!onlyVacant)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              onlyVacant
                ? 'bg-emerald-500 text-white shadow-2xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${onlyVacant ? 'bg-white' : 'bg-emerald-400'}`} />
            <span>Vacancy Only</span>
          </button>

          {availableClasses.length > 1 && (
            <div className="flex items-center gap-0.5 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setFilterClass('all')}
                className={`px-2 py-0.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                  filterClass === 'all'
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              {availableClasses.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setFilterClass(cls)}
                  className={`px-2 py-0.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                    filterClass === cls
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Scroll Navigation Controls */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 shadow-xs"
            title="Scroll train left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 shadow-xs"
            title="Scroll train right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* HORIZONTAL TRAIN RAKE CONTAINER (Classic scroll mode) */}
      <div className="relative pt-1 pb-3">
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 pb-4 flex items-end gap-1.5 select-none"
          style={{ scrollBehavior: 'smooth' }}
        >
          {/* LOCOMOTIVE ENGINE (Front) */}
          <div className="shrink-0 flex flex-col items-center">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1.5">
              Engine ◄
            </span>

            {/* Locomotive Body (WAP-7 Authentic Shape) */}
            <div className="w-28 h-20 bg-gradient-to-r from-red-600 via-red-700 to-red-800 rounded-l-3xl rounded-r-md border-2 border-red-500/80 shadow-lg relative flex flex-col justify-between p-2">
              {/* Roof Pantograph & Horn */}
              <div className="absolute -top-3 left-6 w-14 h-3 border-t-2 border-l border-r border-amber-300/80 flex items-center justify-center">
                <span className="w-6 h-0.5 bg-amber-400" />
              </div>

              {/* Windshield & Headlight */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fde047] animate-pulse" />
                  <span className="text-[9px] font-black tracking-tighter text-amber-200">WAP-7</span>
                </div>
                {/* Windshield Glass */}
                <div className="w-10 h-3.5 bg-sky-950 rounded-sm border border-sky-600/70" />
              </div>

              {/* Center Livery Stripe */}
              <div className="w-full h-1.5 bg-amber-300 rounded-xs my-auto shadow-xs" />

              {/* Loco Badge & Cowcatcher */}
              <div className="flex items-center justify-between text-[9px] font-mono text-red-200">
                <span>IR 30214</span>
                <span className="text-[8px] bg-red-950 px-1 rounded text-red-300">NR</span>
              </div>
            </div>

            {/* Locomotive Bogie Wheels */}
            <div className="w-24 flex justify-between px-2 pt-1">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-700 border-2 border-slate-500" />
              <span className="w-3.5 h-3.5 rounded-full bg-slate-700 border-2 border-slate-500" />
              <span className="w-3.5 h-3.5 rounded-full bg-slate-700 border-2 border-slate-500" />
            </div>
          </div>

          {/* Engine Coupler */}
          <div className="shrink-0 w-3 h-2 bg-slate-600 mb-6 rounded-xs" />

          {/* COACHES IN SEQUENCE */}
          {coaches.map((coach, index) => {
            const isSelected = selectedCoach === coach.coach_name;
            const isLoadingThis = isLoadingCoach && loadingCoachName === coach.coach_name;
            const hasVacancy = (coach.vacant_berths || 0) > 0;
            const isFilteredOut =
              (filterClass !== 'all' && coach.class_code.toUpperCase() !== filterClass) ||
              (onlyVacant && !hasVacancy);

            const theme = getCoachColorTheme(coach.class_code);

            return (
              <React.Fragment key={coach.coach_name}>
                <div
                  ref={isSelected ? selectedCoachRef : null}
                  onClick={() => onSelectCoach(coach)}
                  className={`shrink-0 flex flex-col items-center cursor-pointer transition-all duration-200 group ${
                    isFilteredOut ? 'opacity-35 hover:opacity-70' : 'opacity-100'
                  }`}
                >
                  {/* Coach Indicator / Arrow if selected */}
                  <div className="h-4 flex items-center justify-center">
                    {isSelected && (
                      <span className="text-[10px] text-orange-400 font-extrabold animate-bounce">
                        ▼
                      </span>
                    )}
                  </div>

                  {/* Coach Body Card */}
                  <div
                    className={`w-24 sm:w-28 h-20 rounded-md border-2 transition-all relative flex flex-col justify-between p-1.5 shadow-md ${
                      isSelected
                        ? 'border-orange-400 ring-2 ring-orange-500/50 scale-105 z-20 shadow-orange-500/20'
                        : `${theme.border} hover:border-orange-300 hover:scale-[1.02]`
                    } bg-gradient-to-b ${theme.bg}`}
                  >
                    {/* Top: Windows Stripe */}
                    <div className="flex items-center justify-between gap-0.5 px-0.5">
                      <div className="w-3 h-2 rounded-xs bg-slate-900 border border-slate-700" />
                      <div className="flex-1 h-2 mx-0.5 rounded-xs bg-slate-950/80 border border-slate-800 flex items-center justify-around px-0.5">
                        <span className="w-1.5 h-1 bg-slate-800 rounded-2xs" />
                        <span className="w-1.5 h-1 bg-slate-800 rounded-2xs" />
                        <span className="w-1.5 h-1 bg-slate-800 rounded-2xs" />
                      </div>
                      <div className="w-3 h-2 rounded-xs bg-slate-900 border border-slate-700" />
                    </div>

                    {/* Middle: Coach Code & Class */}
                    <div className="text-center my-auto">
                      <span className="text-base sm:text-lg font-black tracking-tight text-white block leading-none drop-shadow-xs">
                        {coach.coach_name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-200 uppercase tracking-tight">
                        {coach.class_code}
                      </span>
                    </div>

                    {/* Bottom: Vacancy Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-300 font-mono">
                        #{coach.position_from_engine || index + 1}
                      </span>

                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded-full border ${
                          hasVacancy
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-xs'
                            : 'bg-slate-900/90 text-slate-400 border-slate-700'
                        }`}
                      >
                        {isLoadingThis ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : hasVacancy ? (
                          `${coach.vacant_berths} V`
                        ) : (
                          '0'
                        )}
                      </span>
                    </div>

                    {/* Selected Active Pill */}
                    {isSelected && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-orange-500" />
                    )}
                  </div>

                  {/* Coach Bogie Wheels */}
                  <div className="w-20 flex justify-between px-1.5 pt-1">
                    <span className="w-3 h-3 rounded-full bg-slate-700 border border-slate-500" />
                    <span className="w-3 h-3 rounded-full bg-slate-700 border border-slate-500" />
                  </div>
                </div>

                {/* Coupler between coaches */}
                {index < coaches.length - 1 && (
                  <div className="shrink-0 w-2 h-1.5 bg-slate-600 mb-6 rounded-xs" />
                )}
              </React.Fragment>
            );
          })}

          {/* GUARD / SLR VAN (Rear) */}
          <div className="shrink-0 w-2.5 h-1.5 bg-slate-600 mb-6 rounded-xs" />
          <div className="shrink-0 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Guard
            </span>

            <div className="w-18 h-20 bg-gradient-to-r from-red-900 via-rose-950 to-stone-900 rounded-r-2xl rounded-l-md border-2 border-rose-800 p-1.5 flex flex-col justify-between">
              <div className="flex justify-end">
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />
              </div>
              <div className="text-center font-bold text-xs text-rose-200">
                SLR
              </div>
              <div className="text-[8px] text-center font-mono text-slate-400">
                REAR
              </div>
            </div>

            <div className="w-14 flex justify-between px-1 pt-1">
              <span className="w-3 h-3 rounded-full bg-slate-700 border border-slate-500" />
              <span className="w-3 h-3 rounded-full bg-slate-700 border border-slate-500" />
            </div>
          </div>
        </div>

        {/* RAIL TRACK WITH SLEEPERS */}
        <div className="w-full relative mt-0.5">
          {/* Top Rail Line */}
          <div className="w-full h-1 bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400 shadow-sm rounded-full" />
          {/* Railway Sleepers / Ties Texture */}
          <div className="w-full h-2.5 flex justify-between opacity-35 px-1 py-0.5">
            {Array.from({ length: 48 }).map((_, i) => (
              <span key={i} className="w-1 h-full bg-amber-900/80 rounded-2xs" />
            ))}
          </div>
          {/* Bottom Rail Line */}
          <div className="w-full h-0.5 bg-slate-500" />
        </div>
      </div>

      {/* COLLAPSIBLE / EXPANDED RAW COACH BERTH EXPERIENCE */}
      {selectedCoach && (
        <div
          ref={detailsRef}
          className="mt-2 pt-2 border-t border-slate-800 animate-in fade-in duration-150"
        >
          {/* Coach Berth View Component */}
          {isLoadingCoach ? (
            <div className="p-6 bg-slate-950/60 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
              <p className="text-xs font-bold text-white">
                Opening Coach {selectedCoach}...
              </p>
              <p className="text-[11px] text-slate-400">
                Fetching authentic berth numbers and segment reservations
              </p>
            </div>
          ) : activeCoachData ? (
            <div className="bg-white rounded-2xl p-2 sm:p-3 text-slate-900 shadow-md border border-slate-200">
              <CoachBerthView coachData={activeCoachData} />
            </div>
          ) : (
            <div className="p-6 bg-slate-800/40 rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-400">
              Select another coach from the train composition above.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
