import React from 'react';
import { motion } from 'motion/react';

export const VandeBharatHeaderTrain: React.FC = () => {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-10 flex items-center"
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 32px, black calc(100% - 32px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 32px, black calc(100% - 32px), transparent 100%)',
      }}
      aria-hidden="true"
    >
      {/* Subtle rail track line in header background */}
      <div className="absolute top-[52%] left-0 right-0 h-[1px] bg-slate-200/40 -z-10" />

      {/* Moving Full 5-Coach Vande Bharat Express Train */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 flex items-center filter drop-shadow-sm pointer-events-none"
        initial={{ left: 'calc(100% + 100px)' }}
        animate={{
          left: ['calc(100% + 100px)', '-850px'],
        }}
        transition={{
          duration: 13,
          ease: 'linear',
          repeat: Infinity,
          repeatDelay: 1.2,
        }}
      >
        {/* Headlight beam shining forward to the left */}
        <div className="absolute -left-14 top-1/2 -translate-y-1/2 w-16 h-7 bg-gradient-to-l from-amber-300/45 via-orange-300/15 to-transparent rounded-l-full blur-[2px] pointer-events-none" />

        {/* Realistic 5-Coach Orange Vande Bharat Express SVG (Facing Left) */}
        <svg
          viewBox="0 0 550 38"
          className="h-7 sm:h-8 w-auto"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Saffron / Tangerine Orange Gradient */}
            <linearGradient id="vbSaffronGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="40%" stopColor="#f97316" />
              <stop offset="85%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>

            {/* Dark Metallic Window Band */}
            <linearGradient id="vbWindowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Roof metallic silver */}
            <linearGradient id="vbRoofGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>

            {/* Headlamp Beam Core */}
            <radialGradient id="vbHeadlightGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* ================= COACH 1: FRONT DRIVING CABIN (DTC - AERO NOSE) ================= */}
          {/* Main Aerodynamic Engine Body */}
          <path
            d="M24 10 C16 10 7 15 2 24 C1 26 2 29 6 30 L115 30 L115 10 L24 10 Z"
            fill="url(#vbSaffronGrad)"
          />
          {/* Aerodynamic White/Silver Speed Stripe on Nose */}
          <path
            d="M22 18 C14 19 8 23 4 27 L115 27 L115 25 L20 25 C15 25 10 22 7 19 Z"
            fill="#ffffff"
            opacity="0.9"
          />
          {/* Roof Profile */}
          <path
            d="M26 10 C20 10 14 12 10 15 L115 15 L115 10 Z"
            fill="url(#vbRoofGrad)"
          />
          {/* Aerodynamic Cockpit Windshield (Tinted Curved Black) */}
          <path
            d="M19 12 C14 13 9 17 6 22 L26 22 L26 12 Z"
            fill="url(#vbWindowGrad)"
          />
          {/* Windshield Glass Reflection */}
          <path
            d="M17 14 C13 16 10 19 8 21 L13 21 L20 14 Z"
            fill="#93c5fd"
            opacity="0.5"
          />
          {/* Driver Side Window */}
          <rect x="29" y="14" width="9" height="7" rx="1.5" fill="url(#vbWindowGrad)" />
          {/* Automatic Plug Door */}
          <rect x="41" y="12" width="8" height="17" rx="1" fill="#ea580c" stroke="#c2410c" strokeWidth="0.5" />
          <rect x="43" y="14" width="4" height="6" rx="1" fill="url(#vbWindowGrad)" />
          {/* Passenger Windows */}
          <rect x="52" y="13" width="12" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="53" y="14" width="10" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="67" y="13" width="12" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="68" y="14" width="10" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="82" y="13" width="12" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="83" y="14" width="10" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="97" y="13" width="12" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="98" y="14" width="10" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          {/* Twin LED Projector Headlights */}
          <circle cx="4" cy="27" r="2.5" fill="#ffffff" />
          <circle cx="4" cy="27" r="4.5" fill="url(#vbHeadlightGlow)" />
          <line x1="2" y1="28" x2="8" y2="28" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
          {/* Bogeys */}
          <rect x="24" y="30" width="22" height="3" rx="1.5" fill="#0f172a" />
          <circle cx="28" cy="31.5" r="1.5" fill="#475569" />
          <circle cx="42" cy="31.5" r="1.5" fill="#475569" />
          <rect x="84" y="30" width="22" height="3" rx="1.5" fill="#0f172a" />
          <circle cx="88" cy="31.5" r="1.5" fill="#475569" />
          <circle cx="102" cy="31.5" r="1.5" fill="#475569" />

          {/* GANGWAY 1 */}
          <rect x="115" y="12" width="4" height="17" rx="0.5" fill="#1e293b" />
          <line x1="117" y1="13" x2="117" y2="28" stroke="#475569" strokeWidth="0.8" strokeDasharray="1 1" />

          {/* ================= COACH 2: EXECUTIVE CHAIR CAR (EC) ================= */}
          <rect x="119" y="10" width="100" height="20" rx="1" fill="url(#vbSaffronGrad)" />
          <rect x="119" y="10" width="100" height="4" fill="url(#vbRoofGrad)" />
          <rect x="119" y="25" width="100" height="2" fill="#ffffff" opacity="0.9" />
          <rect x="122" y="12" width="7" height="17" rx="1" fill="#ea580c" stroke="#c2410c" strokeWidth="0.5" />
          <rect x="123.5" y="14" width="4" height="6" rx="1" fill="url(#vbWindowGrad)" />
          {/* Panoramic Windows */}
          <rect x="133" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="134" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="147" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="148" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="161" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="162" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="175" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="176" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="189" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="190" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="208" y="12" width="7" height="17" rx="1" fill="#ea580c" stroke="#c2410c" strokeWidth="0.5" />
          <rect x="209.5" y="14" width="4" height="6" rx="1" fill="url(#vbWindowGrad)" />
          {/* Bogeys */}
          <rect x="128" y="30" width="20" height="3" rx="1.5" fill="#0f172a" />
          <circle cx="132" cy="31.5" r="1.5" fill="#475569" />
          <circle cx="144" cy="31.5" r="1.5" fill="#475569" />
          <rect x="190" y="30" width="20" height="3" rx="1.5" fill="#0f172a" />
          <circle cx="194" cy="31.5" r="1.5" fill="#475569" />
          <circle cx="206" cy="31.5" r="1.5" fill="#475569" />

          {/* GANGWAY 2 */}
          <rect x="219" y="12" width="4" height="17" rx="0.5" fill="#1e293b" />
          <line x1="221" y1="13" x2="221" y2="28" stroke="#475569" strokeWidth="0.8" strokeDasharray="1 1" />

          {/* ================= COACH 3: MOTOR COACH WITH ROOF PANTOGRAPH (MC) ================= */}
          <rect x="223" y="10" width="100" height="20" rx="1" fill="url(#vbSaffronGrad)" />
          <rect x="223" y="10" width="100" height="4" fill="url(#vbRoofGrad)" />
          <rect x="223" y="25" width="100" height="2" fill="#ffffff" opacity="0.9" />
          {/* High-Speed Single-Arm Pantograph on roof */}
          <path d="M260 10 L266 3 L274 3 L269 10" stroke="#c2410c" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="264" y1="3" x2="276" y2="3" stroke="#f8fafc" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="263" y1="6" x2="272" y2="6" stroke="#ea580c" strokeWidth="0.8" />
          {/* Doors & Windows */}
          <rect x="226" y="12" width="7" height="17" rx="1" fill="#ea580c" stroke="#c2410c" strokeWidth="0.5" />
          <rect x="227.5" y="14" width="4" height="6" rx="1" fill="url(#vbWindowGrad)" />
          <rect x="237" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="238" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="251" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="252" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="265" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="266" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="279" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="280" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="293" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="294" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="312" y="12" width="7" height="17" rx="1" fill="#ea580c" stroke="#c2410c" strokeWidth="0.5" />
          <rect x="313.5" y="14" width="4" height="6" rx="1" fill="url(#vbWindowGrad)" />
          {/* Bogeys */}
          <rect x="232" y="30" width="20" height="3" rx="1.5" fill="#0f172a" />
          <circle cx="236" cy="31.5" r="1.5" fill="#475569" />
          <circle cx="248" cy="31.5" r="1.5" fill="#475569" />
          <rect x="294" y="30" width="20" height="3" rx="1.5" fill="#0f172a" />
          <circle cx="298" cy="31.5" r="1.5" fill="#475569" />
          <circle cx="310" cy="31.5" r="1.5" fill="#475569" />

          {/* GANGWAY 3 */}
          <rect x="323" y="12" width="4" height="17" rx="0.5" fill="#1e293b" />
          <line x1="325" y1="13" x2="325" y2="28" stroke="#475569" strokeWidth="0.8" strokeDasharray="1 1" />

          {/* ================= COACH 4: CHAIR CAR (CC) ================= */}
          <rect x="327" y="10" width="100" height="20" rx="1" fill="url(#vbSaffronGrad)" />
          <rect x="327" y="10" width="100" height="4" fill="url(#vbRoofGrad)" />
          <rect x="327" y="25" width="100" height="2" fill="#ffffff" opacity="0.9" />
          <rect x="330" y="12" width="7" height="17" rx="1" fill="#ea580c" stroke="#c2410c" strokeWidth="0.5" />
          <rect x="331.5" y="14" width="4" height="6" rx="1" fill="url(#vbWindowGrad)" />
          <rect x="341" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="342" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="355" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="356" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="369" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="370" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="383" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="384" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="397" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="398" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="416" y="12" width="7" height="17" rx="1" fill="#ea580c" stroke="#c2410c" strokeWidth="0.5" />
          <rect x="417.5" y="14" width="4" height="6" rx="1" fill="url(#vbWindowGrad)" />
          {/* Bogeys */}
          <rect x="336" y="30" width="20" height="3" rx="1.5" fill="#0f172a" />
          <circle cx="340" cy="31.5" r="1.5" fill="#475569" />
          <circle cx="352" cy="31.5" r="1.5" fill="#475569" />
          <rect x="398" y="30" width="20" height="3" rx="1.5" fill="#0f172a" />
          <circle cx="402" cy="31.5" r="1.5" fill="#475569" />
          <circle cx="414" cy="31.5" r="1.5" fill="#475569" />

          {/* GANGWAY 4 */}
          <rect x="427" y="12" width="4" height="17" rx="0.5" fill="#1e293b" />
          <line x1="429" y1="13" x2="429" y2="28" stroke="#475569" strokeWidth="0.8" strokeDasharray="1 1" />

          {/* ================= COACH 5: REAR DRIVING CABIN (DTC - TAIL AERO NOSE) ================= */}
          <path
            d="M431 10 L522 10 C530 10 539 15 544 24 C545 26 544 29 540 30 L431 30 Z"
            fill="url(#vbSaffronGrad)"
          />
          <path
            d="M431 25 L524 25 C529 25 536 23 541 27 L431 27 Z"
            fill="#ffffff"
            opacity="0.9"
          />
          <path
            d="M431 10 L520 10 C526 10 532 12 536 15 L431 15 Z"
            fill="url(#vbRoofGrad)"
          />
          {/* Rear Windshield */}
          <path
            d="M527 12 L520 22 L540 22 C537 17 532 13 527 12 Z"
            fill="url(#vbWindowGrad)"
          />
          {/* Rear Red Tail-lamp Markers */}
          <circle cx="542" cy="27" r="2" fill="#ef4444" />
          <circle cx="542" cy="27" r="3.5" fill="#ef4444" opacity="0.3" />
          {/* Windows & Doors */}
          <rect x="435" y="12" width="7" height="17" rx="1" fill="#ea580c" stroke="#c2410c" strokeWidth="0.5" />
          <rect x="436.5" y="14" width="4" height="6" rx="1" fill="url(#vbWindowGrad)" />
          <rect x="447" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="448" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="461" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="462" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="475" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="476" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="489" y="13" width="11" height="8" rx="2" fill="url(#vbWindowGrad)" />
          <rect x="490" y="14" width="9" height="2" rx="1" fill="#38bdf8" opacity="0.4" />
          <rect x="507" y="14" width="9" height="7" rx="1.5" fill="url(#vbWindowGrad)" />
          {/* Bogeys */}
          <rect x="440" y="30" width="20" height="3" rx="1.5" fill="#0f172a" />
          <circle cx="444" cy="31.5" r="1.5" fill="#475569" />
          <circle cx="456" cy="31.5" r="1.5" fill="#475569" />
          <rect x="500" y="30" width="20" height="3" rx="1.5" fill="#0f172a" />
          <circle cx="504" cy="31.5" r="1.5" fill="#475569" />
          <circle cx="516" cy="31.5" r="1.5" fill="#475569" />

          {/* Speed Tail Streak */}
          <line x1="544" y1="20" x2="549" y2="20" stroke="#f97316" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
          <line x1="543" y1="24" x2="548" y2="24" stroke="#ea580c" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        </svg>
      </motion.div>
    </div>
  );
};

