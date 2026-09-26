import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, Ticket, FileText } from 'lucide-react';
import { PnrData } from '../../types/pnr';

interface PnrStatusCardProps {
  data: PnrData;
}

export const PnrStatusCard: React.FC<PnrStatusCardProps> = ({ data }) => {
  const statusStr = (data.status || 'Unknown').trim();
  const statusLower = statusStr.toLowerCase();

  const isConfirmed =
    statusLower.includes('confirm') ||
    statusLower.includes('cnf') ||
    statusLower === 'confirmed';

  const isRac = statusLower.includes('rac');
  const isWaitlist = statusLower.includes('wl') || statusLower.includes('wait') || data.is_waitlisted;
  const isCancelled = statusLower.includes('can') || statusLower.includes('cancel');

  const getStatusBadgeStyle = () => {
    if (isConfirmed) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
        iconBg: 'bg-emerald-500 text-white',
        icon: <CheckCircle2 className="w-5 h-5" />,
      };
    }
    if (isRac) {
      return {
        bg: 'bg-amber-500/10 text-amber-700 border-amber-300',
        iconBg: 'bg-amber-500 text-white',
        icon: <Clock className="w-5 h-5" />,
      };
    }
    if (isWaitlist) {
      return {
        bg: 'bg-indigo-500/10 text-indigo-700 border-indigo-300',
        iconBg: 'bg-indigo-500 text-white',
        icon: <AlertTriangle className="w-5 h-5" />,
      };
    }
    if (isCancelled) {
      return {
        bg: 'bg-rose-500/10 text-rose-700 border-rose-300',
        iconBg: 'bg-rose-500 text-white',
        icon: <XCircle className="w-5 h-5" />,
      };
    }
    return {
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
      iconBg: 'bg-slate-600 text-white',
      icon: <Ticket className="w-5 h-5" />,
    };
  };

  const badge = getStatusBadgeStyle();

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Top Strip */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 sm:px-6 py-3.5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            PNR Status
          </span>
          <span className="font-mono text-base sm:text-lg font-extrabold tracking-widest text-white bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700">
            {data.pnr}
          </span>
        </div>

        {data.chart_status && (
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/60">
            <FileText className="w-3 h-3 text-amber-400" />
            <span className="font-medium">{data.chart_status}</span>
          </div>
        )}
      </div>

      {/* Main Status Callout */}
      <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${badge.iconBg}`}>
            {badge.icon}
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Overall Booking Status
            </span>
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 block">
              {data.status || 'Confirmed'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider ${badge.bg}`}>
            {data.status}
          </div>

          {data.is_waitlisted && (
            <div className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold">
              Waitlisted Ticket
            </div>
          )}

          {data.passenger_count > 0 && (
            <div className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-medium">
              {data.passenger_count} {data.passenger_count === 1 ? 'Passenger' : 'Passengers'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
