import React, { useState, useMemo } from 'react';
import {
  Armchair,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  SlidersHorizontal,
  Columns2,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  ChartCoachData,
  Berth,
  BerthFilterType,
  BerthCodeType,
} from '../../types/chart';
import { getCoachTypeLabel } from '../runningStatus/CoachPositionModal';
import { BerthDetailModal } from './BerthDetailModal';
import {
  normalizeBerthCode,
  getBerthTypeDisplayName,
  getBerthTypeFullName,
  isSideBerth,
} from '../../utils/berthUtils';

interface CoachBerthViewProps {
  coachData: ChartCoachData;
}

export const CoachBerthView: React.FC<CoachBerthViewProps> = ({ coachData }) => {
  const [activeStatusFilter, setActiveStatusFilter] = useState<BerthFilterType>('all');
  const [activeCodeFilter, setActiveCodeFilter] = useState<BerthCodeType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBerth, setSelectedBerth] = useState<Berth | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'bays'>('map');
  const [selectedBayTab, setSelectedBayTab] = useState<number | 'all'>('all');

  const classLabel = getCoachTypeLabel(coachData.class_code);
  const { fully_occupied, partially_occupied, fully_vacant } = coachData.berth_summary;

  // Ensure default sorting: berth_no ascending (1, 2, 3, ...)
  const sortedBerths = useMemo(() => {
    return [...coachData.berths].sort((a, b) => (a.berth_no || 0) - (b.berth_no || 0));
  }, [coachData.berths]);

  // Client-side filtering
  const filteredBerths = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedBerths.filter((b) => {
      // Status Filter
      if (activeStatusFilter === 'occupied' && !b.fully_occupied) return false;
      if (activeStatusFilter === 'partially_occupied' && !b.partially_occupied) return false;
      if (activeStatusFilter === 'vacant' && !b.fully_vacant) return false;

      // Berth Code Filter (L, M, U, SL, SU, etc.)
      if (activeCodeFilter !== 'all') {
        const code = normalizeBerthCode(b.berth_code, b.berth_no, coachData.class_code);
        if (code !== activeCodeFilter) return false;
      }

      // Search Query filter (match berth_no, berth_code, display name e.g. "side lower", or cabin/bay)
      if (q) {
        const noMatch = String(b.berth_no).includes(q);
        const code = normalizeBerthCode(b.berth_code, b.berth_no, coachData.class_code);
        const codeMatch = (b.berth_code || '').toLowerCase().includes(q) || code.toLowerCase().includes(q);
        const displayName = getBerthTypeDisplayName(code, b.berth_no, coachData.class_code).toLowerCase();
        const fullName = getBerthTypeFullName(code, b.berth_no, coachData.class_code).toLowerCase();
        const nameMatch = displayName.includes(q) || fullName.includes(q);
        const bayMatch = (b.cabin_coupe_name_no || '').toLowerCase().includes(q);
        if (!noMatch && !codeMatch && !nameMatch && !bayMatch) return false;
      }

      return true;
    });
  }, [sortedBerths, activeStatusFilter, activeCodeFilter, searchQuery, coachData.class_code]);

  // Group berths into logical bays of 8 (or 6 for 2A) for authentic coach visualization
  const baySize = coachData.class_code.toUpperCase() === '2A' ? 6 : 8;
  const bays = useMemo(() => {
    const bayMap = new Map<number, Berth[]>();
    sortedBerths.forEach((b) => {
      const bayNumber = Math.ceil(b.berth_no / baySize);
      if (!bayMap.has(bayNumber)) {
        bayMap.set(bayNumber, []);
      }
      bayMap.get(bayNumber)!.push(b);
    });
    return Array.from(bayMap.entries()).map(([bayNumber, berths]) => ({
      bayNumber,
      berths,
    }));
  }, [sortedBerths, baySize]);

  // Render a single interactive berth card
  const renderBerthCard = (berth: Berth) => {
    let statusClass = 'bg-rose-50 border-rose-300 text-rose-900 hover:border-rose-400 hover:bg-rose-100/70';
    let badgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
    let statusText = 'Occupied';
    let dotColor = 'bg-rose-500';

    if (berth.fully_vacant) {
      statusClass = 'bg-emerald-50 border-emerald-400 text-emerald-950 hover:border-emerald-500 hover:bg-emerald-100/70 shadow-2xs';
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black';
      statusText = 'Vacant';
      dotColor = 'bg-emerald-500';
    } else if (berth.partially_occupied) {
      statusClass = 'bg-amber-50 border-amber-400 text-amber-950 hover:border-amber-500 hover:bg-amber-100/70 shadow-2xs';
      badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-black';
      statusText = 'Partially Occupied';
      dotColor = 'bg-amber-500';
    }

    const isMatch = filteredBerths.some((fb) => fb.berth_no === berth.berth_no);
    const opacityClass = isMatch ? 'opacity-100 scale-100' : 'opacity-25 grayscale scale-95 pointer-events-none';

    const code = normalizeBerthCode(berth.berth_code, berth.berth_no, coachData.class_code);
    const berthTypeLabel = getBerthTypeDisplayName(code, berth.berth_no, coachData.class_code);

    return (
      <button
        key={berth.berth_no}
        type="button"
        onClick={() => setSelectedBerth(berth)}
        className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${statusClass} ${opacityClass}`}
        title={`Berth ${berth.berth_no} (${code}) - ${berthTypeLabel} - ${statusText}. Click to view station segment breakdown.`}
      >
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black tracking-tight">
                {berth.berth_no}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] font-black uppercase px-1.5 py-0.5 rounded-md border ${
                  code === 'SL'
                    ? 'bg-amber-100 text-amber-950 border-amber-300 shadow-2xs'
                    : code === 'SU'
                    ? 'bg-indigo-100 text-indigo-950 border-indigo-300 shadow-2xs'
                    : code === 'L'
                    ? 'bg-blue-100 text-blue-950 border-blue-200'
                    : code === 'M'
                    ? 'bg-cyan-100 text-cyan-950 border-cyan-200'
                    : code === 'U'
                    ? 'bg-purple-100 text-purple-950 border-purple-200'
                    : 'bg-white/90 text-slate-800 border-slate-300/70'
                }`}
              >
                {code || 'BERTH'}
              </span>
            </div>

            <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
          </div>

          {/* Prominent Berth Type Name (Side Lower, Side Upper, Lower, Middle, Upper) */}
          <p
            className={`text-[11px] font-bold truncate leading-tight ${
              code === 'SL'
                ? 'text-amber-900 font-black'
                : code === 'SU'
                ? 'text-indigo-900 font-black'
                : 'text-slate-600'
            }`}
          >
            {berthTypeLabel}
          </p>
        </div>

        {/* Text Status Indicator */}
        <div className="mt-2 pt-1 border-t border-black/5 flex items-center justify-between">
          <span
            className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold border truncate max-w-full ${badgeClass}`}
          >
            {statusText}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-3 sm:p-4 space-y-3">
      {/* Compact Coach Title & Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-lg bg-orange-600 text-white font-black text-xs sm:text-sm shadow-2xs">
            {coachData.coach}
          </span>
          <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
            {classLabel} ({coachData.class_code})
          </h3>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            {coachData.berth_count} Berths
          </span>
          <span className="text-[11px] text-slate-400">
            Boarding: <strong className="text-slate-700">{coachData.boarding_station}</strong>
          </span>
        </div>

        {/* Summary Badges */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {/* Fully Vacant */}
          <div className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-1.5 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{fully_vacant} Vacant</span>
          </div>

          {/* Partially Occupied */}
          <div className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 flex items-center gap-1.5 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{partially_occupied} Partial</span>
          </div>

          {/* Fully Occupied */}
          <div className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-1.5 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>{fully_occupied} Occupied</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="space-y-2.5 bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeStatusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All ({coachData.berth_count})
            </button>

            <button
              type="button"
              onClick={() => setActiveStatusFilter('vacant')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeStatusFilter === 'vacant'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Vacant ({fully_vacant})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStatusFilter('partially_occupied')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeStatusFilter === 'partially_occupied'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Partial ({partially_occupied})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStatusFilter('occupied')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeStatusFilter === 'occupied'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-white text-rose-800 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Occupied ({fully_occupied})</span>
            </button>
          </div>

          {/* View Mode Switcher: Coach Map (1-Screen) vs Bay View */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200 self-end sm:self-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-orange-500 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="1-Screen Coach Schematic Map (All berths visible)"
            >
              <Armchair className="w-3.5 h-3.5" />
              <span>Coach Map</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bays')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'bays'
                  ? 'bg-orange-500 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Bay by Bay Coach View"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Bays</span>
            </button>
          </div>
        </div>

        {/* Secondary Filters: Berth Search & Berth Code Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-0.5">
          {/* Quick Berth Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search berth (e.g. 7 or SL)"
              className="w-full pl-7 pr-7 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Berth Code quick filters (L, M, U, SL, SU) */}
          <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-semibold text-slate-600 pb-0.5 sm:pb-0">
            <span className="text-slate-400 text-xs mr-1 hidden sm:inline">Type:</span>
            {[
              { code: 'all', label: 'All' },
              { code: 'SL', label: 'Side Lower (SL)' },
              { code: 'SU', label: 'Side Upper (SU)' },
              { code: 'L', label: 'Lower (L)' },
              { code: 'M', label: 'Middle (M)' },
              { code: 'U', label: 'Upper (U)' },
            ].map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => setActiveCodeFilter(code as BerthCodeType)}
                className={`px-2 py-0.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeCodeFilter === code
                    ? 'bg-orange-100 text-orange-800 font-bold border border-orange-200 shadow-2xs'
                    : 'bg-white hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Berth Layout Representation */}
      <div className="max-h-[56vh] sm:max-h-[60vh] overflow-y-auto pr-1">
        {viewMode === 'map' ? (
          /* Single-Screen Authentic Carriage Blueprint (All Berths Visible) */
          <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-4 border border-slate-800 shadow-inner overflow-x-auto">
            <div className="min-w-[680px]">
              {/* Carriage Top Header Bar with Windows */}
              <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400 font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-white font-bold">Coach {coachData.coach} Schematic Map</span>
                  <span>({classLabel})</span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-emerald-500" /> Vacant
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-amber-500" /> Partial
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-rose-500" /> Occupied
                  </span>
                </div>
              </div>

              {/* Carriage Bays Column Grid */}
              <div className="grid grid-flow-col auto-cols-fr gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                {bays.map(({ bayNumber, berths }) => {
                  const insideBerths = berths.filter(
                    (b) => !isSideBerth(b.berth_code, b.berth_no, coachData.class_code)
                  );
                  const sideBerths = berths.filter(
                    (b) => isSideBerth(b.berth_code, b.berth_no, coachData.class_code)
                  );

                  return (
                    <div
                      key={bayNumber}
                      className="flex flex-col gap-1.5 p-1.5 bg-slate-900/90 rounded-lg border border-slate-800 min-w-[72px]"
                    >
                      {/* Bay Number Header */}
                      <div className="text-center pb-1 border-b border-slate-800 text-[10px] font-black text-orange-400">
                        Bay {bayNumber}
                      </div>

                      {/* Main Compartment Berths (Inside) */}
                      <div className="flex flex-col gap-1">
                        {insideBerths.map((b) => {
                          const code = normalizeBerthCode(b.berth_code, b.berth_no, coachData.class_code);
                          const isMatch = filteredBerths.some((fb) => fb.berth_no === b.berth_no);
                          const opacity = isMatch ? 'opacity-100' : 'opacity-25 pointer-events-none';

                          let bg = 'bg-rose-950/70 border-rose-700/80 text-rose-200 hover:bg-rose-900';
                          if (b.fully_vacant) {
                            bg = 'bg-emerald-950/90 border-emerald-500 text-emerald-200 hover:bg-emerald-900 shadow-2xs shadow-emerald-500/20';
                          } else if (b.partially_occupied) {
                            bg = 'bg-amber-950/90 border-amber-500 text-amber-200 hover:bg-amber-900 shadow-2xs shadow-amber-500/20';
                          }

                          return (
                            <button
                              key={b.berth_no}
                              type="button"
                              onClick={() => setSelectedBerth(b)}
                              className={`p-1 rounded-md border text-center transition-all cursor-pointer ${bg} ${opacity}`}
                              title={`Berth ${b.berth_no} (${code}) - Click for details`}
                            >
                              <div className="flex items-center justify-between px-1">
                                <span className="font-black text-xs">{b.berth_no}</span>
                                <span className="text-[9px] font-bold uppercase opacity-80">{code}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Aisle Corridor Separator */}
                      <div className="my-0.5 border-y border-dashed border-slate-700/80 py-0.5 text-center text-[8px] font-black tracking-widest text-slate-500 select-none">
                        AISLE
                      </div>

                      {/* Side Berths (Corridor Window Side) */}
                      <div className="flex flex-col gap-1">
                        {sideBerths.map((b) => {
                          const code = normalizeBerthCode(b.berth_code, b.berth_no, coachData.class_code);
                          const isMatch = filteredBerths.some((fb) => fb.berth_no === b.berth_no);
                          const opacity = isMatch ? 'opacity-100' : 'opacity-25 pointer-events-none';

                          let bg = 'bg-rose-950/70 border-rose-700/80 text-rose-200 hover:bg-rose-900';
                          if (b.fully_vacant) {
                            bg = 'bg-emerald-950/90 border-emerald-500 text-emerald-200 hover:bg-emerald-900 shadow-2xs shadow-emerald-500/20';
                          } else if (b.partially_occupied) {
                            bg = 'bg-amber-950/90 border-amber-500 text-amber-200 hover:bg-amber-900 shadow-2xs shadow-amber-500/20';
                          }

                          return (
                            <button
                              key={b.berth_no}
                              type="button"
                              onClick={() => setSelectedBerth(b)}
                              className={`p-1 rounded-md border text-center transition-all cursor-pointer ${bg} ${opacity}`}
                              title={`Side Berth ${b.berth_no} (${code}) - Click for details`}
                            >
                              <div className="flex items-center justify-between px-1">
                                <span className="font-black text-xs">{b.berth_no}</span>
                                <span className="text-[9px] font-black uppercase text-amber-400">
                                  {code}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Multi-column Bay Layout with Quick Bay Filter Tabs */
          <div className="space-y-4">
            {/* Quick Bay Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 text-xs mr-1 font-semibold hidden sm:inline">
                Jump Bay:
              </span>
              <button
                type="button"
                onClick={() => setSelectedBayTab('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedBayTab === 'all'
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                All Bays ({bays.length})
              </button>
              {bays.map(({ bayNumber }) => (
                <button
                  key={bayNumber}
                  type="button"
                  onClick={() => setSelectedBayTab(bayNumber)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedBayTab === bayNumber
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Bay {bayNumber}
                </button>
              ))}
            </div>

            {/* Bays in Responsive Multi-Column Grid to fit comfortably */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {bays
                .filter(({ bayNumber }) => selectedBayTab === 'all' || selectedBayTab === bayNumber)
                .map(({ bayNumber, berths }) => {
                  const insideBerths = berths.filter(
                    (b) => !isSideBerth(b.berth_code, b.berth_no, coachData.class_code)
                  );
                  const sideBerths = berths.filter(
                    (b) => isSideBerth(b.berth_code, b.berth_no, coachData.class_code)
                  );

                  const hasAnyVisible = berths.some((b) =>
                    filteredBerths.some((fb) => fb.berth_no === b.berth_no)
                  );

                  if (
                    !hasAnyVisible &&
                    (searchQuery || activeCodeFilter !== 'all' || activeStatusFilter !== 'all')
                  ) {
                    return null;
                  }

                  return (
                    <div
                      key={bayNumber}
                      className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5 flex flex-col justify-between"
                    >
                      {/* Bay Header */}
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[10px] font-black">
                            Bay {bayNumber}
                          </span>
                          <span className="text-[11px]">
                            {berths[0]?.berth_no} – {berths[berths.length - 1]?.berth_no}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Click to inspect</span>
                      </div>

                      {/* Inside Compartment & Side Berths Layout */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        {/* Inside Compartment */}
                        <div className="sm:col-span-8 p-2 bg-white rounded-xl border border-slate-200/60 flex flex-col gap-1.5">
                          <div className="text-[10px] font-bold text-slate-500 pb-0.5 border-b border-slate-100 flex justify-between">
                            <span>Main</span>
                            <span className="text-[9px] text-slate-400">LB, MB, UB</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {insideBerths.map((berth) => renderBerthCard(berth))}
                          </div>
                        </div>

                        {/* Side Berths */}
                        <div className="sm:col-span-4 p-2 bg-amber-50/40 rounded-xl border border-amber-200/70 flex flex-col gap-1.5">
                          <div className="text-[10px] font-black text-amber-900 pb-0.5 border-b border-amber-200/50 flex justify-between">
                            <span>Side</span>
                            <span className="text-[9px] text-amber-700 font-bold">SL/SU</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5">
                            {sideBerths.map((berth) => renderBerthCard(berth))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Legend & Guide footer */}
      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500" />
            <span className="font-semibold text-slate-700">Occupied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500" />
            <span className="font-semibold text-slate-700">Partially Occupied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500" />
            <span className="font-semibold text-slate-700">Vacant</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 italic">
          * Click any berth to inspect occupied and vacant station segments
        </p>
      </div>

      {/* Berth Detail Modal/Drawer */}
      {selectedBerth && (
        <BerthDetailModal
          berth={selectedBerth}
          coachData={coachData}
          onClose={() => setSelectedBerth(null)}
        />
      )}
    </div>
  );
};
