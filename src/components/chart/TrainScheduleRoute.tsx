import React, { useState } from 'react';
import { Route, ChevronDown, ChevronUp, Clock, MapPin } from 'lucide-react';
import { ScheduleStation } from '../../types/chart';

interface TrainScheduleRouteProps {
  stations: ScheduleStation[];
  selectedBoardingCode?: string;
  onSelectBoardingStation?: (code: string) => void;
}

export const TrainScheduleRoute: React.FC<TrainScheduleRouteProps> = ({
  stations,
  selectedBoardingCode,
  onSelectBoardingStation,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!stations || stations.length === 0) return null;

  const getStationCode = (st: ScheduleStation): string => st.station_code || st.code || '';
  const getStationName = (st: ScheduleStation): string => st.station_name || st.name || '';
  const getArrivalTime = (st: ScheduleStation): string => st.arrival_time || st.arrival || '--';
  const getDepartureTime = (st: ScheduleStation): string => st.departure_time || st.departure || '--';
  const getHaltTime = (st: ScheduleStation): string => st.halt_time || st.halt || '--';

  const firstStation = stations[0];
  const lastStation = stations[stations.length - 1];

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200/80 overflow-hidden transition-all">
      {/* Route Header / Toggle Button */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/80 transition-colors cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                Train Route &amp; Schedule
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {stations.length} Stops
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {getStationName(firstStation)} ({getStationCode(firstStation)}) →{' '}
              {getStationName(lastStation)} ({getStationCode(lastStation)})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-orange-600">
          <span>{isExpanded ? 'Hide Route' : 'View Stops'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Route Timeline / Table */}
      {isExpanded && (
        <div className="border-t border-slate-200 p-3 sm:p-4 bg-white animate-in fade-in duration-200">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Station</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Arrival</th>
                  <th className="py-2.5 px-3">Departure</th>
                  <th className="py-2.5 px-3">Halt</th>
                  <th className="py-2.5 px-3">Distance</th>
                  <th className="py-2.5 px-3">Day</th>
                  <th className="py-2.5 px-3 text-right">Boarding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stations.map((st, index) => {
                  const code = getStationCode(st);
                  const name = getStationName(st);
                  const isSelected = selectedBoardingCode === code;
                  const isDisabled = Boolean(st.boarding_disabled);

                  return (
                    <tr
                      key={`${code}-${index}`}
                      className={`hover:bg-orange-50/50 transition-colors ${
                        isSelected ? 'bg-orange-50 font-bold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-bold border border-slate-200">
                          {code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{getArrivalTime(st)}</td>
                      <td className="py-2.5 px-3 text-slate-600">{getDepartureTime(st)}</td>
                      <td className="py-2.5 px-3 text-slate-500">{getHaltTime(st)}</td>
                      <td className="py-2.5 px-3 text-slate-500">{st.distance ? `${st.distance} km` : '--'}</td>
                      <td className="py-2.5 px-3 text-slate-500">Day {st.day || 1}</td>
                      <td className="py-2.5 px-3 text-right">
                        {isDisabled ? (
                          <span className="text-[10px] text-slate-400 italic">Disabled</span>
                        ) : onSelectBoardingStation ? (
                          <button
                            type="button"
                            onClick={() => onSelectBoardingStation(code)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-orange-500 text-white'
                                : 'bg-slate-100 hover:bg-orange-100 text-orange-700'
                            }`}
                          >
                            {isSelected ? 'Boarding Here' : 'Select'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold">Available</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Vertical Timeline Cards */}
          <div className="md:hidden space-y-2">
            {stations.map((st, index) => {
              const code = getStationCode(st);
              const name = getStationName(st);
              const isSelected = selectedBoardingCode === code;
              const isDisabled = Boolean(st.boarding_disabled);

              return (
                <div
                  key={`${code}-${index}`}
                  className={`p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                    isSelected
                      ? 'bg-orange-50 border-orange-400 ring-1 ring-orange-400'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-[11px] font-mono text-slate-400 mt-0.5">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 truncate">
                          {name}
                        </span>
                        <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                          {code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>Arr: {getArrivalTime(st)}</span>
                        <span>•</span>
                        <span>Dep: {getDepartureTime(st)}</span>
                        {getHaltTime(st) !== '--' && (
                          <>
                            <span>•</span>
                            <span>Halt: {getHaltTime(st)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isDisabled ? (
                      <span className="text-[10px] text-slate-400 italic">No Boarding</span>
                    ) : onSelectBoardingStation ? (
                      <button
                        type="button"
                        onClick={() => onSelectBoardingStation(code)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-100 text-orange-600 hover:bg-orange-100'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Board'}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
