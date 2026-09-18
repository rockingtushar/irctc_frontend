import React, { useState, useEffect, useCallback } from 'react';
import { StationsProvider } from './context/StationsContext';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HomePage } from './pages/HomePage';
import { TrainRunningStatusPage } from './pages/TrainRunningStatusPage';
import { PnrStatusPage } from './pages/PnrStatusPage';
import { ChartPreparedPage } from './pages/ChartPreparedPage';
import { Footer } from './components/Footer';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const [activeRunningStatusParams, setActiveRunningStatusParams] = useState<{
    trainNo?: string;
    date?: string;
  } | null>(null);

  const [activeChartParams, setActiveChartParams] = useState<{
    trainNo?: string;
    date?: string;
    station?: string;
  } | null>(null);

  // Track popstate for browser back / forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      setActiveRunningStatusParams(null);
      setActiveChartParams(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((path: string, queryParams?: Record<string, string>) => {
    if (typeof window !== 'undefined') {
      let fullUrl = path;
      if (queryParams && Object.keys(queryParams).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(queryParams).forEach(([k, v]) => {
          if (v) searchParams.set(k, v);
        });
        const qs = searchParams.toString();
        if (qs) fullUrl = `${path}?${qs}`;
      }
      window.history.pushState(null, '', fullUrl);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleOpenSpotYourTrain = useCallback((trainNo?: string, date?: string) => {
    if (trainNo && /^\d{5}$/.test(trainNo.trim())) {
      setActiveRunningStatusParams({ trainNo: trainNo.trim(), date });
      navigateTo('/train-running-status', { train_no: trainNo.trim(), journey_date: date || '' });
    } else {
      // Clean Spot Your Train without any default train
      setActiveRunningStatusParams(null);
      navigateTo('/train-running-status');
    }
  }, [navigateTo]);

  const handleOpenChartPrepared = useCallback((trainNo?: string, date?: string, station?: string) => {
    if (trainNo && /^\d{4,5}$/.test(trainNo.trim())) {
      setActiveChartParams({ trainNo: trainNo.trim(), date, station });
      navigateTo('/chart-prepared', {
        train_no: trainNo.trim(),
        date: date || '',
        station: station || '',
      });
    } else {
      setActiveChartParams(null);
      navigateTo('/chart-prepared');
    }
  }, [navigateTo]);

  const isRunningStatusRoute =
    currentPath === '/train-running-status' ||
    currentPath.startsWith('/train-running-status') ||
    currentPath === '/running-status' ||
    currentPath === '/spot-your-train';

  const isPnrRoute =
    currentPath === '/pnr-status' ||
    currentPath.startsWith('/pnr-status') ||
    currentPath === '/pnr';

  const isChartRoute =
    currentPath === '/chart-prepared' ||
    currentPath.startsWith('/chart-prepared') ||
    currentPath === '/chart' ||
    currentPath.startsWith('/chart') ||
    currentPath === '/chart-vacancy';

  return (
    <StationsProvider>
      <div
        className="min-h-screen flex flex-col bg-gradient-to-b from-orange-50/40 via-slate-50 to-slate-100/70 text-slate-900 font-sans antialiased selection:bg-orange-500 selection:text-white relative overflow-x-hidden pb-16 md:pb-0"
        id="rail-app-root"
      >
        {/* Subtle Ambient Gradient Glow in top background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[360px] bg-gradient-to-b from-orange-200/30 via-amber-100/20 to-transparent blur-3xl pointer-events-none -z-10" />

        {/* Top Navbar */}
        <Header
          currentRoute={currentPath}
          onNavigate={(path) => {
            if (path === '/train-running-status') {
              handleOpenSpotYourTrain();
            } else if (path === '/chart-prepared') {
              handleOpenChartPrepared();
            } else {
              setActiveRunningStatusParams(null);
              setActiveChartParams(null);
              navigateTo(path);
            }
          }}
        />

        {/* Main Content Area */}
        {isPnrRoute ? (
          <PnrStatusPage />
        ) : isRunningStatusRoute ? (
          <TrainRunningStatusPage
            initialTrainNo={activeRunningStatusParams?.trainNo}
            initialDate={activeRunningStatusParams?.date}
            onNavigateToBooking={() => {
              setActiveRunningStatusParams(null);
              navigateTo('/');
            }}
          />
        ) : isChartRoute ? (
          <ChartPreparedPage
            initialTrainNo={activeChartParams?.trainNo}
            initialDate={activeChartParams?.date}
            initialStation={activeChartParams?.station}
          />
        ) : (
          <HomePage
            onNavigateToRunningStatus={handleOpenSpotYourTrain}
            onNavigateToPnr={() => navigateTo('/pnr-status')}
            onNavigateToChart={handleOpenChartPrepared}
          />
        )}

        {/* Main Footer */}
        <Footer
          onNavigate={(path) => {
            if (path === '/train-running-status') {
              handleOpenSpotYourTrain();
            } else if (path === '/chart-prepared') {
              handleOpenChartPrepared();
            } else {
              setActiveRunningStatusParams(null);
              setActiveChartParams(null);
              navigateTo(path);
            }
          }}
        />

        {/* Mobile Bottom Navigation Bar (Fixed for mobile thumb reach) */}
        <MobileBottomNav
          currentRoute={currentPath}
          onNavigate={(path) => {
            if (path === '/train-running-status') {
              handleOpenSpotYourTrain();
            } else if (path === '/chart-prepared') {
              handleOpenChartPrepared();
            } else {
              setActiveRunningStatusParams(null);
              setActiveChartParams(null);
              navigateTo(path);
            }
          }}
        />
      </div>
    </StationsProvider>
  );
}
