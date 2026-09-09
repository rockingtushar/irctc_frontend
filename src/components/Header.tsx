import React, { useState } from 'react';
import { useStations } from '../context/StationsContext';
import { Train, RefreshCw, CheckCircle2, AlertCircle, Settings, Globe } from 'lucide-react';

export const Header: React.FC = () => {
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

  return (
    <header className="h-14 sm:h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0 shadow-2xs">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 select-none">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-orange-500/20">
          <Train className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xl font-bold tracking-tight text-slate-800">
            Indian Railways<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">.</span>
          </span>
        </div>
      </div>

      
    </header>
  );
};
