import React from 'react';
import { RunningStatusCurrentStation, RunningStatusStation } from '../../types/runningStatus';
import { Radio, MapPin, Navigation } from 'lucide-react';
import { DelayBadge } from './DelayBadge';

interface CurrentStationCardProps {
  currentStation: RunningStatusCurrentStation | null;
  stations: RunningStatusStation[];
}

export const CurrentStationCard: React.FC<CurrentStationCardProps> = ({
  currentStation,
  stations,
}) => {
  // If backend returns current_station as null, check if any station in stations array has is_current === true
  const activeStationFromList = stations.find((s) => s.is_current);

  // If neither exists, simply omit that section as strictly instructed
  if (!currentStation && !activeStationFromList) {
    return null;
  }

  const stationName = currentStation?.station_name || activeStationFromList?.station_name || '';
  const stationCode = currentStation?.station_code || activeStationFromList?.station_code || '';
  const platform = currentStation?.platform ?? activeStationFromList?.platform ?? null;
  const sequence = currentStation?.sequence ?? activeStationFromList?.sequence ?? null;
  const delayMinutes = activeStationFromList?.delay_minutes ?? null;
  const statusText = activeStationFromList?.status ?? null;

  return (
    <div
      id="current-station-card"
      className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden transition-all duration-200"
    >
      {/* Decorative background glow & pulse */}
      <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-full text-orange-50 backdrop-blur-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping inline-block" />
                Live Current Station
              </span>
              {sequence !== null && (
                <span className="text-[11px] text-orange-100 font-medium">
                  Stop #{sequence}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-2 mt-1">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {stationName}
              </h3>
              <span className="font-mono text-sm sm:text-base font-bold text-orange-100 bg-white/15 px-2 py-0.5 rounded-md">
                {stationCode}
              </span>
            </div>

            {platform && platform.trim() && (
              <p className="text-xs text-orange-100 mt-0.5 flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-white/80 shrink-0" />
                Platform {platform}
              </p>
            )}
          </div>
        </div>

        {/* Delay & Timing if available */}
        {(delayMinutes !== null || statusText) && (
          <div className="self-start sm:self-auto bg-black/15 backdrop-blur-xs rounded-xl p-2.5 sm:text-right border border-white/15">
            <span className="text-[10px] uppercase font-bold text-orange-200 block mb-1">
              Current Delay
            </span>
            <DelayBadge
              delayMinutes={delayMinutes}
              statusText={statusText}
              className="bg-white/90 text-slate-900 border-none font-bold"
            />
          </div>
        )}
      </div>
    </div>
  );
};
