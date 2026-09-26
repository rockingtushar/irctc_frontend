import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Train } from '../types/station';
import { RunningStatusData, RunningStatusStation } from '../types/runningStatus';
import { normalizeJourneyDateForRoute, extractTrainRunningDays } from '../utils/routeUtils';
import {
  X,
  MapPin,
  Clock,
  Calendar,
  ArrowRight,
  Loader2,
  AlertCircle,
  RotateCcw,
  TrainTrack,
  Search,
  CheckCircle2,
  CircleDot,
  Radio,
  Share2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from 'lucide-react';

interface TrainRouteModalProps {
  open: boolean;
  onClose: () => void;
  train: Train | null;
  journeyDate?: string;
  routeData: RunningStatusData | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const TrainRouteModal: React.FC<TrainRouteModalProps> = ({
  open,
  onClose,
  train,
  journeyDate,
  routeData,
  isLoading,
  error,
  onRetry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'stopping'>('all');
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape key press & prevent background scroll
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Reset search and collapsed states when modal opens with a new train
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setFilterMode('all');
      setExpandedGroupIds(new Set());
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [open, train?.trainNumber]);

  const dateInfo = useMemo(() => {
    const rawDate = routeData?.journey_date || journeyDate || train?.journeyDate;
    return normalizeJourneyDateForRoute(rawDate);
  }, [routeData?.journey_date, journeyDate, train?.journeyDate]);

  const runningDays = useMemo(() => {
    if (!train) return [];
    return extractTrainRunningDays(train);
  }, [train]);

  // Resolve source and destination station codes & names
  const sourceInfo = useMemo(() => {
    if (routeData?.source) {
      if (typeof routeData.source === 'object') {
        return {
          code: routeData.source.station_code,
          name: routeData.source.station_name,
        };
      }
    }
    return {
      code: train?.fromStnCode || 'SRC',
      name: train?.fromStnCode || 'Source',
    };
  }, [routeData, train]);

  const destinationInfo = useMemo(() => {
    if (routeData?.destination) {
      if (typeof routeData.destination === 'object') {
        return {
          code: routeData.destination.station_code,
          name: routeData.destination.station_name,
        };
      }
    }
    return {
      code: train?.toStnCode || 'DST',
      name: train?.toStnCode || 'Destination',
    };
  }, [routeData, train]);

  const allStations = useMemo(() => {
    if (!routeData?.stations || !Array.isArray(routeData.stations)) {
      return [];
    }
    // Strictly preserve the backend sequence order
    return [...routeData.stations].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }, [routeData]);

  const isStoppingStation = (s: RunningStatusStation) => {
    if (s.is_stopping === false) return false;
    const st = (s.status || '').trim().toLowerCase().replace(/-/g, ' ');
    if (st === 'non stopping' || st === 'pass' || st === 'non stop') {
      return false;
    }
    return true;
  };

  const totalStationsCount = routeData?.station_count || allStations.length;
  const stoppingStationsCount = useMemo(() => {
    return allStations.filter(isStoppingStation).length;
  }, [allStations]);
  const nonStoppingStationsCount = allStations.length - stoppingStationsCount;

  // Group stations into Stopping stations and collapsible Non-Stopping groups
  const timelineItems = useMemo<Array<
    | { type: 'stopping'; station: RunningStatusStation; originalIndex: number }
    | {
        type: 'non_stopping_group';
        id: string;
        stations: Array<{ station: RunningStatusStation; originalIndex: number }>;
      }
  >>(() => {
    const items: Array<
      | { type: 'stopping'; station: RunningStatusStation; originalIndex: number }
      | {
          type: 'non_stopping_group';
          id: string;
          stations: Array<{ station: RunningStatusStation; originalIndex: number }>;
        }
    > = [];
    let currentNonStopping: Array<{ station: RunningStatusStation; originalIndex: number }> = [];

    allStations.forEach((station, idx) => {
      const isStopping = isStoppingStation(station);

      if (!isStopping) {
        currentNonStopping.push({ station, originalIndex: idx });
      } else {
        if (currentNonStopping.length > 0) {
          items.push({
            type: 'non_stopping_group',
            id: `ns-group-${items.length}`,
            stations: currentNonStopping,
          });
          currentNonStopping = [];
        }
        items.push({
          type: 'stopping',
          station,
          originalIndex: idx,
        });
      }
    });

    if (currentNonStopping.length > 0) {
      items.push({
        type: 'non_stopping_group',
        id: `ns-group-${items.length}`,
        stations: currentNonStopping,
      });
    }

    return items;
  }, [allStations]);

  // Filter items based on search query and mode
  const displayedTimelineItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return timelineItems
      .map((item) => {
        if (item.type === 'stopping') {
          if (q) {
            const matches =
              item.station.station_name.toLowerCase().includes(q) ||
              item.station.station_code.toLowerCase().includes(q) ||
              (item.station.platform && String(item.station.platform).toLowerCase().includes(q));
            return matches ? item : null;
          }
          return item;
        } else {
          // Non-stopping group
          if (filterMode === 'stopping') {
            return null;
          }

          if (q) {
            const matchingStations = item.stations.filter(
              ({ station }) =>
                station.station_name.toLowerCase().includes(q) ||
                station.station_code.toLowerCase().includes(q) ||
                (station.platform && String(station.platform).toLowerCase().includes(q))
            );
            if (matchingStations.length === 0) return null;
            return {
              ...item,
              stations: matchingStations,
            };
          }

          return item;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [timelineItems, filterMode, searchQuery]);

  // If user searches, auto-expand any non-stopping group that contains matching results
  const activeExpandedGroupIds = useMemo(() => {
    if (searchQuery.trim()) {
      const set = new Set(expandedGroupIds);
      displayedTimelineItems.forEach((item) => {
        if (item.type === 'non_stopping_group') {
          set.add(item.id);
        }
      });
      return set;
    }
    return expandedGroupIds;
  }, [expandedGroupIds, searchQuery, displayedTimelineItems]);

  const allGroupsExpanded = useMemo(() => {
    const groups = displayedTimelineItems.filter(
      (item) => item.type === 'non_stopping_group'
    );
    if (groups.length === 0) return false;
    return groups.every((g) => expandedGroupIds.has(g.id));
  }, [displayedTimelineItems, expandedGroupIds]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const expandAllGroups = () => {
    const allIds = new Set<string>();
    timelineItems.forEach((item) => {
      if (item.type === 'non_stopping_group') {
        allIds.add(item.id);
      }
    });
    setExpandedGroupIds(allIds);
  };

  const collapseAllGroups = () => {
    setExpandedGroupIds(new Set());
  };

  if (!open || !train) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="train-route-modal-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto shrink-0 max-h-[92vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-150"
        id={`train-route-modal-${train.trainNumber}`}
      >
        {/* Header Section */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 shrink-0 border-b border-slate-700/80 relative">
          <div className="flex items-start justify-between gap-3">
            {/* Train Identity */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs sm:text-sm font-black text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-lg border border-amber-600/60 shadow-2xs">
                  {train.trainNumber}
                </span>
                <h3
                  id="train-route-modal-title"
                  className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate"
                >
                  {train.trainName}
                </h3>
              </div>

              {/* Source -> Destination Strip */}
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-200 flex-wrap">
                <div className="flex items-center gap-1 text-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>
                    {sourceInfo.name} ({sourceInfo.code})
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="flex items-center gap-1 text-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    {destinationInfo.name} ({destinationInfo.code})
                  </span>
                </div>
              </div>

              {/* Quick Meta Stats: Date, Distance, Duration, Total Stations */}
              <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-300 flex-wrap pt-1">
                <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                  <Calendar className="w-3 h-3 text-orange-400" />
                  <span>{dateInfo.displayDate}</span>
                </span>

                {train.distance ? (
                  <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                    <TrainTrack className="w-3 h-3 text-amber-400" />
                    <span>{train.distance} km</span>
                  </span>
                ) : null}

                {train.duration ? (
                  <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                    <Clock className="w-3 h-3 text-blue-400" />
                    <span>{train.duration}</span>
                  </span>
                ) : null}

                {totalStationsCount > 0 ? (
                  <span className="inline-flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{totalStationsCount} Stations</span>
                  </span>
                ) : null}
              </div>

              {/* Running Days Strip */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Runs On:
                </span>
                <div className="flex items-center gap-1">
                  {runningDays.map((d) => (
                    <span
                      key={d.key}
                      title={d.runs ? `Runs on ${d.dayName}` : `Does not run on ${d.dayName}`}
                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded text-[9px] sm:text-[10px] font-bold flex items-center justify-center select-none ${
                        d.runs
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-extrabold shadow-2xs'
                          : 'bg-slate-800 text-slate-500 border border-slate-800'
                      }`}
                    >
                      {d.shortLabel}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700 shrink-0"
              aria-label="Close route modal"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-bar: Search & Filter inside route */}
        {!isLoading && !error && allStations.length > 0 && (
          <div className="bg-slate-50 px-3 sm:px-5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search station or code..."
                className="w-full pl-8 pr-7 py-1 text-xs bg-white rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
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

            {/* Quick Filter: All vs Stops Only + Expand/Collapse Non-Stopping */}
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              {nonStoppingStationsCount > 0 && filterMode === 'all' && (
                <button
                  type="button"
                  onClick={allGroupsExpanded ? collapseAllGroups : expandAllGroups}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-colors cursor-pointer select-none"
                  title={allGroupsExpanded ? 'Collapse all non-stopping stations' : 'Expand all non-stopping stations'}
                >
                  <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px]">
                    {allGroupsExpanded ? 'Collapse Non-Stopping' : 'Expand Non-Stopping'}
                  </span>
                </button>
              )}

              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({allStations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('stopping')}
                  className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                    filterMode === 'stopping'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Stops ({stoppingStationsCount})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body / Timeline View */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50/50 space-y-4 min-h-[300px]"
        >
          {/* 1. Loading State */}
          {isLoading && (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-inner">
                  <TrainTrack className="w-7 h-7 animate-pulse" />
                </div>
                <Loader2 className="w-5 h-5 animate-spin text-orange-600 absolute -top-1 -right-1" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  Loading Route for {train.trainNumber} {train.trainName}...
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Fetching official live IRCTC timetable and station sequences...
                </p>
              </div>

              {/* Shimmer Placeholder Timeline */}
              <div className="w-full max-w-md pt-4 space-y-3 opacity-60">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-slate-300 shrink-0" />
                    <div className="h-4 bg-slate-200 rounded flex-1" />
                    <div className="h-4 w-16 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Error State */}
          {!isLoading && error && (
            <div className="py-12 px-4 max-w-md mx-auto text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  Unable to load train route.
                </h4>
                <p className="text-xs text-slate-600">
                  {error.includes('Please try again')
                    ? error
                    : 'Please try again.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* 3. Empty Search Match */}
          {!isLoading && !error && allStations.length > 0 && displayedTimelineItems.length === 0 && (
            <div className="py-12 px-4 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">No stations match &quot;{searchQuery}&quot;</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterMode('all');
                }}
                className="text-xs font-semibold text-orange-600 hover:underline cursor-pointer"
              >
                Reset filters to view all stations
              </button>
            </div>
          )}

          {/* 4. Complete Station Timeline */}
          {!isLoading && !error && displayedTimelineItems.length > 0 && (
            <div className="relative pl-6 sm:pl-8">
              {/* Vertical Route Track Line */}
              <div
                className="absolute left-2.5 sm:left-3.5 top-3 bottom-3 w-0.5 bg-gradient-to-b from-orange-400 via-slate-300 to-emerald-500"
                aria-hidden="true"
              />

              <div className="space-y-3.5 sm:space-y-4">
                {displayedTimelineItems.map((item) => {
                  if (item.type === 'stopping') {
                    const station = item.station;
                    const isFirst = item.originalIndex === 0;
                    const isLast = item.originalIndex === allStations.length - 1;

                    return (
                      <div
                        key={`stn-${station.sequence || item.originalIndex}-${station.station_code}`}
                        className="relative flex items-start gap-3 transition-colors py-0.5"
                      >
                        {/* Timeline Node Marker */}
                        <div className="absolute -left-6 sm:-left-8 top-1 flex items-center justify-center">
                          {isFirst ? (
                            <span className="w-5 h-5 rounded-full bg-orange-500 border-2 border-white shadow-xs flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-orange-200">
                              ●
                            </span>
                          ) : isLast ? (
                            <span className="w-5 h-5 rounded-full bg-emerald-600 border-2 border-white shadow-xs flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-emerald-200">
                              ●
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full border-2 border-white shadow-2xs flex items-center justify-center bg-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            </span>
                          )}
                        </div>

                        {/* Station Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            {/* Station Title & Code */}
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 truncate">
                                {station.station_name}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                {station.station_code}
                              </span>
                            </div>

                            {/* Distance Badge */}
                            <div className="text-right shrink-0">
                              <span className="font-mono text-[11px] text-slate-500 font-semibold">
                                {station.distance_km !== null && station.distance_km !== undefined
                                  ? `${station.distance_km} km`
                                  : '—'}
                              </span>
                            </div>
                          </div>

                          {/* Station Details Grid (Platform, Arrival, Departure, Delay) */}
                          <div className="mt-1 flex items-center gap-2 sm:gap-4 text-[11px] text-slate-600 flex-wrap">
                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold mr-1">
                                Arr:
                              </span>
                              <span className="font-mono font-bold text-slate-800">
                                {station.arrival_time ? station.arrival_time : isFirst ? 'Starts' : '—'}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold mr-1">
                                Dep:
                              </span>
                              <span className="font-mono font-bold text-slate-800">
                                {station.departure_time ? station.departure_time : isLast ? 'Ends' : '—'}
                              </span>
                            </div>

                            {station.platform !== null &&
                              station.platform !== undefined &&
                              String(station.platform).trim() !== '' && (
                                <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 px-1.5 py-0.2 rounded border border-amber-200/80 font-semibold text-[10px]">
                                  <span>PF {station.platform}</span>
                                </div>
                              )}

                            {station.status &&
                              station.status !== 'Non-Stopping' &&
                              station.status.toLowerCase() !== 'on time' && (
                                <div
                                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                    station.status.toLowerCase().includes('delay') ||
                                    (station.delay_minutes && station.delay_minutes > 0)
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {station.status}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Non-Stopping Group Item
                  const isExpanded = activeExpandedGroupIds.has(item.id);

                  return (
                    <div key={item.id} className="relative py-1 my-1">
                      {/* Timeline Node marker for intermediate group */}
                      <div className="absolute -left-6 sm:-left-8 top-3 flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-400 bg-white" />
                      </div>

                      {/* Dropdown / Collapse Button */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.id)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 text-slate-700 hover:text-orange-900 text-xs font-semibold transition-all cursor-pointer shadow-2xs group select-none"
                      >
                        <span className="w-4 h-4 rounded-full bg-slate-200 group-hover:bg-orange-200 text-slate-600 group-hover:text-orange-800 flex items-center justify-center transition-colors">
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </span>
                        <span>
                          {item.stations.length} Non-Stopping Station{item.stations.length > 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] font-normal text-slate-400 group-hover:text-orange-600/80">
                          {isExpanded ? '(Click to collapse)' : '(Click to expand)'}
                        </span>
                      </button>

                      {/* Expanded Non-Stopping Stations */}
                      {isExpanded && (
                        <div className="mt-2.5 mb-2 pl-2 sm:pl-3 border-l-2 border-dashed border-slate-200 space-y-2 animate-in fade-in duration-150">
                          {item.stations.map(({ station, originalIndex }) => (
                            <div
                              key={`ns-${station.sequence || originalIndex}-${station.station_code}`}
                              className="relative flex items-center justify-between gap-2 py-1 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 transition-colors text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2 h-2 rounded-full bg-slate-300 shrink-0"
                                  title="Non-Stopping"
                                />
                                <span className="font-medium text-slate-700 truncate text-[11px] sm:text-xs">
                                  {station.station_name}
                                </span>
                                <span className="font-mono text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                  {station.station_code}
                                </span>
                                <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-1 rounded hidden sm:inline">
                                  Pass
                                </span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-500 font-mono">
                                {station.actual_time || station.departure_time || station.arrival_time ? (
                                  <span className="text-slate-600 text-[10px] font-bold">
                                    {station.actual_time || station.departure_time || station.arrival_time}
                                  </span>
                                ) : null}
                                {station.distance_km !== null && station.distance_km !== undefined ? (
                                  <span className="text-slate-400 text-[10px]">
                                    {station.distance_km} km
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}

                          {item.stations.length > 4 && (
                            <div className="pt-0.5">
                              <button
                                type="button"
                                onClick={() => toggleGroup(item.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                <ChevronUp className="w-3 h-3" />
                                <span>Collapse {item.stations.length} non-stopping stations</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium text-[11px]">Official Indian Railways Timetable</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
