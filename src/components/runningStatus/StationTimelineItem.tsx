import React from 'react';
import { motion } from 'motion/react';
import { RunningStatusStation } from '../../types/runningStatus';
import { DelayBadge } from './DelayBadge';
import { MapPin, ArrowDown, Radio, Train, Check, Flag, CircleDot } from 'lucide-react';

interface StationTimelineItemProps {
  station: RunningStatusStation;
  isFirst: boolean;
  isLast: boolean;
  isPassed?: boolean;
  isCurrent?: boolean;
  isUpcoming?: boolean;
  isNextStop?: boolean;
}

export const StationTimelineItem: React.FC<StationTimelineItemProps> = ({
  station,
  isFirst,
  isLast,
  isPassed = false,
  isCurrent = false,
  isUpcoming = false,
  isNextStop = false,
}) => {
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

  const arrivalTime = safeText(station.arrival_time);
  const departureTime = safeText(station.departure_time);
  const scheduledTime = safeText(station.scheduled_time);
  const actualTime = safeText(station.actual_time);
  const platform = safeText(station.platform);
  const isNonStopping = (station.status || '').trim().toLowerCase().replace(/-/g, ' ') === 'non stopping';
  const hasTimings = !!(arrivalTime || departureTime || scheduledTime || actualTime);

  return (
    <div
      id={`station-timeline-item-${station.sequence}`}
      className={`relative flex items-stretch gap-3 sm:gap-4 transition-all duration-150 ${
        isCurrent
          ? 'bg-gradient-to-r from-orange-50/90 via-amber-50/60 to-white rounded-2xl p-2.5 sm:p-3.5 border-2 border-orange-400 shadow-md shadow-orange-500/10'
          : isNextStop
          ? 'bg-amber-50/30 rounded-2xl p-2 sm:p-2.5 border border-amber-200/60'
          : 'p-1 sm:p-2'
      }`}
    >
      {/* Track & Transition Node Column */}
      <div className="flex flex-col items-center shrink-0 w-8 sm:w-10 relative">
        {/* Top Connecting Vertical Line */}
        {!isFirst && (
          <div
            className={`w-1 grow min-h-3 sm:min-h-4 rounded-full transition-colors ${
              isPassed || isCurrent
                ? 'bg-gradient-to-b from-orange-500 to-orange-500'
                : 'bg-slate-200'
            }`}
            aria-hidden="true"
          />
        )}

        {/* Central Track Node */}
        {isCurrent ? (
          /* ACTIVE TRAIN LOCATION NODE (CLEAN, NO GLOW) */
          <div className="relative my-0.5 z-20">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-orange-500 to-orange-600 border-2 border-white shadow-sm shrink-0 z-10"
              title={`Train is currently at ${station.station_name}`}
            >
              <Train className="w-4 h-4 text-white" />
            </div>
          </div>
        ) : isLast ? (
          /* FINAL DESTINATION NODE */
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-rose-500 to-rose-600 border-2 border-white shadow-sm shadow-rose-500/40 shrink-0 z-10 my-0.5"
            title="Final Destination"
          >
            <Flag className="w-3.5 h-3.5 text-white" />
          </div>
        ) : isFirst ? (
          /* ORIGIN STATION NODE */
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-emerald-500 to-emerald-600 border-2 border-white shadow-sm shadow-emerald-500/40 shrink-0 z-10 my-0.5"
            title="Journey Origin"
          >
            <CircleDot className="w-3.5 h-3.5 text-white" />
          </div>
        ) : isPassed ? (
          /* TRAVERSED / COMPLETED STATION CHECKPOINT */
          <div
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white bg-emerald-500 border-2 border-emerald-100 shadow-2xs shrink-0 z-10 my-0.5"
            title={`Passed: ${station.station_name}`}
          >
            <Check className="w-3 h-3 text-white stroke-[3]" />
          </div>
        ) : (
          /* UPCOMING STATION NODE (Clean minimalistic stop indicator) */
          <div
            className={`rounded-full flex items-center justify-center bg-white border-2 shrink-0 z-10 my-0.5 ${
              isNextStop
                ? 'w-6 h-6 sm:w-7 sm:h-7 border-amber-400 bg-amber-50 text-amber-600 shadow-2xs'
                : 'w-4 h-4 sm:w-5 sm:h-5 border-slate-300'
            }`}
            title={`Upcoming halt: ${station.station_name}`}
          >
            {isNextStop && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
        )}

        {/* Bottom Connecting Vertical Line */}
        {!isLast && (
          <div
            className={`grow min-h-6 sm:min-h-8 rounded-full transition-colors relative flex justify-center ${
              isCurrent
                ? 'w-1 bg-gradient-to-b from-orange-500 via-amber-400 to-slate-200 animate-pulse'
                : isPassed
                ? 'w-1 bg-orange-500'
                : 'w-0.5 bg-slate-200'
            }`}
            aria-hidden="true"
          >
            {/* Animated Downward Guidance Indicator from Current Station towards Destination */}
            {isCurrent && (
              <motion.div
                className="absolute top-1 text-orange-500"
                animate={{ y: [0, 14, 0], opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              >
                <ArrowDown className="w-3 h-3 stroke-[3]" />
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Station Content Card */}
      <div className="grow min-w-0 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          {/* Station Name, Code, Badges */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h4 className={`text-sm sm:text-base font-bold tracking-tight ${
              isCurrent ? 'text-orange-950 font-black' : 'text-slate-900'
            }`}>
              {station.station_name}
            </h4>

            <span className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-md border ${
              isCurrent
                ? 'bg-orange-100 text-orange-800 border-orange-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {station.station_code}
            </span>

            {/* Distance KM */}
            {station.distance_km !== null && station.distance_km !== undefined && (
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {station.distance_km} KM
              </span>
            )}

            {/* Non-Stopping Indicator */}
            {isNonStopping && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-300">
                Non-Stopping
              </span>
            )}

            {platform && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200">
                <MapPin className="w-3 h-3 text-slate-400" />
                PF {platform}
              </span>
            )}

            {isFirst && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                Origin
              </span>
            )}

            {isLast && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                Destination
              </span>
            )}

            {/* LIVE TRAIN ARRIVAL / LOCATION BADGE */}
            {isCurrent && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                <Train className="w-3 h-3 animate-bounce" />
                <span>Train Reaching / Active</span>
              </span>
            )}

            {isNextStop && !isCurrent && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                <ArrowDown className="w-2.5 h-2.5 animate-bounce" />
                <span>Next Halt</span>
              </span>
            )}

            {isPassed && !isFirst && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                <span>Departed</span>
              </span>
            )}
          </div>

          {/* Delay Badge */}
          {!isNonStopping && (station.delay_minutes !== null || (station.status && safeText(station.status))) && (
            <div className="self-start sm:self-auto shrink-0 mt-0.5 sm:mt-0">
              <DelayBadge
                delayMinutes={station.delay_minutes}
                statusText={safeText(station.status)}
                size="sm"
              />
            </div>
          )}
        </div>

        {/* Timings Display Section */}
        {!isNonStopping && hasTimings && (
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white/80 rounded-xl p-2 sm:p-3 border border-slate-100 text-xs">
            {/* Arrival Time */}
            {arrivalTime ? (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Arrival</span>
                <span className="font-semibold text-slate-800 font-mono text-[11px] sm:text-xs">
                  {arrivalTime}
                </span>
              </div>
            ) : isFirst ? (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Arrival</span>
                <span className="text-slate-400 italic text-[11px]">Starts Here</span>
              </div>
            ) : null}

            {/* Departure Time */}
            {departureTime ? (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Departure</span>
                <span className="font-semibold text-slate-800 font-mono text-[11px] sm:text-xs">
                  {departureTime}
                </span>
              </div>
            ) : isLast ? (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Departure</span>
                <span className="text-slate-400 italic text-[11px]">Terminates Here</span>
              </div>
            ) : null}

            {/* Scheduled Time */}
            {scheduledTime && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Scheduled</span>
                <span className="font-medium text-slate-600 font-mono text-[11px] sm:text-xs">
                  {scheduledTime}
                </span>
              </div>
            )}

            {/* Actual Time */}
            {actualTime && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Actual</span>
                <span
                  className={`font-mono text-[11px] sm:text-xs font-bold ${
                    station.delay_minutes && station.delay_minutes > 0
                      ? 'text-amber-700'
                      : 'text-emerald-700'
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

