import React from 'react';
import { User, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Passenger } from '../../types/pnr';

interface PassengerCardProps {
  passengers: Passenger[];
}

export const PassengerCard: React.FC<PassengerCardProps> = ({ passengers }) => {
  if (!passengers || passengers.length === 0) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('CNF') || s.includes('CONFIRM')) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          <CheckCircle className="w-3 h-3" />
          <span>{status}</span>
        </span>
      );
    }
    if (s.includes('RAC')) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
          <Clock className="w-3 h-3" />
          <span>{status}</span>
        </span>
      );
    }
    if (s.includes('WL') || s.includes('WAIT')) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
          <AlertTriangle className="w-3 h-3" />
          <span>{status}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
        <span>{status}</span>
      </span>
    );
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-orange-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Passenger Details ({passengers.length})
          </h2>
        </div>
      </div>

      <div className="space-y-3">
        {passengers.map((passenger, index) => {
          const passNum = passenger.passenger_number || index + 1;
          const booking = passenger.booking || {};
          const current = passenger.current || {};

          return (
            <div
              key={passNum}
              className="border border-slate-200/90 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50/70 transition-colors"
            >
              {/* Passenger Header */}
              <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">
                    {passNum}
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    Passenger {passNum}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">
                    Current:
                  </span>
                  {getStatusBadge(current.status || booking.status || 'Unknown')}
                </div>
              </div>

              {/* Booking & Current Status Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Booking Status Box */}
                <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                      Booking Status
                    </span>
                    {getStatusBadge(booking.status || '—')}
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Coach</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {booking.coach || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Berth</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {booking.berth_number !== undefined && booking.berth_number !== null
                          ? booking.berth_number
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Berth Type</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {booking.berth_code || '—'}
                      </span>
                    </div>
                  </div>

                  {booking.details && (
                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Booking Details:</span>
                      <span className="font-mono font-bold text-slate-700">{booking.details}</span>
                    </div>
                  )}
                </div>

                {/* Current Status Box */}
                <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                      Current Status
                    </span>
                    {getStatusBadge(current.status || '—')}
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Coach</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {current.coach || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Berth</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {current.berth_number !== undefined && current.berth_number !== null
                          ? current.berth_number
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Berth Type</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {current.berth_code || '—'}
                      </span>
                    </div>
                  </div>

                  {current.details && (
                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Current Details:</span>
                      <span className="font-mono font-bold text-slate-700">{current.details}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
