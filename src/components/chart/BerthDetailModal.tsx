import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Armchair,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Info,
  Layers,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Berth, ChartCoachData } from '../../types/chart';
import { getCoachTypeLabel } from '../runningStatus/CoachPositionModal';
import {
  normalizeBerthCode,
  getBerthTypeDisplayName,
  getBerthTypeFullName,
  isSideBerth,
} from '../../utils/berthUtils';

// Re-export for backward compatibility
export { getBerthTypeFullName as getBerthCodeFullName };

interface BerthDetailModalProps {
  berth: Berth | null;
  coachData: ChartCoachData;
  onClose: () => void;
}

export const BerthDetailModal: React.FC<BerthDetailModalProps> = ({
  berth,
  coachData,
  onClose,
}) => {
  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!berth) return null;

  const code = normalizeBerthCode(berth.berth_code, berth.berth_no, coachData.class_code);
  const berthName = getBerthTypeFullName(code, berth.berth_no, coachData.class_code);
  const isSide = isSideBerth(code, berth.berth_no, coachData.class_code);
  const classLabel = getCoachTypeLabel(coachData.class_code);

  // Status visual attributes using strict backend computed booleans
  let statusBadge = {
    label: 'Occupied',
    subtext: 'Fully Occupied',
    bg: 'bg-rose-100 text-rose-800 border-rose-300',
    iconBg: 'bg-rose-600 text-white',
    dot: 'bg-rose-500',
    icon: XCircle,
    colorClass: 'text-rose-700',
  };

  if (berth.fully_vacant) {
    statusBadge = {
      label: 'Vacant',
      subtext: 'Fully Vacant',
      bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      iconBg: 'bg-emerald-600 text-white',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
      colorClass: 'text-emerald-700',
    };
  } else if (berth.partially_occupied) {
    statusBadge = {
      label: 'Partially Occupied',
      subtext: 'Partially Vacant across segments',
      bg: 'bg-amber-100 text-amber-900 border-amber-300',
      iconBg: 'bg-amber-500 text-white',
      dot: 'bg-amber-500',
      icon: AlertTriangle,
      colorClass: 'text-amber-700',
    };
  }

  const StatusIcon = statusBadge.icon;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="berth-detail-title"
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black shadow-sm">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="berth-detail-title" className="text-base sm:text-lg font-black text-slate-900">
                  Coach {coachData.coach} • Berth {berth.berth_no}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-lg text-xs font-black uppercase ${
                    code === 'SL'
                      ? 'bg-amber-100 text-amber-950 border border-amber-300'
                      : code === 'SU'
                      ? 'bg-indigo-100 text-indigo-950 border border-indigo-300'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {code || 'BERTH'}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700">
                {berthName} • {classLabel} ({coachData.class_code})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800">
          {/* Side Berth Corridor & Window Location Callout */}
          {isSide && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center gap-3 text-xs text-amber-950 shadow-2xs">
              <span className="w-7 h-7 rounded-xl bg-amber-200 text-amber-950 flex items-center justify-center shrink-0 font-black text-xs">
                {code}
              </span>
              <div>
                <p className="font-black text-amber-900">
                  {code === 'SL' ? 'Side Lower Berth (SL)' : code === 'SU' ? 'Side Upper Berth (SU)' : 'Side Berth'}
                </p>
                <p className="text-[11px] text-amber-800 font-medium">
                  {code === 'SL'
                    ? 'Convenient lower berth along the aisle corridor with a dedicated wide panoramic window.'
                    : 'Upper tier berth along the aisle corridor above the Side Lower berth.'}
                </p>
              </div>
            </div>
          )}

          {/* Status Highlight Banner */}
          <div className={`p-4 rounded-2xl border ${statusBadge.bg} flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${statusBadge.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
                <StatusIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Berth Status</p>
                <p className="text-base font-black">{statusBadge.label}</p>
                <p className="text-xs opacity-90">{statusBadge.subtext}</p>
              </div>
            </div>

            {berth.cabin_coupe_name_no && (
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Bay / Cabin</span>
                <span className="text-sm font-black text-slate-800">No. {berth.cabin_coupe_name_no}</span>
              </div>
            )}
          </div>

          {/* Journey Overview info */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                Train Boarding &amp; Remote
              </span>
              <span className="font-bold text-slate-900">
                {coachData.boarding_station} → {coachData.remote_station || coachData.boarding_station}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Journey Date
              </span>
              <span className="font-bold text-slate-900">{coachData.journey_date}</span>
            </div>
          </div>

          {/* Segment Breakdown - The core of the feature! */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-500" />
                <h4 className="text-sm font-black text-slate-900">
                  Station-to-Station Segment Breakdown
                </h4>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {berth.segments.length} {berth.segments.length === 1 ? 'Segment' : 'Segments'}
              </span>
            </div>

            {berth.segments.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                No segment split details available for this berth.
              </div>
            ) : (
              <div className="space-y-2.5">
                {berth.segments.map((seg, idx) => {
                  const isOccupied = seg.occupancy === true;
                  return (
                    <div
                      key={seg.split_no || idx}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isOccupied
                          ? 'bg-rose-50/70 border-rose-200'
                          : 'bg-emerald-50/70 border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        {/* Segment route */}
                        <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-2xs">
                            {seg.from || 'Origin'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-2xs">
                            {seg.to || 'Destination'}
                          </span>
                        </div>

                        {/* Quota */}
                        {seg.quota && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-white border border-slate-200 text-slate-700">
                            Quota: {seg.quota}
                          </span>
                        )}
                      </div>

                      {/* Status row */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Split #{seg.split_no}
                        </span>

                        <div className="flex items-center gap-1.5 font-bold">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOccupied ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span className={isOccupied ? 'text-rose-700' : 'text-emerald-700'}>
                            {isOccupied ? 'Occupied for this segment' : 'Vacant for this segment'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline Visualizer for Partial Occupancies */}
          {berth.segments.length > 1 && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Journey Timeline Representation</span>
              </div>

              <div className="space-y-3 pl-2">
                {berth.segments.map((seg, sIdx) => {
                  const isOccupied = seg.occupancy === true;
                  return (
                    <div key={sIdx} className="relative pl-6 border-l-2 border-slate-700 pb-2 last:border-l-transparent last:pb-0">
                      {/* Node dot */}
                      <div
                        className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                          isOccupied ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                      />

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-white">
                          {seg.from} → {seg.to}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isOccupied
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isOccupied ? '● Occupied' : '● Vacant'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isOccupied
                          ? 'Passenger travelling between these stations'
                          : 'Not occupied for this segment'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Important IRCTC Semantic Note */}
          <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200/80 flex items-start gap-2 text-[11px] text-slate-600">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong>Notice:</strong> Vacancy status is directly retrieved from IRCTC chart preparation records. An unoccupied segment does not constitute guaranteed reservation eligibility.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
