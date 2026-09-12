import React, { useEffect } from 'react';
import { StationsProvider } from './context/StationsContext';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { Footer } from './components/Footer';

export default function App() {
  useEffect(() => {
    const apiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

    if (!apiUrl) {
      console.warn('VITE_API_URL is not configured');
      return;
    }

    fetch(`${apiUrl}/health`)
      .then(() => {
        console.log('Backend warm-up request sent');
      })
      .catch(() => {
        console.log('Backend warm-up request failed');
      });
  }, []);

  return (
    <StationsProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-orange-50/40 via-slate-50 to-slate-100/70 text-slate-900 font-sans antialiased selection:bg-orange-500 selection:text-white relative overflow-x-hidden" id="rail-app-root">
        {/* Subtle Ambient Gradient Glow in top background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[360px] bg-gradient-to-b from-orange-200/30 via-amber-100/20 to-transparent blur-3xl pointer-events-none -z-10" />

        {/* Top Navbar */}
        <Header />

        {/* Main Content Area */}
        <HomePage />

        {/* Main Footer */}
        <Footer />
      </div>
    </StationsProvider>
  );
}