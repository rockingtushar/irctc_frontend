import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Ticket,
  HelpCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { PnrData } from '../types/pnr';
import { PnrSearchCard } from '../components/pnr/PnrSearchCard';
import { PnrCaptchaModal } from '../components/pnr/PnrCaptchaModal';
import { PnrResult } from '../components/pnr/PnrResult';

export const PnrStatusPage: React.FC = () => {
  const [activePnr, setActivePnr] = useState<string>('');
  const [isCaptchaOpen, setIsCaptchaOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pnrResult, setPnrResult] = useState<PnrData | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Triggered when user enters 10-digit PNR and clicks "Check PNR Status"
  const handleCheckStatus = useCallback((pnrNumber: string) => {
    setErrorMessage(null);
    setActivePnr(pnrNumber);
    setIsCaptchaOpen(true);
  }, []);

  // Triggered when CAPTCHA is solved in the modal and PNR status is returned
  const handlePnrSuccess = useCallback((data: PnrData) => {
    setPnrResult(data);
    setIsCaptchaOpen(false);
    setIsCollapsed(false); // Automatically expand down
    setErrorMessage(null);

    // Smooth scroll to results
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }, []);

  // Reset search for another PNR
  const handleResetSearch = useCallback(() => {
    setIsCollapsed(true);
    setTimeout(() => {
      setPnrResult(null);
      setActivePnr('');
      setErrorMessage(null);
      setIsCaptchaOpen(false);
      setIsCollapsed(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 250);
  }, []);

  return (
    <main className="flex-1 w-full px-3 py-4 sm:px-6 sm:py-8 lg:px-8 flex flex-col items-center justify-start min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-4xl space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="text-center sm:text-left space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100/80 text-orange-800 rounded-full text-xs font-bold uppercase tracking-wider mb-1 border border-orange-200/60">
            <Ticket className="w-3.5 h-3.5 text-orange-600" />
            <span>Passenger Name Record</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">
            PNR Status
          </h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Check your Indian Railways PNR status, current seat confirmation, coach position, and journey details.
          </p>
        </div>

        {/* Top PNR Search Card */}
        <PnrSearchCard
          onCheckStatus={handleCheckStatus}
          initialPnr={activePnr}
          errorMessage={errorMessage}
          hasResult={Boolean(pnrResult)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />

        {/* Controlled CAPTCHA Modal (Appears on top when user clicks Check PNR Status) */}
        {activePnr && (
          <PnrCaptchaModal
            open={isCaptchaOpen}
            pnr={activePnr}
            onClose={() => setIsCaptchaOpen(false)}
            onSuccess={handlePnrSuccess}
          />
        )}

        {/* Results Container with Smooth Collapse-Down Animation */}
        <div ref={resultsRef} className="w-full">
          <AnimatePresence mode="wait">
            {pnrResult && !isCollapsed ? (
              <motion.div
                key={`pnr-result-${pnrResult.pnr}`}
                initial={{ opacity: 0, height: 0, y: -24, scale: 0.98 }}
                animate={{ opacity: 1, height: 'auto', y: 0, scale: 1 }}
                exit={{ opacity: 0, height: 0, y: -24, scale: 0.98 }}
                transition={{
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1],
                  opacity: { duration: 0.35 },
                }}
                className="overflow-hidden"
              >
                <PnrResult data={pnrResult} onResetSearch={handleResetSearch} />
              </motion.div>
            ) : !pnrResult ? (
              /* Initial State Helpful Guidelines */
              <motion.div
                key="pnr-guidelines"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/80 rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-4 shadow-2xs"
              >
                <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-3">
                  <HelpCircle className="w-4 h-4 text-orange-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    About Indian Railways PNR Status
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Ticket className="w-3.5 h-3.5 text-orange-500" />
                      <span>What is a PNR?</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      Passenger Name Record (PNR) is a unique 10-digit number generated whenever a train ticket is booked on IRCTC.
                    </p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Real-Time Updates</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      Track CNF (Confirmed), RAC (Reservation Against Cancellation), and WL (Waitlisted) status changes in real-time.
                    </p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <FileText className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Chart Preparation</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      1st chart is prepared 10 hrs before departure (or by 8 PM prior evening for morning trains); final chart 30 mins before departure.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
};
