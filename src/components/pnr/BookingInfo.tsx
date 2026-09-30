import React from 'react';
import { CreditCard, Calendar, Tag, Check, Sparkles, Clock, FileText } from 'lucide-react';
import { PnrData } from '../../types/pnr';

interface BookingInfoProps {
  data: PnrData;
}

export const BookingInfo: React.FC<BookingInfoProps> = ({ data }) => {
  const formatFare = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '—';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-orange-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Booking & Fare Information
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        {/* Booking Date */}
        {data.booking_date && (
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
              Booking Date
            </span>
            <span className="font-medium text-slate-800 text-xs sm:text-sm mt-0.5 block">
              {data.booking_date}
            </span>
          </div>
        )}

        {/* Quota */}
        {data.quota && (
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
              Quota
            </span>
            <span className="font-bold text-slate-800 text-xs sm:text-sm mt-0.5 block">
              {data.quota}
            </span>
          </div>
        )}

        {/* Ticket Fare */}
        {data.ticket_fare !== undefined && data.ticket_fare !== null && (
          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <span className="text-[11px] text-emerald-700 uppercase tracking-wider block font-semibold">
              Ticket Fare
            </span>
            <span className="font-extrabold text-emerald-800 text-sm sm:text-base mt-0.5 block">
              {formatFare(data.ticket_fare)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
