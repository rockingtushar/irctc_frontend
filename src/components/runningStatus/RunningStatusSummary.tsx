import React, { useState } from 'react';
import { RunningStatusData } from '../../types/runningStatus';
import { CoachPositionModal } from './CoachPositionModal';
import {
  Train,
  Calendar,
  ArrowRight,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';

interface RunningStatusSummaryProps {
  data: RunningStatusData;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const RunningStatusSummary: React.FC<RunningStatusSummaryProps> = ({
  data,
  onRefresh,
  isRefreshing = false,
}) => {
  const [showCoachModal, setShowCoachModal] = useState<boolean>(false);
  const originStation = data.stations && data.stations.length > 0 ? data.stations[0] : null;
  const destinationStation =
    data.stations && data.stations.length > 1 ? data.stations[data.stations.length - 1] : null;

  const rawStatus = (data.status || '').trim();
  const lowerStatus = rawStatus.toLowerCase();

  // Determine status tone (On Time vs Late vs Arrived)
  const isDelayMentioned =
    lowerStatus.includes('late') ||
    lowerStatus.includes('delay');
  const isOnTime =
    lowerStatus.includes('on time') ||
    lowerStatus.includes('right time');

  const displayStatus =
    rawStatus ||
    (originStation && destinationStation
      ? `Journey from ${originStation.station_name} to ${destinationStation.station_name}`
      : 'Running status details available below');

  const statusBgClass = isDelayMentioned
    ? 'bg-amber-50 border-amber-200/80 text-amber-900'
    : isOnTime
    ? 'bg-emerald-50 border-emerald-200/80 text-emerald-900'
    : 'bg-orange-50 border-orange-200/80 text-slate-900';

  const statusIcon = isDelayMentioned ? (
    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
  ) : isOnTime ? (
    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
  ) : (
    <Sparkles className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
  );

  return (
    <div
      id="running-status-summary-card"
      className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4 transition-all duration-200"
    >
      {/* Train Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/20">
            <Train className="w-6 h-6" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm sm:text-base font-extrabold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200">
                {data.train_number}
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                {data.train_name}
              </h2>
            </div>

            {/* Route summary tags */}
            {originStation && destinationStation && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
                <span className="font-semibold text-slate-700">{originStation.station_name}</span>
                <span className="font-mono text-[11px] text-slate-400">({originStation.station_code})</span>
                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700">{destinationStation.station_name}</span>
                <span className="font-mono text-[11px] text-slate-400">({destinationStation.station_code})</span>
              </div>
            )}
          </div>
        </div>

        {/* Metadata & Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{data.journey_date}</span>
          </div>

          {/* Coach Position Button */}
          {data.coach_position !== undefined && data.coach_position !== null && (
            <button
              type="button"
              id="summary-coach-position-btn"
              onClick={() => setShowCoachModal(true)}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
              title="View train coach formation and position"
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Coach Position</span>
              {data.coach_position.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 font-mono font-bold">
                  {data.coach_position.length}
                </span>
              )}
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-60 active:scale-95"
              title="Refresh live status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Updating...' : 'Refresh'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent Main Status Banner */}
      <div
        id="running-status-banner"
        className={`rounded-2xl p-4 sm:p-5 border flex items-start sm:items-center gap-3.5 shadow-2xs ${statusBgClass}`}
      >
        {statusIcon}
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">
            Latest Train Running Status
          </span>
          <p className="text-base sm:text-lg font-bold leading-snug break-words">
            {displayStatus}
          </p>
        </div>
      </div>
      {/* Coach Position Formation Modal */}
      <CoachPositionModal
        open={showCoachModal}
        onClose={() => setShowCoachModal(false)}
        trainNumber={data.train_number}
        trainName={data.train_name}
        journeyDate={data.journey_date}
        coachPositions={data.coach_position}
      />
    </div>
  );
};
