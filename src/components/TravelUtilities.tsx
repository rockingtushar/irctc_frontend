import React from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  ExternalLink, 
  Activity, 
  PhoneCall, 
  Search,
  CheckCircle2,
  Calendar,
  Loader2,
  Armchair
} from 'lucide-react';
import { Station } from '../types/station';

interface TravelUtilitiesProps {
  onSelectRoute: (from: Station, to: Station) => void;
  isSearching?: boolean;
  activeRouteKey?: string | null;
  onNavigateToRunningStatus?: (trainNo: string, date?: string) => void;
  onNavigateToPnr?: () => void;
  onNavigateToChart?: (trainNo?: string, date?: string, station?: string) => void;
}

interface PopularRoute {
  from: Station;
  to: Station;
  tag?: string;
  trainName?: string;
}

const POPULAR_ROUTES: PopularRoute[] = [
  {
    from: { code: 'NDLS', name: 'NEW DELHI' },
    to: { code: 'CNB', name: 'KANPUR CENTRAL' },
    tag: 'Popular',
    trainName: 'Kanpur Shatabdi',
  },
  {
    from: { code: 'NDLS', name: 'NEW DELHI' },
    to: { code: 'BSB', name: 'VARANASI JN' },
    tag: 'Vande Bharat',
    trainName: 'Vande Bharat Exp',
  },
  {
    from: { code: 'CSMT', name: 'MUMBAI CSMT' },
    to: { code: 'PUNE', name: 'PUNE JN' },
    tag: 'Deccan Exp',
    trainName: 'Deccan Queen',
  },
  {
    from: { code: 'SBC', name: 'KSR BENGALURU' },
    to: { code: 'MAS', name: 'MGR CHENNAI CENTRAL' },
    tag: 'Shatabdi',
    trainName: 'Chennai Shatabdi',
  },
  {
    from: { code: 'NDLS', name: 'NEW DELHI' },
    to: { code: 'LKO', name: 'LUCKNOW NR' },
    tag: 'Tejas Exp',
    trainName: 'Lucknow Tejas',
  },
  {
    from: { code: 'HWH', name: 'HOWRAH JN' },
    to: { code: 'PNBE', name: 'PATNA JN' },
    tag: 'Jan Shatabdi',
    trainName: 'Patna Jan Shatabdi',
  },
  {
    from: { code: 'NDLS', name: 'NEW DELHI' },
    to: { code: 'MMCT', name: 'MUMBAI CENTRAL' },
    tag: 'Rajdhani',
    trainName: 'Mumbai Rajdhani',
  },
  {
    from: { code: 'ADI', name: 'AHMEDABAD JN' },
    to: { code: 'MMCT', name: 'MUMBAI CENTRAL' },
    tag: 'Vande Bharat',
    trainName: 'Gujarat Express',
  },
  {
    from: { code: 'NDLS', name: 'NEW DELHI' },
    to: { code: 'JP', name: 'JAIPUR' },
    tag: 'Double Decker',
    trainName: 'Jaipur Superfast',
  },
];

