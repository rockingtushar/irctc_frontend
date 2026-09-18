import React, { useState } from 'react';
import { useStations } from '../context/StationsContext';
import { Train, RefreshCw, Settings, Globe, Search, Radio, Ticket, Armchair } from 'lucide-react';
import { VandeBharatHeaderTrain } from './VandeBharatHeaderTrain';

interface HeaderProps {
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute = '/',
  onNavigate,
}) => {
  const { stationCount, isLoading, error, source, refreshStations, apiUrl, updateApiUrl } = useStations();
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [tempUrl, setTempUrl] = useState<string>(apiUrl);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUrl.trim()) return;
    setIsUpdating(true);
    await updateApiUrl(tempUrl.trim());
    setIsUpdating(false);
    setIsSettingsOpen(false);
  };

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
    <header className="h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0 shadow-2xs w-full relative overflow-hidden">
      {/* Animated Orange Vande Bharat Express Passing through Header */}
      <VandeBharatHeaderTrain />

      {/* Left: Brand & Logo */}
      <div className="flex items-center shrink-0 relative z-20">
        <button
          type="button"
          onClick={() => onNavigate?.('/')}
          className="flex items-center gap-2 sm:gap-3 select-none cursor-pointer focus:outline-none text-left bg-white/85 backdrop-blur-xs py-1 pr-2 rounded-xl"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
            <Train className="w-4 h-4 sm:w-5 sm:h-5" />
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

        <button
          type="button"
          onClick={() => onNavigate?.('/chart-prepared')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            isChartActive
              ? 'bg-white text-orange-600 shadow-2xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Armchair className="w-3.5 h-3.5" />
          <span>Chart Prepared</span>
          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded-full">
            Vacant
          </span>
        </button>
      </nav>

      
    </header>
  );
};
