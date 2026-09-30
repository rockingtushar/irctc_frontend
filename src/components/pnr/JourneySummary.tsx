import React from 'react';
import { Train, Calendar, ArrowRight, MapPin, Gauge, Armchair } from 'lucide-react';
import { Journey } from '../../types/pnr';

interface JourneySummaryProps {
  journey: Journey;
}

export const JourneySummary: React.FC<JourneySummaryProps> = ({ journey }) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Train className="w-4 h-4 text-orange-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Journey Summary
          </h2>
        </div>

        {journey.journey_class && (
          <div className="flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
            <Armchair className="w-3.5 h-3.5" />
            <span>Class: {journey.journey_class}</span>
          </div>
        )}
      </div>

      {/* Train Info Banner */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
          <Train className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs text-slate-500 uppercase tracking-wider block font-semibold">
            Train Details
          </span>
          <span className="text-sm sm:text-base font-extrabold text-slate-800">
            {journey.train_number} - {journey.train_name}
          </span>
        </div>
      </div>

      {/* Visual Route Layout */}
      <div className="relative py-2 px-2 sm:px-4">
        <div className="flex items-center justify-between gap-4">
          {/* Origin Station */}
          <div className="flex-1 text-left">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Source
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-slate-800 block">
              {journey.source_station}
            </span>
            {journey.date && (
              <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                {journey.date}
              </span>
            )}
          </div>

          {/* Center Connector / Train Graphic */}
          <div className="flex flex-col items-center justify-center px-2 shrink-0">
            <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-1 hidden sm:block">
              {journey.train_number}
            </span>
            <div className="flex items-center gap-1 text-orange-500">
              <div className="w-8 sm:w-16 h-0.5 bg-orange-200" />
              <ArrowRight className="w-4 h-4 text-orange-500" />
              <div className="w-8 sm:w-16 h-0.5 bg-orange-200" />
            </div>
            {journey.distance_km !== null && journey.distance_km !== undefined && (
              <span className="text-[10px] font-mono font-semibold text-slate-400 mt-1 flex items-center gap-1">
                <Gauge className="w-2.5 h-2.5" />
                <span>{journey.distance_km} km</span>
              </span>
            )}
          </div>

          {/* Destination Station */}
          <div className="flex-1 text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Destination
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-slate-800 block">
              {journey.destination_station}
            </span>
            {journey.arrival_date && (
              <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                {journey.arrival_date}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Route & Booking Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
        <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
            Boarding Point
          </span>
          <span className="font-mono text-sm font-bold text-slate-800">
            {journey.boarding_point || journey.source_station}
          </span>
        </div>

        <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
            Reservation Upto
          </span>
          <span className="font-mono text-sm font-bold text-slate-800">
            {journey.reservation_upto || journey.destination_station}
          </span>
        </div>

        <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
            Class
          </span>
          <span className="text-sm font-bold text-slate-800">
            {journey.journey_class || '—'}
          </span>
        </div>

        <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
            Total Distance
          </span>
          <span className="text-sm font-bold text-slate-800">
            {journey.distance_km ? `${journey.distance_km} km` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
