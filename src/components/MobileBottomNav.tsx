import React from 'react';
import { Search, Radio, Ticket, Armchair } from 'lucide-react';

interface MobileBottomNavProps {
  currentRoute?: string;
  onNavigate?: (path: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentRoute = '/',
  onNavigate,
}) => {
  const isRunningStatusActive =
    currentRoute === '/train-running-status' ||
    currentRoute.startsWith('/train-running-status') ||
    currentRoute === '/running-status' ||
    currentRoute === '/spot-your-train';

  const isPnrActive =
    currentRoute === '/pnr-status' ||
    currentRoute.startsWith('/pnr-status') ||
    currentRoute === '/pnr';

  const isChartActive =
    currentRoute === '/chart-prepared' ||
    currentRoute.startsWith('/chart-prepared') ||
    currentRoute === '/chart' ||
    currentRoute.startsWith('/chart') ||
    currentRoute === '/chart-vacancy';

  const isSearchActive = !isRunningStatusActive && !isPnrActive && !isChartActive;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around select-none"
      aria-label="Mobile Navigation Bar"
      id="mobile-bottom-navigation"
    >
      {/* 1. Search Trains */}
      <button
        type="button"
        onClick={() => onNavigate?.('/')}
        className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
          isSearchActive
            ? 'text-orange-600 font-bold scale-[1.03]'
            : 'text-slate-500 hover:text-slate-800 font-medium'
        }`}
      >
        <div className={`relative p-1 rounded-lg transition-all ${isSearchActive ? 'bg-orange-50' : ''}`}>
          <Search className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">Search</span>
      </button>

      {/* 2. Spot Your Train (Live) */}
      <button
        type="button"
        onClick={() => onNavigate?.('/train-running-status')}
        className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer relative ${
          isRunningStatusActive
            ? 'text-orange-600 font-bold scale-[1.03]'
            : 'text-slate-500 hover:text-slate-800 font-medium'
        }`}
      >
        <div className={`relative p-1 rounded-lg transition-all ${isRunningStatusActive ? 'bg-orange-50' : ''}`}>
          <Radio className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-2 text-[8px] font-extrabold uppercase px-1 py-0 bg-orange-500 text-white rounded-full leading-tight shadow-xs">
            Live
          </span>
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">Live Train</span>
      </button>

      {/* 3. PNR Status */}
      <button
        type="button"
        onClick={() => onNavigate?.('/pnr-status')}
        className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer ${
          isPnrActive
            ? 'text-orange-600 font-bold scale-[1.03]'
            : 'text-slate-500 hover:text-slate-800 font-medium'
        }`}
      >
        <div className={`relative p-1 rounded-lg transition-all ${isPnrActive ? 'bg-orange-50' : ''}`}>
          <Ticket className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">PNR Status</span>
      </button>

      {/* 4. Chart Prepared / Vacant Berths */}
      <button
        type="button"
        onClick={() => onNavigate?.('/chart-prepared')}
        className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all cursor-pointer relative ${
          isChartActive
            ? 'text-orange-600 font-bold scale-[1.03]'
            : 'text-slate-500 hover:text-slate-800 font-medium'
        }`}
      >
        <div className={`relative p-1 rounded-lg transition-all ${isChartActive ? 'bg-orange-50' : ''}`}>
          <Armchair className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-3 text-[8px] font-extrabold uppercase px-1 py-0 bg-emerald-600 text-white rounded-full leading-tight shadow-xs">
            Vacant
          </span>
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">Charts</span>
      </button>
    </nav>
  );
};
