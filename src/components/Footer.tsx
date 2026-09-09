import React from 'react';
import { 
  Train, 
  ShieldCheck, 
  PhoneCall, 
  CalendarCheck, 
  Clock, 
  HelpCircle, 
  ExternalLink,
  Sparkles,
  Search,
  CheckCircle2
} from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-slate-900 text-slate-300 border-t border-slate-800/80 relative">
      {/* Top Value Banner */}
      <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500" />
      <div className="border-b border-slate-800/60 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                <Train className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">Live Rail Sync</h5>
                <p className="text-[11px] text-slate-400">Direct real-time Indian Railways seat data</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">Official IRCTC Format</h5>
                <p className="text-[11px] text-slate-400">Compliant quota & fare calculations</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">Zero Lag Caching</h5>
                <p className="text-[11px] text-slate-400">High speed query </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">Rail Helpline 139</h5>
                <p className="text-[11px] text-slate-400">24x7 Official Indian Railways Assistance</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Information */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Brand & About Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Train className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg text-white tracking-tight">Indian</span>
                  <span className="font-black text-lg text-orange-400 tracking-tight">Railways</span>
                </div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Live Train & Ticket Enquiry</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Fast, intuitive, and reliable Indian Railways ticket availability, live seat status, route timetables, and train search portal designed for seamless passenger travel planning.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Live IRCTC Integration
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                
                Smart Predictions
              </span>
            </div>
          </div>

          {/* Quick Rail Services */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-orange-400" />
              Rail Enquiries
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a 
                  href="#train-search-form" 
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-slate-400 hover:text-orange-400 transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1 h-1 rounded-full bg-orange-400"></span>
                  Live Train Search
                </a>
              </li>
              <li>
                <a 
                  href="https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-orange-400 transition-colors flex items-center justify-between group"
                >
                  <span>PNR Status Enquiry</span>
                  <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-orange-400 transition-colors" />
                </a>
              </li>
              <li>
                <a 
                  href="https://enquiry.indianrail.gov.in/mntes/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-orange-400 transition-colors flex items-center justify-between group"
                >
                  <span>Live Train Running Status</span>
                  <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-orange-400 transition-colors" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.irctc.co.in/nget/train-search" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-orange-400 transition-colors flex items-center justify-between group"
                >
                  <span>Book on IRCTC Official</span>
                  <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-orange-400 transition-colors" />
                </a>
              </li>
            </ul>
          </div>

          {/* Booking & Quotas Guide */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
              Travel Quotas & Timings
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="text-slate-400 flex items-center justify-between py-0.5 border-b border-slate-800/60">
                <span>Tatkal AC Booking</span>
                <span className="font-semibold text-amber-300">10:00 AM</span>
              </li>
              <li className="text-slate-400 flex items-center justify-between py-0.5 border-b border-slate-800/60">
                <span>Tatkal Non-AC (SL)</span>
                <span className="font-semibold text-amber-300">11:00 AM</span>
              </li>
              <li className="text-slate-400 flex items-center justify-between py-0.5 border-b border-slate-800/60">
                <span>General Quota (GN)</span>
                <span className="text-slate-300">60 Days in Advance</span>
              </li>
              <li className="text-slate-400 flex items-center justify-between py-0.5">
                <span>Ladies & Senior Citizen</span>
                <span className="text-slate-300">Reserved Lower Berths</span>
              </li>
            </ul>
          </div>

          {/* Helpline & Support */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              Emergency & Help
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block">Railway All-in-One Helpline:</span>
                <a 
                  href="tel:139" 
                  className="text-sm font-black text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1.5 mt-0.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Dial 139</span>
                </a>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                <p>Security & Medical Assistance</p>
                <p>PNR, Train Tracking & Catering</p>
              </div>
            </div>
          </div>

        </div>

        {/* Disclaimer & Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="text-center md:text-left">
            &copy; {currentYear} Indian Railways & IRCTC Enquiry Portal. All rights reserved. This portal is not affiliated with or endorsed by Indian Railways or IRCTC. For official bookings and enquiries, please visit the <a href="https://www.irctc.co.in/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition-colors">IRCTC website</a>.
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Server Online
            </span>
            <span className="text-slate-700">•</span>
            <span>IRCTC Compliant Interface</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
