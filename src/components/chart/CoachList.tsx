import React, { useState, useMemo } from 'react';
import {
  Layers,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Filter,
  Sparkles,
  Armchair,
} from 'lucide-react';
import { CoachSummary } from '../../types/chart';
import { getCoachTypeLabel } from '../runningStatus/CoachPositionModal';

interface CoachListProps {
  coaches: CoachSummary[];
  selectedCoach: string | null;
  onSelectCoach: (coach: CoachSummary) => void;
  isLoadingCoach: boolean;
  loadingCoachName?: string | null;
}

export const CoachList: React.FC<CoachListProps> = ({
  coaches,
  selectedCoach,
  onSelectCoach,
  isLoadingCoach,
  loadingCoachName,
}) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [onlyVacantFilter, setOnlyVacantFilter] = useState<boolean>(false);

  // Extract unique travel classes present in this train
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    coaches.forEach((c) => {
      if (c.class_code) set.add(c.class_code.toUpperCase());
    });
    return Array.from(set);
  }, [coaches]);

  // Filter coaches based on class and vacancy toggles
  const filteredCoaches = useMemo(() => {
    return coaches.filter((c) => {
      if (selectedClassFilter !== 'all' && c.class_code.toUpperCase() !== selectedClassFilter) {
        return false;
      }
      if (onlyVacantFilter && (c.vacant_berths || 0) <= 0) {
        return false;
      }
      return true;
    });
  }, [coaches, selectedClassFilter, onlyVacantFilter]);

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/40 border border-slate-200/80 p-4 sm:p-6 space-y-4">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              Coaches ({coaches.length})
            </h3>
            <p className="text-xs text-slate-500">
              Select any coach to view complete berth layout &amp; segment occupancy
            </p>
          </div>
        </div>

        {/* Quick Filter: Vacancy & Class Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyVacantFilter(!onlyVacantFilter)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              onlyVacantFilter
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Only with Vacancy</span>
          </button>

          {availableClasses.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-xs">
              <button
                type="button"
                onClick={() => setSelectedClassFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedClassFilter === 'all'
                    ? 'bg-white text-orange-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              {availableClasses.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClassFilter(cls)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedClassFilter === cls
                      ? 'bg-white text-orange-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Empty Filter State */}
      {filteredCoaches.length === 0 && (
        <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <p className="text-sm font-semibold text-slate-700">No coaches match current filter.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedClassFilter('all');
              setOnlyVacantFilter(false);
            }}
            className="mt-2 text-xs font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Responsive Coaches Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {filteredCoaches.map((coach) => {
          const isSelected = selectedCoach === coach.coach_name;
          const isLoadingThis = isLoadingCoach && loadingCoachName === coach.coach_name;
          const hasVacancy = coach.vacant_berths > 0;
          const classLabel = getCoachTypeLabel(coach.class_code);

          return (
            <div
              key={coach.coach_name}
              role="button"
              tabIndex={0}
              onClick={() => onSelectCoach(coach)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCoach(coach);
                }
              }}
              className={`rounded-2xl p-3.5 border transition-all text-left flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                isSelected
                  ? 'bg-orange-50/80 border-orange-500 shadow-md ring-2 ring-orange-400/40'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-orange-300 shadow-xs hover:shadow-sm'
              }`}
            >
              <div>
                {/* Coach Name & Class */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-lg font-black text-slate-900 tracking-tight">
                    {coach.coach_name}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                    {coach.class_code}
                  </span>
                </div>

                {/* Class Full Name */}
                <p className="text-xs font-medium text-slate-600 truncate mb-3">
                  {classLabel} • {coach.class_code}
                </p>

                {/* Vacancy Metric */}
                <div className="space-y-1 mb-3">
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${
                      hasVacancy
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        hasVacancy ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    <span>
                      {hasVacancy
                        ? `${coach.vacant_berths} Vacant`
                        : '0 Vacant'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium">
                    Position from engine: {coach.position_from_engine}
                  </p>
                </div>
              </div>

              {/* Action Link / Loading State */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                {isLoadingThis ? (
                  <span className="text-orange-600 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading...</span>
                  </span>
                ) : isSelected ? (
                  <span className="text-orange-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                    <span>Selected</span>
                  </span>
                ) : (
                  <span className="text-orange-600 hover:text-orange-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>View Berths</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