export const TravelUtilities: React.FC<TravelUtilitiesProps> = ({ 
  onSelectRoute, 
  isSearching = false,
  activeRouteKey = null,
  onNavigateToRunningStatus,
  onNavigateToPnr,
  onNavigateToChart,
}) => {
  const [clickedKey, setClickedKey] = React.useState<string | null>(null);

  // Clear local clicked key when searching finishes
  React.useEffect(() => {
    if (!isSearching) {
      setClickedKey(null);
    }
  }, [isSearching]);

  const handleRouteClick = (route: PopularRoute) => {
    const key = `${route.from.code}-${route.to.code}`;
    setClickedKey(key);
    onSelectRoute(route.from, route.to);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pt-1 pb-6 animate-in fade-in duration-300">
      
      {/* 1. Popular Train Routes (1-Click Instant Search) */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-md shadow-orange-500/5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xs shadow-orange-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">Popular Train Routes</h3>
              <p className="text-[11px] text-slate-500">Click any route to instantly search live trains & tickets</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 rounded-full shadow-xs shadow-orange-500/20">
            Instant Search
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {POPULAR_ROUTES.map((route, idx) => {
            const routeKey = `${route.from.code}-${route.to.code}`;
            const isThisRouteSearching = isSearching && (clickedKey === routeKey || activeRouteKey === routeKey);

            return (
              <button
                key={`${route.from.code}-${route.to.code}-${idx}`}
                type="button"
                disabled={isSearching}
                onClick={() => handleRouteClick(route)}
                className={`flex items-center justify-between p-3 rounded-xl transition-all text-left group cursor-pointer disabled:pointer-events-none ${
                  isThisRouteSearching
                    ? 'bg-gradient-to-r from-orange-100/80 to-amber-100/60 border-orange-400 shadow-xs ring-2 ring-orange-200/70'
                    : 'bg-slate-50/80 hover:bg-gradient-to-r hover:from-orange-50/90 hover:to-amber-50/50 active:bg-orange-100 border-slate-200/80 hover:border-orange-300 hover:shadow-xs disabled:opacity-60'
                } border`}
              >
                <div className="min-w-0 pr-2">
                  <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                    isThisRouteSearching ? 'text-orange-600' : 'text-slate-800 group-hover:text-orange-600'
                  }`}>
                    <span className="truncate">{route.from.name.split(' ')[0]}</span>
                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-all ${
                      isThisRouteSearching 
                        ? 'text-orange-500 translate-x-0.5' 
                        : 'text-slate-400 group-hover:text-orange-500 group-hover:translate-x-0.5'
                    }`} />
                    <span className="truncate">{route.to.name.split(' ')[0]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                    <span className="font-mono font-bold text-slate-700 bg-slate-200/60 px-1.5 py-0.5 rounded">
                      {route.from.code} → {route.to.code}
                    </span>
                    {route.tag && (
                      <span className="bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-orange-200/50">
                        {route.tag}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-all shadow-2xs ${
                  isThisRouteSearching
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 scale-105 shadow-xs shadow-orange-500/30'
                    : 'bg-white border-slate-200 text-slate-500 group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-amber-500 group-hover:text-white group-hover:border-orange-500 group-hover:scale-105 group-hover:shadow-xs group-hover:shadow-orange-500/20'
                }`}>
                  {isThisRouteSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Quick Live Rail Services & Tools */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => onNavigateToChart?.()}
          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/10 transition-all flex flex-col justify-between group text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500/15 to-amber-500/15 text-orange-600 flex items-center justify-center border border-orange-200/60">
              <Armchair className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
              Vacant
            </span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 group-hover:text-orange-600">Chart Prepared</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Vacant berths & coach view</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToPnr?.()}
          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md hover:shadow-orange-500/5 transition-all flex flex-col justify-between group text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 flex items-center justify-center border border-blue-200/50">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
              IRCTC
            </span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 group-hover:text-orange-600">PNR Status</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Live confirmation check</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToRunningStatus?.('', '')}
          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md hover:shadow-orange-500/5 transition-all flex flex-col justify-between group text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 flex items-center justify-center border border-emerald-200/50">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
              Live
            </span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 group-hover:text-orange-600">Spot Your Train</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Live running status & delays</p>
          </div>
        </button>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600 flex items-center justify-center border border-amber-200/50">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200/50">10 AM</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Tatkal Timing</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">AC 10 AM | Non-AC 11 AM</p>
          </div>
        </div>

        <a
          href="tel:139"
          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md hover:shadow-orange-500/5 transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 text-rose-600 flex items-center justify-center border border-rose-200/50">
              <PhoneCall className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200/50">24x7</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 group-hover:text-orange-600">Helpline 139</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Rail Security & Enquiry</p>
          </div>
        </a>
      </div>

      {/* 3. Official IRCTC Guidelines & Assurance */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/5 border border-orange-200/80 flex items-center gap-3 shadow-xs">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span>Direct IRCTC Seat Availability Engine</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </h4>
          <p className="text-[11px] text-slate-600 line-clamp-1 sm:line-clamp-none mt-0.5">
            General advance booking is open for 60 days. Instant live seat refresh with quota filtering.
          </p>
        </div>
      </div>

    </div>
  );
};
