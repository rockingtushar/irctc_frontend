import React from 'react';
import { Search, Radio, Ticket } from 'lucide-react';
import { VandeBharatHeaderTrain } from './VandeBharatHeaderTrain';
import { OrangeVandeBharatLogo } from './OrangeVandeBharatLogo';

interface HeaderProps {
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
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

  const isSearchActive = !isRunningStatusActive && !isPnrActive;

  return (
    <header className="h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0 shadow-2xs w-full relative overflow-hidden">
      {/* Animated Orange Vande Bharat Express Passing through Header */}
      <VandeBharatHeaderTrain />

      {/* Left: Brand & Logo */}
      <div className="flex items-center shrink-0 relative z-20">
        <button
          type="button"
          onClick={() => onNavigate?.('/')}
          className="flex items-center gap-0.5 select-none cursor-pointer focus:outline-none text-left bg-white/90 backdrop-blur-xs py-1 px-1.5 rounded-xl hover:bg-white transition-all group"
        >
          {/* Authentic Orange Vande Bharat Locomotive (Nose pointing Left, front 2 wheels, touching 'I') */}
          <div className="shrink-0 -mr-0.5">
            <OrangeVandeBharatLogo className="h-6 sm:h-7 w-auto object-contain transition-transform group-hover:scale-105" />
          </div>
          <div>
            <span className="text-base sm:text-xl font-bold tracking-tight text-slate-800 block whitespace-nowrap">
              Indian Railways<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">.</span>
            </span>
          </div>
        </button>
      </div>

      {/* Center: Desktop Navigation Tabs (Perfect Absolute Center) */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-100/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200/80 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 shadow-2xs" aria-label="Main Navigation">
        <button
          type="button"
          onClick={() => onNavigate?.('/')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            isSearchActive
              ? 'bg-white text-orange-600 shadow-2xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search Trains</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('/train-running-status')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            isRunningStatusActive
              ? 'bg-white text-orange-600 shadow-2xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Spot Your Train</span>
          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-orange-100 text-orange-700 rounded-full">
            Live
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('/pnr-status')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            isPnrActive
              ? 'bg-white text-orange-600 shadow-2xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>PNR Status</span>
        </button>
      </nav>

      {/* Right Side: Spacer for symmetrical balance */}
      <div className="hidden sm:flex items-center shrink-0 z-20 w-8" aria-hidden="true" />
    </header>
  );
};
