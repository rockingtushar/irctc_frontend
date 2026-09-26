import React from 'react';
import { motion } from 'motion/react';
import {
  Train,
  Ticket,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  ArrowRight,
  CircleDot,
  Flag,
  Users,
  Armchair,
  Gauge,
  MapPin,
  Sparkles,
  CreditCard,
  Tag,
  Info,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import { PnrData } from '../../types/pnr';

interface PnrTrackVisualizerCardProps {
  data: PnrData;
  onResetSearch?: () => void;
}

export const PnrTrackVisualizerCard: React.FC<PnrTrackVisualizerCardProps> = ({
  data,
  onResetSearch,
}) => {
  const pnrNumber = data.pnr;
  const statusStr = (data.status || 'Confirmed').trim();
  const statusLower = statusStr.toLowerCase();

  const isConfirmed =
    statusLower.includes('confirm') ||
    statusLower.includes('cnf') ||
    statusLower === 'confirmed';
  const isRac = statusLower.includes('rac');
  const isWaitlist = statusLower.includes('wl') || statusLower.includes('wait') || data.is_waitlisted;
  const isCancelled = statusLower.includes('can') || statusLower.includes('cancel');

  const journey = data.journey;
  const trainNumber = journey?.train_number || data.train_number || '';
  const trainName = journey?.train_name || data.train_name || 'Express Train';
  const journeyClass = journey?.journey_class || data.journey_class || '';

  const sourceStation = journey?.source_station || data.source_station || 'Origin';
  const destinationStation =
    journey?.destination_station || data.destination_station || 'Destination';
  const boardingPoint = journey?.boarding_point || data.boarding_point || sourceStation;
  const reservationUpto = journey?.reservation_upto || data.reservation_upto || destinationStation;

  const journeyDate = journey?.date || data.date_of_journey || data.booking_date;
  const arrivalDate = journey?.arrival_date;
  const distanceKm = journey?.distance_km;

  const passengers = data.passengers || [];
  const passengerCount = data.passenger_count || (passengers.length > 0 ? passengers.length : 1);
  const chartStatus = (data.chart_status || 'Chart Not Prepared').trim();
  const isChartPrepared = chartStatus.toLowerCase().includes('prepared') && !chartStatus.toLowerCase().includes('not');

  // Helper for fare formatting
  const formatFare = (amount?: number | null) => {
    if (amount === undefined || amount === null) return null;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Helper for passenger badge
  const getPassengerStatusBadge = (status?: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('CNF') || s.includes('CONFIRM')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-500/40">
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          <span>{status}</span>
        </span>
      );
    }
    if (s.includes('RAC')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-500/40">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{status}</span>
        </span>
      );
    }
    if (s.includes('WL') || s.includes('WAIT')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-500/40">
          <AlertTriangle className="w-3 h-3 text-indigo-400" />
          <span>{status}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
        <span>{status || '—'}</span>
      </span>
    );
  };

  // Status Theme styling matching LiveTrainTrackVisualizer
  const getStatusTheme = () => {
    if (isConfirmed) {
      return {
        bannerBg: 'bg-emerald-950/30 border-emerald-500/40',
        iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
        dotColor: 'bg-emerald-400',
        icon: <CheckCircle2 className="w-5 h-5" />,
        label: 'Confirmed',
      };
    }
    if (isRac) {
      return {
        bannerBg: 'bg-amber-950/30 border-amber-500/40',
        iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
        badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
        dotColor: 'bg-amber-400',
        icon: <Clock className="w-5 h-5" />,
        label: 'RAC (Reservation Against Cancellation)',
      };
    }
    if (isWaitlist) {
      return {
        bannerBg: 'bg-indigo-950/30 border-indigo-500/40',
        iconBg: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40',
        badgeBg: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',
        dotColor: 'bg-indigo-400',
        icon: <AlertTriangle className="w-5 h-5" />,
        label: 'Waitlisted',
      };
    }
    if (isCancelled) {
      return {
        bannerBg: 'bg-rose-950/30 border-rose-500/40',
        iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/40',
        badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
        dotColor: 'bg-rose-400',
        icon: <XCircle className="w-5 h-5" />,
        label: 'Cancelled',
      };
    }
    return {
      bannerBg: 'bg-slate-900/90 border-slate-800',
      iconBg: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      badgeBg: 'bg-slate-800 text-slate-300 border border-slate-700',
      dotColor: 'bg-orange-400',
      icon: <Ticket className="w-5 h-5" />,
      label: statusStr,
    };
  };

  const statusTheme = getStatusTheme();

  return (
    <div
      id="pnr-track-visualizer-card"
      className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl sm:rounded-3xl border border-slate-800/90 shadow-2xl p-4 sm:p-7 space-y-6 relative overflow-hidden"
    >
      {/* Subtle railway background sleeper matrix */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* ---------------------------------------------------- */}
      {/* 1. TOP HEADER: Train Identity, PNR & Charting State */}
      {/* ---------------------------------------------------- */}
      <div className="relative z-10 flex flex-col gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Train Identity & Route */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0 border border-amber-300/30">
              <Train className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {trainNumber && (
                  <span className="font-mono text-sm sm:text-base font-black text-orange-400 bg-orange-950/80 px-2.5 py-0.5 rounded-lg border border-orange-800/60">
                    {trainNumber}
                  </span>
                )}
                <h2 className="font-black text-lg sm:text-2xl text-white tracking-tight">
                  {trainName}
                </h2>
                {journeyClass && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-300 bg-orange-500/15 px-2.5 py-1 rounded-lg border border-orange-500/30">
                    <Armchair className="w-3.5 h-3.5 text-orange-400" />
                    <span>Class: {journeyClass}</span>
                  </span>
                )}
              </div>

              {/* Station Route Preview */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium flex-wrap">
                <span className="font-semibold text-slate-200">{sourceStation}</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-400 shrink-0 mx-0.5" />
                <span className="font-semibold text-slate-200">{destinationStation}</span>
                {data.quota && (
                  <span className="text-slate-500 font-mono text-[11px] ml-1">
                    • Quota: <span className="text-slate-300 font-bold">{data.quota}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: PNR Number Pill & Charting Status */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {/* PNR Number Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/90 text-xs font-bold text-slate-200 shadow-xs">
              <Ticket className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                PNR
              </span>
              <span className="font-mono text-sm sm:text-base font-black tracking-widest text-white">
                {pnrNumber}
              </span>
            </div>

            {/* Chart Status */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-xs ${
                isChartPrepared
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              }`}
            >
              {isChartPrepared ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{chartStatus}</span>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* 2. OVERALL BOOKING STATUS CALLOUT BANNER (Clean, No Duplicate)   */}
        {/* ---------------------------------------------------------------- */}
        <div
          id="pnr-overall-status-banner"
          className={`rounded-2xl p-4 sm:p-5 border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transition-all duration-200 ${statusTheme.bannerBg}`}
        >
          {/* Status Icon & Title */}
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${statusTheme.iconBg}`}
            >
              {statusTheme.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Overall Booking Status
                </span>
                <span className={`w-2 h-2 rounded-full ${statusTheme.dotColor} animate-pulse`} />
              </div>
              <div className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{statusStr}</span>
              </div>
            </div>
          </div>

          {/* Badges on Right Side: Single Status Pill, Passengers, Class */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${statusTheme.badgeBg}`}
            >
              {statusStr}
            </div>

            {data.is_waitlisted && (
              <div className="px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/20 text-indigo-300 text-xs font-bold">
                Waitlisted
              </div>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-300">
              <Users className="w-3.5 h-3.5 text-orange-400" />
              <span>
                {passengerCount} {passengerCount === 1 ? 'Passenger' : 'Passengers'}
              </span>
            </div>

            {journeyClass && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-bold text-orange-400">
                <Armchair className="w-3.5 h-3.5 text-orange-400" />
                <span>Class {journeyClass}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. VISUAL RAILWAY TRACK BETWEEN ORIGIN & DESTINATION */}
      {/* ---------------------------------------------------- */}
      <div
        id="pnr-railway-track-section"
        className="relative bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6"
      >
        <div className="flex items-center justify-between gap-2 sm:gap-6">
          {/* Source Station Node */}
          <div className="flex flex-col items-start min-w-[90px] sm:min-w-[140px]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
              <CircleDot className="w-3.5 h-3.5 text-emerald-400" />
              <span>Source</span>
            </div>
            <span className="font-mono text-xl sm:text-2xl font-black text-white block">
              {sourceStation}
            </span>
            {boardingPoint && boardingPoint !== sourceStation && (
              <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                Boarding: <strong className="text-slate-200">{boardingPoint}</strong>
              </span>
            )}
            {journeyDate && (
              <span className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-orange-400" />
                <span>{journeyDate}</span>
              </span>
            )}
          </div>

          {/* Railway Track Middle Spine with Train Engine */}
          <div className="flex-1 flex flex-col items-center justify-center px-2 sm:px-4">
            {/* Train badge moving over track */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-orange-400 mb-2">
              <Train className="w-3.5 h-3.5 text-orange-400" />
              <span>{trainNumber || 'INDIAN RAILWAYS'}</span>
            </div>

            {/* Horizontal Track with animated railway sleepers */}
            <div className="w-full relative h-4 flex items-center">
              {/* Outer track line */}
              <div className="w-full h-2 rounded-full bg-slate-800 relative overflow-hidden flex items-center border border-slate-700/60">
                {/* Gradient active progress */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-orange-500 to-rose-500 opacity-80" />

                {/* Railway ties / sleepers */}
                <motion.div
                  className="absolute inset-0 opacity-50 bg-[repeating-linear-gradient(90deg,#ffffff_0_2px,transparent_2px_8px)]"
                  animate={{ x: [0, 8] }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
              </div>

              {/* Animated Train Icon traversing the track */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 z-20"
                animate={{ left: ['20%', '80%', '20%'] }}
                transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
              >
                <div className="p-1.5 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white border-2 border-slate-900 shadow-md shadow-orange-500/40">
                  <Train className="w-3 h-3 text-white" />
                </div>
              </motion.div>
            </div>

            {/* Distance & Route Information */}
            <div className="flex items-center gap-2 mt-2">
              {distanceKm !== null && distanceKm !== undefined && (
                <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/80 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-orange-400" />
                  <span>{distanceKm} km</span>
                </span>
              )}
            </div>
          </div>

          {/* Destination Station Node */}
          <div className="flex flex-col items-end text-right min-w-[90px] sm:min-w-[140px]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1">
              <span>Destination</span>
              <Flag className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <span className="font-mono text-xl sm:text-2xl font-black text-white block">
              {destinationStation}
            </span>
            {reservationUpto && reservationUpto !== destinationStation && (
              <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                Upto: <strong className="text-slate-200">{reservationUpto}</strong>
              </span>
            )}
            {arrivalDate && (
              <span className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-rose-400" />
                <span>{arrivalDate}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. KEY JOURNEY DETAILS GRID (Theme Matched)         */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {/* Boarding Point */}
        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">
            <MapPin className="w-3 h-3 text-emerald-400" />
            <span>Boarding Point</span>
          </div>
          <span className="font-mono text-sm sm:text-base font-bold text-white block truncate">
            {boardingPoint}
          </span>
        </div>

        {/* Reservation Upto */}
        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">
            <Flag className="w-3 h-3 text-rose-400" />
            <span>Reservation Upto</span>
          </div>
          <span className="font-mono text-sm sm:text-base font-bold text-white block truncate">
            {reservationUpto}
          </span>
        </div>

        {/* Class */}
        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">
            <Armchair className="w-3 h-3 text-orange-400" />
            <span>Travel Class</span>
          </div>
          <span className="text-sm sm:text-base font-bold text-white block">
            {journeyClass || '—'}
          </span>
        </div>

        {/* Quota / Distance */}
        <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">
            <Gauge className="w-3 h-3 text-orange-400" />
            <span>Distance & Quota</span>
          </div>
          <span className="text-sm sm:text-base font-bold text-white block">
            {distanceKm ? `${distanceKm} km` : '—'}
            {data.quota ? ` (${data.quota})` : ''}
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 5. PASSENGER DETAILS (MERGED WITH VISUALIZER THEME) */}
      {/* ---------------------------------------------------- */}
      {passengers.length > 0 && (
        <div
          id="pnr-passengers-section"
          className="pt-2 border-t border-slate-800/80 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Passenger Details
                </h3>
                <span className="text-[11px] text-slate-400">
                  {passengers.length} {passengers.length === 1 ? 'passenger booked' : 'passengers booked'}
                </span>
              </div>
            </div>

            <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              Total: {passengers.length}
            </span>
          </div>

          <div className="space-y-3">
            {passengers.map((passenger, index) => {
              const passNum = passenger.passenger_number || index + 1;
              const booking = passenger.booking || {};
              const current = passenger.current || {};
              const curStatus = current.status || booking.status || statusStr;

              return (
                <div
                  key={passNum}
                  className="bg-slate-900/60 hover:bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 transition-all shadow-xs"
                >
                  {/* Passenger Row Top Header */}
                  <div className="flex items-center justify-between mb-3.5 border-b border-slate-800/70 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-orange-500/25 text-orange-400 border border-orange-500/40 flex items-center justify-center text-xs font-black">
                        #{passNum}
                      </div>
                      <span className="text-sm font-black text-white tracking-wide">
                        Passenger {passNum}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Current:
                      </span>
                      {getPassengerStatusBadge(curStatus)}
                    </div>
                  </div>

                  {/* Booking vs Current Status Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Booking Status Card */}
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Booking Status
                        </span>
                        {getPassengerStatusBadge(booking.status)}
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-900">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                            Coach
                          </span>
                          <span className="font-mono font-black text-slate-200 text-sm">
                            {booking.coach || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                            Berth
                          </span>
                          <span className="font-mono font-black text-slate-200 text-sm">
                            {booking.berth_number !== undefined && booking.berth_number !== null
                              ? booking.berth_number
                              : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                            Berth Type
                          </span>
                          <span className="font-mono font-bold text-slate-300 text-xs sm:text-sm">
                            {booking.berth_code || '—'}
                          </span>
                        </div>
                      </div>

                      {booking.details && (
                        <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-1">
                          <span className="text-slate-500">Details:</span>
                          <span className="font-mono font-medium text-slate-300">
                            {booking.details}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Current Status Card */}
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Current Status
                        </span>
                        {getPassengerStatusBadge(current.status || booking.status)}
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-900">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                            Coach
                          </span>
                          <span className="font-mono font-black text-slate-200 text-sm">
                            {current.coach || booking.coach || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                            Berth
                          </span>
                          <span className="font-mono font-black text-slate-200 text-sm">
                            {current.berth_number !== undefined && current.berth_number !== null
                              ? current.berth_number
                              : booking.berth_number !== undefined && booking.berth_number !== null
                              ? booking.berth_number
                              : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                            Berth Type
                          </span>
                          <span className="font-mono font-bold text-slate-300 text-xs sm:text-sm">
                            {current.berth_code || booking.berth_code || '—'}
                          </span>
                        </div>
                      </div>

                      {current.details && (
                        <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-1">
                          <span className="text-slate-500">Details:</span>
                          <span className="font-mono font-medium text-slate-300">
                            {current.details}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. BOOKING & FARE INFORMATION (MERGED THEME)         */}
      {/* ---------------------------------------------------- */}
      <div
        id="pnr-fare-section"
        className="pt-2 border-t border-slate-800/80 space-y-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Booking & Fare Information
            </h3>
            <span className="text-[11px] text-slate-400">
              Official transaction and quota details
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Booking Date */}
          {data.booking_date && (
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/90">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                Booking Date
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-slate-200 block">
                {data.booking_date}
              </span>
            </div>
          )}

          {/* Quota */}
          {data.quota && (
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/90">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                Quota
              </span>
              <span className="font-bold text-slate-200 text-xs sm:text-sm block">
                {data.quota}
              </span>
            </div>
          )}

          {/* Ticket Fare */}
          {data.ticket_fare !== undefined && data.ticket_fare !== null && (
            <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-bold mb-1">
                Ticket Fare
              </span>
              <span className="font-mono text-base sm:text-lg font-black text-emerald-300 block">
                {formatFare(data.ticket_fare)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 7. INFORMATION MESSAGES (IF PRESENT)                 */}
      {/* ---------------------------------------------------- */}
      {data.information_messages && data.information_messages.length > 0 && (
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs">
          <div className="flex items-center gap-2 text-orange-400 font-bold uppercase tracking-wider text-[11px]">
            <Info className="w-4 h-4" />
            <span>Important IRCTC Information</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
            {data.information_messages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 8. RESET / CHECK ANOTHER PNR ACTION BUTTON           */}
      {/* ---------------------------------------------------- */}
      {onResetSearch && (
        <div className="pt-2 flex justify-center border-t border-slate-800/80">
          <button
            type="button"
            onClick={onResetSearch}
            className="px-6 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
            <span>Check Another PNR</span>
          </button>
        </div>
      )}
    </div>
  );
};
