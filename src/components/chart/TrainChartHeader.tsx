import React from 'react';
import {
  Train,
  Clock,
  MapPin,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Armchair,
} from 'lucide-react';
import { ChartTrainData } from '../../types/chart';

interface TrainChartHeaderProps {
  data: ChartTrainData;
}

export const TrainChartHeader: React.FC<TrainChartHeaderProps> = ({ data }) => {
  const totalVacantBerths = data.coaches.reduce((acc, c) => acc + (c.vacant_berths || 0), 0);
  const coachesWithVacancy = data.coaches.filter((c) => (c.vacant_berths || 0) > 0).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-3 sm:p-4 relative overflow-hidden">
      {/* Background Subtle Accent */}
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-orange-50/50 via-amber-50/20 to-transparent pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
        {/* Train & Route Details */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-2.5 py-1 rounded-xl bg-orange-500 text-white font-black text-xs sm:text-sm tracking-wide shadow-2xs">
            {data.train_number}
          </span>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {data.train_name}
          </h2>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded-lg border border-slate-200/70">
            <span>{data.from}</span>
            <ArrowRight className="w-3 h-3 text-orange-500 shrink-0" />
            <span>{data.to}</span>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {data.train_start_date}
          </span>
        </div>

        {/* Right Stats & Chart Status Pills */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Chart 1 Status */}
          <div className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-orange-500" />
            <span className="text-slate-500">Chart 1:</span>
            <span className="font-bold text-slate-800 truncate max-w-[130px]">
              {data.chart_one_date || 'Prepared'}
            </span>
          </div>

          {/* Chart 2 Status */}
          <div className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-500" />
            <span className="text-slate-500">Chart 2:</span>
            <span className="font-bold text-slate-800 truncate max-w-[130px]">
              {data.chart_two_date || 'Pending'}
            </span>
          </div>

          {/* Total Vacant Berths Badge */}
          <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-1.5 text-xs font-bold shadow-2xs">
            <Armchair className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-700 font-semibold">Vacant:</span>
            <span className="font-black text-emerald-800 text-sm">{totalVacantBerths}</span>
            <span className="text-[10px] text-emerald-600 font-medium">
              ({coachesWithVacancy}/{data.coaches.length} coaches)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
