import React, { useState, useMemo } from 'react';
import { RunningStatusStation, RunningStatusCurrentStation } from '../../types/runningStatus';
import { StationTimelineItem } from './StationTimelineItem';
import { LiveTrainTrackVisualizer } from './LiveTrainTrackVisualizer';
import { TrainTrack, Search, Filter, Layers } from 'lucide-react';

interface StationTimelineProps {
  stations: RunningStatusStation[];
  currentStation?: RunningStatusCurrentStation | null;
  trainNumber?: string;
  trainName?: string;
}

export const StationTimeline: React.FC<StationTimelineProps> = ({
  stations,
  currentStation,
  trainNumber,
  trainName,
}) => {
  const [searchFilter, setSearchFilter] = useState('');

  // Always ensure sorted by sequence as instructed
  const sortedStations = useMemo(() => {
    return [...stations].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }, [stations]);

  // Find the current active station index along the sorted route
  const currentIndex = useMemo(() => {
    // 1. Explicit station marked as is_current
    const explicitIdx = sortedStations.findIndex((s) => s.is_current === true);
    if (explicitIdx !== -1) return explicitIdx;

    // 2. Match with currentStation object passed from backend
    if (currentStation) {
      const matchIdx = sortedStations.findIndex(
        (s) =>
          (currentStation.station_code &&
            s.station_code?.toUpperCase() === currentStation.station_code?.toUpperCase()) ||
          (currentStation.sequence && s.sequence === currentStation.sequence)
      );
      if (matchIdx !== -1) return matchIdx;
    }

    // 3. Fallback: look for station with active status or default to 0
    return 0;
  }, [sortedStations, currentStation]);

  // Create quick lookup map for sorted index of each station
  const stationIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedStations.forEach((s, idx) => {
      map.set(`${s.station_code}-${s.sequence}`, idx);
    });
    return map;
  }, [sortedStations]);

  // Filter stations based on user search term if any
  const filteredStations = useMemo(() => {
    if (!searchFilter.trim()) return sortedStations;
    const q = searchFilter.trim().toLowerCase();
    return sortedStations.filter(
      (s) =>
        (s.station_name?.toLowerCase() || '').includes(q) ||
        (s.station_code?.toLowerCase() || '').includes(q) ||
        String(s.sequence ?? '').includes(q)
    );
  }, [sortedStations, searchFilter]);

  if (sortedStations.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
        <p className="text-sm">No station schedule available for this train.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Dynamic Animated Train Track Journey Visualizer */}
      <LiveTrainTrackVisualizer
        stations={sortedStations}
        currentIndex={currentIndex}
        trainNumber={trainNumber}
        trainName={trainName}
      />

      {/* Main Station Timeline Card */}
      <div
        id="station-timeline-container"
        className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4"
      >
        {/* Timeline Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <TrainTrack className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Route & Station Timeline
              </h3>
              <p className="text-xs text-slate-500">
                {sortedStations.length} stations from {sortedStations[0].station_name} to{' '}
                {sortedStations[sortedStations.length - 1].station_name}
              </p>
            </div>
          </div>

          {/* Quick Search Within Timeline (helpful for 30+ station routes) */}
          {sortedStations.length > 5 && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Find station or code..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stations Render Loop with Train Transitions */}
        <div className="space-y-0.5 pt-1">
          {filteredStations.map((station) => {
            const rawIndex = stationIndexMap.get(`${station.station_code}-${station.sequence}`) ?? 0;
            const isFirst = rawIndex === 0;
            const isLast = rawIndex === sortedStations.length - 1;
            const isPassed = rawIndex < currentIndex;
            const isCurrent = rawIndex === currentIndex;
            const isUpcoming = rawIndex > currentIndex;
            const isNextStop = rawIndex === currentIndex + 1;

            return (
              <StationTimelineItem
                key={`${station.station_code}-${station.sequence}`}
                station={station}
                isFirst={isFirst}
                isLast={isLast}
                isPassed={isPassed}
                isCurrent={isCurrent}
                isUpcoming={isUpcoming}
                isNextStop={isNextStop}
              />
            );
          })}
        </div>

        {filteredStations.length === 0 && (
          <div className="py-6 text-center text-slate-400 text-xs">
            No stations matching "{searchFilter}"
          </div>
        )}
      </div>
    </div>
  );
};
