import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { RunningStatusStation, RunningStatusCurrentStation, CoachPosition } from '../../types/runningStatus';
import { DelayBadge } from './DelayBadge';
import { CoachPositionModal } from './CoachPositionModal';
import {
  Train,
  Navigation,
  MapPin,
  Flag,
  Search,
  Check,
  Clock,
  ArrowDown,
  ArrowRight,
  CircleDot,
  Radio,
  Filter,
  LocateFixed,
  ChevronDown,
  ChevronUp,
  Layers,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface LiveTrainTrackVisualizerProps {
  stations: RunningStatusStation[];
  currentStation?: RunningStatusCurrentStation | null;
  trainNumber?: string;
  trainName?: string;
  journeyDate?: string;
  status?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  coachPositions?: CoachPosition[] | null;
}

export const LiveTrainTrackVisualizer: React.FC<LiveTrainTrackVisualizerProps> = ({
  stations,
  currentStation,
  trainNumber,
  trainName,
  journeyDate,
  status,
  onRefresh,
  isRefreshing = false,
  coachPositions,
}) => {
  const [showCoachModal, setShowCoachModal] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'remaining' | 'passed'>('all');
  const currentStationRowRef = useRef<HTMLDivElement>(null);

  // Always ensure sorted by sequence
  const sortedStations = useMemo(() => {
    return [...stations].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }, [stations]);

  // Determine active current station index
  const currentIndex = useMemo(() => {
    // 1. Explicit station marked as is_current
    const explicitIdx = sortedStations.findIndex((s) => s.is_current === true);
    if (explicitIdx !== -1) return explicitIdx;

    // 2. Match with currentStation object from backend
    if (currentStation) {
      const matchIdx = sortedStations.findIndex(
        (s) =>
          (currentStation.station_code &&
            s.station_code?.toUpperCase() === currentStation.station_code?.toUpperCase()) ||
          (currentStation.sequence && s.sequence === currentStation.sequence)
      );
      if (matchIdx !== -1) return matchIdx;
    }

    // 3. Status text analysis fallback (e.g. "Departed from MARIPAT(MIU) at 21:04", "Arrived at GZB(GZB)")
    if (status) {
      const upperStatus = status.toUpperCase();
      const codeMatch = status.match(/\(([A-Z0-9]{2,5})\)/i);
      if (codeMatch && codeMatch[1]) {
        const c = codeMatch[1].toUpperCase();
        const codeIdx = sortedStations.findIndex((s) => s.station_code?.toUpperCase() === c);
        if (codeIdx !== -1) return codeIdx;
      }

      // Match station name in status text
      for (let i = 0; i < sortedStations.length; i++) {
        const sName = sortedStations[i].station_name?.toUpperCase();
        if (sName && sName.length >= 4 && upperStatus.includes(sName)) {
          return i;
        }
      }

      const destStation = sortedStations[sortedStations.length - 1];
      const destCode = destStation?.station_code?.toUpperCase();
      const destName = destStation?.station_name?.toUpperCase();

      if (
        upperStatus.includes('JOURNEY COMPLETED') ||
        upperStatus.includes('JOURNEY FINISHED') ||
        upperStatus.includes('TERMINATED AT DESTINATION') ||
        (upperStatus.includes('ARRIVED AT') &&
          ((destCode && upperStatus.includes(destCode)) ||
            (destName && destName.length >= 4 && upperStatus.includes(destName))))
      ) {
        return sortedStations.length - 1;
      }
    }

    // Default to origin if not yet reached or undetermined
    return 0;
  }, [sortedStations, currentStation, status]);

  const totalStations = sortedStations.length;
  const originStation = sortedStations[0];
  const destinationStation = sortedStations[totalStations - 1];
  const activeStation = sortedStations[currentIndex] || originStation;
  const nextStation = currentIndex < totalStations - 1 ? sortedStations[currentIndex + 1] : null;

  // Status computation for the unified summary banner
  const rawStatus = (status || '').trim();
  const lowerStatus = rawStatus.toLowerCase();
  const isDelayMentioned = lowerStatus.includes('late') || lowerStatus.includes('delay');
  const isOnTime = lowerStatus.includes('on time') || lowerStatus.includes('right time');
  const isYetToStart =
    lowerStatus.includes('yet to start') ||
    lowerStatus.includes('not started') ||
    lowerStatus.includes('starts from') ||
    lowerStatus.includes('waiting to start');

  const destCode = destinationStation?.station_code?.toLowerCase();
  const destName = destinationStation?.station_name?.toLowerCase();

  const isCompleted = useMemo(() => {
    if (isYetToStart || totalStations === 0) return false;

    // Explicit journey finished keywords
    if (
      lowerStatus.includes('journey finished') ||
      lowerStatus.includes('journey completed') ||
      lowerStatus.includes('terminated at destination') ||
      lowerStatus.includes('has terminated')
    ) {
      return true;
    }

    // Train arrived specifically at destination
    if (
      lowerStatus.includes('arrived at') &&
      ((destCode && lowerStatus.includes(destCode)) ||
        (destName && destName.length >= 4 && lowerStatus.includes(destName)))
    ) {
      return true;
    }

    // Train reached final station
    if (currentIndex >= totalStations - 1) {
      if (
        lowerStatus.includes('arrived') ||
        lowerStatus.includes('reached') ||
        lowerStatus.includes('terminated')
      ) {
        return true;
      }
    }

    return false;
  }, [isYetToStart, totalStations, lowerStatus, destCode, destName, currentIndex]);

  const rawRatio = isYetToStart
    ? 0
    : isCompleted
    ? 1
    : totalStations > 1
    ? currentIndex / (totalStations - 1)
    : 0;
  const progressPercent = Math.round(rawRatio * 100);

  // Formatted status display that enriches missing station names e.g. "Departed from (CYZ)" -> "Departed from CHIPYANA BUZURG (CYZ)"
  const displayStatus = useMemo(() => {
    let clean = rawStatus;
    if (!clean) {
      return originStation && destinationStation
        ? `Running between ${originStation.station_name} and ${destinationStation.station_name}`
        : 'Live running status active';
    }

    // Enrich missing station names before parentheses
    clean = clean.replace(/from\s*\(([A-Z0-9]{2,5})\)/i, (_match, code) => {
      const stn = sortedStations.find((s) => s.station_code?.toUpperCase() === code.toUpperCase());
      return stn?.station_name ? `from ${stn.station_name} (${code.toUpperCase()})` : `from (${code.toUpperCase()})`;
    });

    clean = clean.replace(/at\s*\(([A-Z0-9]{2,5})\)/i, (_match, code) => {
      const stn = sortedStations.find((s) => s.station_code?.toUpperCase() === code.toUpperCase());
      return stn?.station_name ? `at ${stn.station_name} (${code.toUpperCase()})` : `at (${code.toUpperCase()})`;
    });

    // Add space before parentheses like "MARIPAT(MIU)" -> "MARIPAT (MIU)"
    clean = clean.replace(/([a-zA-Z0-9])\(([A-Z0-9]{2,5})\)/g, '$1 ($2)');

    return clean;
  }, [rawStatus, originStation, destinationStation, sortedStations]);

  // Safe helper to ensure no "null", "undefined", "NaN" is shown
  const safeText = (val: string | null | undefined): string | null => {
    if (!val) return null;
    const str = String(val).trim();
    if (
      str === '' ||
      str.toLowerCase() === 'null' ||
      str.toLowerCase() === 'undefined' ||
      str.toLowerCase() === 'nan'
    ) {
      return null;
    }
    return str;
  };

  // Scroll smoothly to current train station node
  const handleScrollToCurrent = () => {
    if (currentStationRowRef.current) {
      currentStationRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  // Filtered station list
  const displayStations = useMemo(() => {
    let list = sortedStations;

    if (filterMode === 'remaining') {
      list = isYetToStart ? list : list.filter((_, idx) => idx >= currentIndex);
    } else if (filterMode === 'passed') {
      list = isYetToStart ? [] : isCompleted ? list : list.filter((_, idx) => idx <= currentIndex);
    }

    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.station_name?.toLowerCase() || '').includes(q) ||
          (s.station_code?.toLowerCase() || '').includes(q) ||
          String(s.sequence ?? '').includes(q)
      );
    }

    return list;
  }, [sortedStations, filterMode, searchFilter, currentIndex, isYetToStart, isCompleted]);

  const isNonStoppingStation = (s: RunningStatusStation) => {
    if (s.is_stopping === false) return true;
    const st = (s.status || '').trim().toLowerCase().replace(/-/g, ' ');
    return st === 'non stopping' || st === 'pass' || st === 'non stop';
  };

  const totalNonStoppingCount = useMemo(() => {
    return sortedStations.filter(isNonStoppingStation).length;
  }, [sortedStations]);

  // Collapsed by default: user specifically requested non-stopping stations to be collapsed
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => new Set());

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

  // Group consecutive non-stopping stations into collapsible segments
  const timelineItems = useMemo(() => {
    const items: Array<
      | { type: 'station'; station: RunningStatusStation; rawIndex: number }
      | {
          type: 'group';
          id: string;
          stations: { station: RunningStatusStation; rawIndex: number }[];
          distanceRange: string | null;
          isPassed: boolean;
        }
    > = [];

    let currentGroup: { station: RunningStatusStation; rawIndex: number }[] = [];

    const flushGroup = () => {
      if (currentGroup.length === 0) return;
      const firstStn = currentGroup[0].station;
      const lastStn = currentGroup[currentGroup.length - 1].station;
      const id = `ns-group-${firstStn.sequence}-${lastStn.sequence}`;

      const firstDist = firstStn.distance_km;
      const lastDist = lastStn.distance_km;
      let distanceRange: string | null = null;
      if (firstDist !== null && firstDist !== undefined && lastDist !== null && lastDist !== undefined) {
        distanceRange = firstDist === lastDist ? `${firstDist} KM` : `${firstDist} - ${lastDist} KM`;
      } else if (firstDist !== null && firstDist !== undefined) {
        distanceRange = `${firstDist} KM`;
      } else if (lastDist !== null && lastDist !== undefined) {
        distanceRange = `${lastDist} KM`;
      }

      const isPassed = currentGroup.every((s) => {
        return isCompleted ? true : isYetToStart ? false : s.rawIndex < currentIndex;
      });

      items.push({
        type: 'group',
        id,
        stations: [...currentGroup],
        distanceRange,
        isPassed,
      });
      currentGroup = [];
    };

    displayStations.forEach((station) => {
      const rawIndex = sortedStations.findIndex(
        (s) => s.station_code === station.station_code && s.sequence === station.sequence
      );

      if (isNonStoppingStation(station) && !searchFilter.trim()) {
        currentGroup.push({ station, rawIndex });
      } else {
        flushGroup();
        items.push({ type: 'station', station, rawIndex });
      }
    });

    flushGroup();
    return items;
  }, [displayStations, sortedStations, searchFilter, currentIndex, isCompleted, isYetToStart]);

  const nonStoppingGroupIds = useMemo(() => {
    const ids: string[] = [];
    timelineItems.forEach((item) => {
      if (item.type === 'group') {
        ids.push(item.id);
      }
    });
    return ids;
  }, [timelineItems]);

  const allNonStoppingExpanded =
    nonStoppingGroupIds.length > 0 &&
    nonStoppingGroupIds.every((id) => expandedGroupIds.has(id));

  const toggleAllNonStopping = () => {
    if (allNonStoppingExpanded) {
      setExpandedGroupIds(new Set());
    } else {
      setExpandedGroupIds(new Set(nonStoppingGroupIds));
    }
  };

  // Auto-expand any non-stopping group that contains the current live station
  useEffect(() => {
    timelineItems.forEach((item) => {
      if (item.type === 'group' && item.stations.some((s) => s.station.is_current)) {
        setExpandedGroupIds((prev) => {
          if (!prev.has(item.id)) {
            const next = new Set(prev);
            next.add(item.id);
            return next;
          }
          return prev;
        });
      }
    });
  }, [timelineItems]);

  const renderStationRow = (
    station: RunningStatusStation,
    rawIndex: number,
    isFromGroup = false
  ) => {
    const isFirst = rawIndex === 0;
    const isLast = rawIndex === sortedStations.length - 1;
    const isPassed = isCompleted ? true : isYetToStart ? false : rawIndex < currentIndex;
    const isCurrent = isCompleted
      ? rawIndex === sortedStations.length - 1
      : isYetToStart
      ? rawIndex === 0
      : rawIndex === currentIndex;
    const isUpcoming = isCompleted ? false : isYetToStart ? rawIndex > 0 : rawIndex > currentIndex;
    const isNextStop = isYetToStart ? rawIndex === 1 : !isCompleted && rawIndex === currentIndex + 1;

    const arrivalTime = safeText(station.arrival_time);
    const departureTime = safeText(station.departure_time);
    const scheduledTime = safeText(station.scheduled_time);
    const actualTime = safeText(station.actual_time);
    const platform = safeText(station.platform);
    const stationStatus = safeText(station.status);
    const isNonStopping = isNonStoppingStation(station);
    const hasTimings = !!(arrivalTime || departureTime || scheduledTime || actualTime);

    return (
      <div
        key={`${station.station_code}-${station.sequence}`}
        ref={isCurrent ? currentStationRowRef : undefined}
        id={`station-track-node-${station.sequence}`}
        className={`relative flex items-stretch gap-3 sm:gap-5 transition-all duration-200 group ${
          isCurrent
            ? 'bg-slate-900/95 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border-2 border-orange-500 shadow-md shadow-slate-950/50 my-2'
            : isFromGroup
            ? 'p-1.5 sm:p-2 hover:bg-slate-900/40 rounded-xl bg-slate-900/20'
            : 'p-1.5 sm:p-2.5 hover:bg-slate-900/50 rounded-2xl'
        }`}
      >
        {/* -------------------------------------------------------- */}
        {/* VERTICAL TRACK SPINE & ANIMATED NODES                    */}
        {/* -------------------------------------------------------- */}
        <div className="flex flex-col items-center shrink-0 w-10 sm:w-12 relative">
          {/* Upper Connecting Vertical Railway Track */}
          {!isFirst && (
            <div
              className={`w-1.5 grow min-h-4 sm:min-h-6 rounded-full relative overflow-hidden transition-colors ${
                isPassed || isCurrent
                  ? 'bg-gradient-to-b from-emerald-500 to-orange-500'
                  : 'bg-slate-800'
              }`}
              aria-hidden="true"
            >
              {/* Continuous railway ties scrolling upwards/downwards */}
              <motion.div
                className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(180deg,#ffffff_0_2px,transparent_2px_8px)]"
                animate={{ y: [0, 8] }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              />
            </div>
          )}

          {/* ---------------- NODE ITSELF ---------------- */}
          {isCurrent ? (
            <div className="relative my-1 z-30 flex flex-col items-center">
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center border-2 border-white shadow-md shadow-slate-950/40 z-20 cursor-pointer"
                title={`Live Train is currently at ${station.station_name}`}
              >
                <Train className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          ) : isLast ? (
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-rose-500 to-rose-600 border-2 border-white shadow-sm shrink-0 z-20 my-1"
              title="Final Destination"
            >
              <Flag className="w-4 h-4 text-white" />
            </div>
          ) : isFirst ? (
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-emerald-500 to-emerald-600 border-2 border-white shadow-sm shrink-0 z-20 my-1"
              title="Journey Origin"
            >
              <CircleDot className="w-4 h-4 text-white" />
            </div>
          ) : isPassed ? (
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white bg-emerald-500 border-2 border-emerald-200 shadow-sm shrink-0 z-20 my-1"
              title={`Departed: ${station.station_name}`}
            >
              <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
            </div>
          ) : isNextStop ? (
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-slate-800 border-2 border-amber-400 text-amber-400 shadow-sm shrink-0 z-20 my-1"
              title={`Next Halt: ${station.station_name}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            </div>
          ) : isNonStopping ? (
            <div
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center bg-slate-900 border border-dashed border-slate-500 shrink-0 z-10 my-1"
              title={`Non-Stopping: ${station.station_name}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            </div>
          ) : (
            <div
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center bg-slate-800 border-2 border-slate-600 shrink-0 z-10 my-1"
              title={`Halt #${station.sequence}: ${station.station_name}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            </div>
          )}

          {/* Lower Connecting Vertical Railway Track */}
          {!isLast && (
            <div
              className={`w-2 sm:w-2.5 grow min-h-8 sm:min-h-12 rounded-full relative overflow-hidden transition-colors flex justify-center ${
                isCurrent
                  ? isYetToStart
                    ? 'bg-slate-800'
                    : 'bg-gradient-to-b from-orange-500 to-slate-800'
                  : isPassed
                  ? 'bg-emerald-500'
                  : 'bg-slate-800'
              }`}
              aria-hidden="true"
            >
              <motion.div
                className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(180deg,#ffffff_0_2px,transparent_2px_8px)]"
                animate={{ y: [0, 8] }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              />

              {isCurrent && !isYetToStart && !isCompleted && (
                <motion.div
                  className="absolute flex flex-col items-center z-20 pointer-events-none"
                  animate={{ y: ['-10%', '110%'] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2.4,
                    ease: 'easeInOut',
                  }}
                >
                  <div className="p-1 rounded-full bg-orange-500 text-white border border-white shadow-xs">
                    <Train className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* -------------------------------------------------------- */}
        {/* STATION DATA CARD                                        */}
        {/* -------------------------------------------------------- */}
        <div className="grow min-w-0 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            {/* Station Name, Code, Badges */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h4
                className={`text-sm sm:text-base font-bold tracking-tight ${
                  isCurrent
                    ? 'text-orange-300 font-black text-base sm:text-lg'
                    : 'text-slate-100 group-hover:text-white'
                }`}
              >
                {station.station_name}
              </h4>

              <span className="font-mono text-xs font-black text-orange-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                {station.station_code}
              </span>

              {/* Distance KM: Rendered for EVERY station when available */}
              {station.distance_km !== null && station.distance_km !== undefined && (
                <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700/80">
                  {station.distance_km} KM
                </span>
              )}

              {/* Non-Stopping Badge */}
              {isNonStopping && (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-slate-800/90 text-slate-300 border border-slate-600/70 px-2.5 py-0.5 rounded-full">
                  Non-Stopping
                </span>
              )}

              {platform && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700">
                  <MapPin className="w-3 h-3 text-orange-400" />
                  PF {platform}
                </span>
              )}

              {/* CURRENT LIVE STATUS BADGE */}
              {isCurrent && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isYetToStart
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-orange-500 text-slate-950 font-black'
                  }`}
                >
                  {isYetToStart ? 'Train At Origin' : isCompleted ? 'Terminated' : 'Current Live Station'}
                </span>
              )}

              {isFirst && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-700/60">
                  Origin
                </span>
              )}

              {isLast && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-950/80 text-rose-400 px-2 py-0.5 rounded-full border border-rose-700/60">
                  Destination
                </span>
              )}

              {/* NEXT HALT BADGE */}
              {isNextStop && !isCurrent && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-950/70 text-amber-300 border border-amber-600/60 px-2 py-0.5 rounded-full">
                  <ArrowDown className="w-2.5 h-2.5 animate-bounce" />
                  <span>Next Stop</span>
                </span>
              )}

              {/* DEPARTED / PASSED BADGE */}
              {isPassed && !isCurrent && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
                  <span>Departed</span>
                </span>
              )}
            </div>

            {/* Delay Badge for normal stopping stations */}
            {!isNonStopping && (station.delay_minutes !== null || (stationStatus && safeText(stationStatus))) && (
              <div className="self-start sm:self-auto shrink-0 mt-0.5 sm:mt-0">
                <DelayBadge
                  delayMinutes={station.delay_minutes}
                  statusText={safeText(stationStatus)}
                  size="sm"
                />
              </div>
            )}
          </div>

          {/* TIMINGS DISPLAY GRID - Only render if not non-stopping, OR if non-stopping has timings */}
          {(!isNonStopping || hasTimings) && (
            <div
              className={`mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl p-2.5 sm:p-3 border text-xs ${
                isCurrent
                  ? 'bg-slate-900/90 border-orange-500/40 shadow-inner'
                  : 'bg-slate-900/60 border-slate-800/80'
              }`}
            >
              {/* Arrival Time */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Arrival
                </span>
                {arrivalTime ? (
                  <span className="font-semibold text-slate-100 font-mono text-[11px] sm:text-xs">
                    {arrivalTime}
                  </span>
                ) : isFirst ? (
                  <span className="text-slate-400 italic text-[11px]">Starts Here</span>
                ) : (
                  <span className="text-slate-500 text-[11px]">--</span>
                )}
              </div>

              {/* Departure Time */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Departure
                </span>
                {departureTime ? (
                  <span className="font-semibold text-slate-100 font-mono text-[11px] sm:text-xs">
                    {departureTime}
                  </span>
                ) : isLast ? (
                  <span className="text-slate-400 italic text-[11px]">Terminates Here</span>
                ) : (
                  <span className="text-slate-500 text-[11px]">--</span>
                )}
              </div>

              {/* Scheduled Time */}
              {scheduledTime && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Scheduled
                  </span>
                  <span className="font-medium text-slate-300 font-mono text-[11px] sm:text-xs">
                    {scheduledTime}
                  </span>
                </div>
              )}

              {/* Actual Time */}
              {actualTime && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Actual / Live
                  </span>
                  <span
                    className={`font-mono text-[11px] sm:text-xs font-bold ${
                      station.delay_minutes && station.delay_minutes > 0
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {actualTime}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!sortedStations || sortedStations.length === 0) {
    return (
      <div className="w-full bg-slate-900 text-white rounded-3xl p-8 text-center border border-slate-800">
        <p className="text-slate-400 text-sm">No station schedule available for this train.</p>
      </div>
    );
  }

  return (
    <div
      id="live-vertical-train-track"
      className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl sm:rounded-3xl border border-slate-800/90 shadow-2xl p-4 sm:p-7 space-y-5 relative overflow-hidden"
    >
      {/* Subtle railway background sleeper matrix */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* TOP HEADER: Train Title, Route, Date & Actions (Unified, No Duplication) */}
      <div className="relative z-10 flex flex-col gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Train Identity & Route */}
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0 border border-amber-300/30">
              <Train className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm sm:text-base font-black text-orange-400 bg-orange-950/80 px-2.5 py-0.5 rounded-lg border border-orange-800/60">
                  {trainNumber || 'TRAIN'}
                </span>
                <h2 className="font-black text-lg sm:text-2xl text-white tracking-tight">
                  {trainName || 'Live Train Status'}
                </h2>
              </div>
              {originStation && destinationStation && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
                  <span className="font-semibold text-slate-200">{originStation.station_name}</span>
                  <span className="font-mono text-[11px] text-slate-400">({originStation.station_code})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-orange-400 shrink-0 mx-0.5" />
                  <span className="font-semibold text-slate-200">{destinationStation.station_name}</span>
                  <span className="font-mono text-[11px] text-slate-400">({destinationStation.station_code})</span>
                </div>
              )}
            </div>
          </div>

          {/* Metadata Badges & Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {journeyDate && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-300 shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                <span>{journeyDate}</span>
              </div>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 text-xs font-bold bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-60"
                title="Refresh live status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Updating...' : 'Refresh'}</span>
              </button>
            )}

            {/* Coach Position Action Button */}
            {coachPositions !== undefined && coachPositions !== null && (
              <button
                type="button"
                id="coach-position-action-btn"
                onClick={() => setShowCoachModal(true)}
                title="View train coach formation and position"
                className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white border border-amber-500/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Coach Position</span>
                {coachPositions.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 font-mono font-bold">
                    {coachPositions.length}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleScrollToCurrent}
              title="Jump to where the train is currently located"
              className="flex items-center gap-1.5 text-xs font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <LocateFixed className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">Jump to Train</span>
            </button>
          </div>
        </div>

        {/* LATEST TRAIN RUNNING STATUS BANNER & LIVE JOURNEY TRACK PROGRESS */}
        <div
          id="running-status-banner"
          className={`rounded-2xl p-4 sm:p-5 border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transition-all duration-200 ${
            isDelayMentioned
              ? 'bg-amber-950/30 border-amber-500/40'
              : isOnTime
              ? 'bg-emerald-950/30 border-emerald-500/40'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          {/* Left: Status Icon & Details */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isDelayMentioned
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : isOnTime
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
              }`}
            >
              {isDelayMentioned ? (
                <Clock className="w-5 h-5" />
              ) : isOnTime ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Latest Train Running Status
                </span>
                {isDelayMentioned ? (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    Delayed
                  </span>
                ) : isOnTime ? (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    On Time
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded-full">
                    Live
                  </span>
                )}
              </div>

              <p className="text-sm sm:text-base font-bold leading-snug break-words text-white">
                {displayStatus}
              </p>

              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5 font-medium">
                <Navigation className="w-3 h-3 text-orange-400 rotate-90 shrink-0" />
                <span>
                  {isYetToStart ? (
                    <span className="text-amber-300 font-semibold">
                      Yet to start from origin {originStation?.station_name} ({originStation?.station_code})
                    </span>
                  ) : isCompleted ? (
                    <span className="text-emerald-400 font-semibold">
                      Journey finished at {destinationStation?.station_name} ({destinationStation?.station_code})
                    </span>
                  ) : nextStation ? (
                    <>
                      Heading towards{' '}
                      <span className="text-orange-300 font-bold">
                        {nextStation.station_name} ({nextStation.station_code})
                      </span>
                    </>
                  ) : (
                    'Heading towards final destination'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Live Journey Track Progress Bar */}
          <div className="flex flex-col items-start md:items-end justify-center shrink-0 border-t md:border-t-0 md:border-l border-slate-800/80 pt-3 md:pt-0 md:pl-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Live Journey Track
              </span>
              <span className="font-mono text-xs font-bold text-orange-400">
                {isYetToStart
                  ? `0 of ${totalStations} Stops (Yet to Start)`
                  : isCompleted
                  ? `${totalStations} of ${totalStations} Stops (100%)`
                  : `${currentIndex + 1} of ${totalStations} Stops (${progressPercent}%)`}
              </span>
            </div>
            <div className="relative w-full md:w-40 h-3 bg-slate-800 rounded-full overflow-visible border border-slate-700/80 p-0.5 flex items-center">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 via-orange-500 to-amber-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute -top-1.5 -translate-x-1/2 p-0.5 rounded-full bg-amber-400 text-slate-950 border border-white z-20 flex items-center justify-center shadow-xs"
                initial={{ left: '0%' }}
                animate={{ left: `${Math.max(6, Math.min(progressPercent, 94))}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                title={`Train progress: ${progressPercent}%`}
              >
                <Train className="w-2.5 h-2.5 text-slate-950" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Filter & Quick Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 self-start text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterMode === 'all'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Stops ({totalStations})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('remaining')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterMode === 'remaining'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Upcoming ({isYetToStart ? totalStations : isCompleted ? 0 : Math.max(totalStations - currentIndex - 1, 0)})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('passed')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterMode === 'passed'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Passed ({isYetToStart ? 0 : isCompleted ? totalStations : currentIndex + 1})
            </button>

            {totalNonStoppingCount > 0 && (
              <button
                type="button"
                onClick={toggleAllNonStopping}
                className="px-2.5 py-1 rounded-lg transition-all text-xs font-medium border border-slate-700/80 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-600 inline-flex items-center gap-1.5 cursor-pointer"
                title={allNonStoppingExpanded ? 'Collapse all non-stopping stations' : 'Expand all non-stopping stations'}
              >
                <Layers className="w-3 h-3 text-orange-400" />
                <span>
                  {allNonStoppingExpanded
                    ? 'Collapse Non-Stopping'
                    : `Non-Stopping (${totalNonStoppingCount})`}
                </span>
                {allNonStoppingExpanded ? (
                  <ChevronUp className="w-3 h-3 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                )}
              </button>
            )}
          </div>

          {/* Station Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter station or code..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VERTICAL RAILWAY TRACK & STATIONS STREAM                       */}
      {/* ============================================================== */}
      <div className="relative z-10 space-y-0 pt-2">
        {timelineItems.map((item) => {
          if (item.type === 'station') {
            return renderStationRow(item.station, item.rawIndex);
          }

          // Non-stopping group
          const isExpanded = expandedGroupIds.has(item.id);

          if (!isExpanded) {
            return (
              <div
                key={item.id}
                className="relative flex items-stretch gap-3 sm:gap-5 transition-all duration-200 p-1 sm:p-1.5"
              >
                {/* Vertical track line continuing through */}
                <div className="flex flex-col items-center shrink-0 w-10 sm:w-12 relative">
                  <div
                    className={`w-1.5 grow min-h-3 sm:min-h-4 rounded-full transition-colors ${
                      item.isPassed ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.id)}
                    className="w-7 h-7 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-orange-400 hover:border-orange-500/60 flex items-center justify-center transition-all my-0.5 cursor-pointer shadow-xs"
                    title={`Click to expand ${item.stations.length} non-stopping stations`}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <div
                    className={`w-1.5 grow min-h-3 sm:min-h-4 rounded-full transition-colors ${
                      item.isPassed ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  />
                </div>

                {/* Collapsed summary pill */}
                <div className="grow min-w-0 py-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 bg-slate-900/60 hover:bg-slate-800/80 border border-dashed border-slate-700/80 hover:border-orange-500/50 rounded-2xl transition-all text-left cursor-pointer group/card"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 group-hover/card:text-orange-300 transition-colors">
                        <Layers className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>
                          {item.stations.length} Non-Stopping {item.stations.length === 1 ? 'Station' : 'Stations'}
                        </span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                        ({item.stations.map((s) => s.station.station_code || s.station.station_name).filter(Boolean).slice(0, 4).join(', ')}{item.stations.length > 4 ? '...' : ''})
                      </span>
                      {item.distanceRange && (
                        <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                          {item.distanceRange}
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 group-hover/card:text-orange-300 shrink-0 ml-2">
                      <span className="hidden sm:inline">Tap to expand</span>
                      <span className="sm:hidden">Expand</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </div>
              </div>
            );
          }

          // Expanded group
          return (
            <div key={item.id} className="relative space-y-0">
              {/* Group header bar */}
              <div className="relative flex items-stretch gap-3 sm:gap-5 px-1 py-1">
                <div className="flex flex-col items-center shrink-0 w-10 sm:w-12 relative">
                  <div
                    className={`w-1.5 grow min-h-2 rounded-full ${
                      item.isPassed ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  />
                </div>
                <div className="grow min-w-0 flex items-center justify-between px-3 py-1.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <Layers className="w-3.5 h-3.5 text-orange-400" />
                    <span>{item.stations.length} Non-Stopping Stations</span>
                    {item.distanceRange && <span className="text-slate-500 font-mono">({item.distanceRange})</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.id)}
                    className="text-orange-400 hover:text-orange-300 font-semibold inline-flex items-center gap-1 cursor-pointer text-xs"
                  >
                    <span>Collapse</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Render each non-stopping station */}
              {item.stations.map(({ station, rawIndex }) =>
                renderStationRow(station, rawIndex, true)
              )}

              {/* Group footer collapse trigger */}
              <div className="relative flex items-stretch gap-3 sm:gap-5 px-1 py-0.5">
                <div className="flex flex-col items-center shrink-0 w-10 sm:w-12 relative">
                  <div
                    className={`w-1.5 grow min-h-2 rounded-full ${
                      item.isPassed ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  />
                </div>
                <div className="grow min-w-0 flex justify-end pr-2 pb-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.id)}
                    className="text-[11px] text-slate-400 hover:text-orange-400 font-medium inline-flex items-center gap-1 cursor-pointer py-0.5"
                  >
                    <ChevronUp className="w-3 h-3" />
                    <span>Collapse non-stopping stations</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {displayStations.length === 0 && (
          <div className="py-8 text-center text-slate-400 text-xs">
            No stations matching "{searchFilter}" under current filter.
          </div>
        )}
      </div>

      {/* Coach Position Formation Modal */}
      <CoachPositionModal
        open={showCoachModal}
        onClose={() => setShowCoachModal(false)}
        trainNumber={trainNumber || ''}
        trainName={trainName || ''}
        journeyDate={journeyDate}
        coachPositions={coachPositions}
      />
    </div>
  );
};
