import React, { useState, useEffect, useCallback } from 'react';
import { StationsProvider } from './context/StationsContext';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { initBackendWarmup } from './services/backendWarmup';
import { HomePage } from './pages/HomePage';
import { TrainRunningStatusPage } from './pages/TrainRunningStatusPage';
import { PnrStatusPage } from './pages/PnrStatusPage';
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

  // Track popstate for browser back / forward buttons
  useEffect(() => {
    // Instant background warm-up for Render backend
    initBackendWarmup();

    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      setActiveRunningStatusParams(null);
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

  const isRunningStatusRoute =
    currentPath === '/train-running-status' ||
    currentPath.startsWith('/train-running-status') ||
    currentPath === '/running-status' ||
    currentPath === '/spot-your-train';

  const isPnrRoute =
    currentPath === '/pnr-status' ||
    currentPath.startsWith('/pnr-status') ||
    currentPath === '/pnr';

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
            } else {
              setActiveRunningStatusParams(null);
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
        ) : (
          <HomePage
            onNavigateToRunningStatus={handleOpenSpotYourTrain}
            onNavigateToPnr={() => navigateTo('/pnr-status')}
          />
        )}

        {/* Main Footer */}
        <Footer
          onNavigate={(path) => {
            if (path === '/train-running-status') {
              handleOpenSpotYourTrain();
            } else {
              setActiveRunningStatusParams(null);
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
            } else {
              setActiveRunningStatusParams(null);
              navigateTo(path);
            }
          }}
        />
      </div>
    </StationsProvider>
  );
}
