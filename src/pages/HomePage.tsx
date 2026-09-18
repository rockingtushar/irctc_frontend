import React from 'react';
import { TrainSearchForm } from '../components/TrainSearchForm';
import { TrainSearchParams } from '../types/station';

interface HomePageProps {
  onNavigateToRunningStatus?: (trainNo: string, date?: string) => void;
  onNavigateToPnr?: () => void;
  onNavigateToChart?: (trainNo?: string, date?: string, station?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigateToRunningStatus,
  onNavigateToPnr,
  onNavigateToChart,
}) => {
  const handleSearch = (params: TrainSearchParams) => {
    console.log('[HomePage] Search initiated with params:', params);
  };

  return (
    <main className="flex-1 w-full px-2 py-2 sm:px-6 sm:py-6 lg:p-8 flex flex-col items-center justify-start min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-4xl space-y-4 sm:space-y-6">
        {/* Primary Train Search Form */}
        <div className="w-full">
          <TrainSearchForm
            onSearch={handleSearch}
            onNavigateToRunningStatus={onNavigateToRunningStatus}
            onNavigateToPnr={onNavigateToPnr}
            onNavigateToChart={onNavigateToChart}
          />
        </div>
      </div>
    </main>
  );
};

