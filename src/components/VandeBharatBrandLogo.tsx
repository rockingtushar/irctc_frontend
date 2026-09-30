import React from 'react';

interface VandeBharatBrandLogoProps {
  className?: string;
}

export const VandeBharatBrandLogo: React.FC<VandeBharatBrandLogoProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-end select-none cursor-pointer group ${className}`}
      aria-label="Indian Railways - Vande Bharat Express Train Branding"
    >
      {/* 1. FRONT NOSE: Left-facing aerodynamic locomotive nose with front 2 wheels, touching 'I' */}
      <div className="shrink-0 -mr-0.5 self-end">
        <svg
          viewBox="0 0 34 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105"
        >
          <defs>
            {/* Saffron Gradient for Nose Body */}
            <linearGradient id="vbFrontSaffron" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="40%" stopColor="#f97316" />
              <stop offset="85%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>

            {/* Tinted Cockpit Windshield */}
            <linearGradient id="vbFrontGlass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>

            {/* Headlight Flare */}
            <radialGradient id="vbFrontHeadlight" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            {/* Headlight forward beam */}
            <linearGradient id="vbFrontBeam" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Forward Headlight Beam to the left */}
          <polygon points="1,22 -10,17 -10,27 1,24" fill="url(#vbFrontBeam)" opacity="0.4" />

          {/* Track line under nose */}
          <line x1="0" y1="30" x2="34" y2="30" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />

          {/* Ground shadow under 2 front wheels */}
          <ellipse cx="20" cy="30" rx="13" ry="1.5" fill="#000000" opacity="0.25" />

          {/* Bogie frame bar */}
          <rect x="11" y="25.5" width="18" height="2" rx="0.5" fill="#334155" />

          {/* FRONT 2 WHEELS */}
          {/* Wheel 1 */}
          <circle cx="15" cy="27.5" r="3.2" fill="#0f172a" stroke="#475569" strokeWidth="0.9" />
          <circle cx="15" cy="27.5" r="1.3" fill="#cbd5e1" />
          {/* Wheel 2 */}
          <circle cx="25" cy="27.5" r="3.2" fill="#0f172a" stroke="#475569" strokeWidth="0.9" />
          <circle cx="25" cy="27.5" r="1.3" fill="#cbd5e1" />

          {/* Charcoal Lower Skirt & Cowcatcher */}
          <path d="M2 24.5 C1 24.5 1.5 26 3 26.5 L34 26.5 L34 24 L10 24 C7 24 4 24.2 2 24.5 Z" fill="#1e293b" />

          {/* Saffron Aerodynamic Nose Body (Touches 'I' cleanly at x=34) */}
          <path
            d="M17 6 C11 6 5 11 1.5 19 C0.5 21 1.5 23.5 4 24.5 L34 24.5 L34 6 L17 6 Z"
            fill="url(#vbFrontSaffron)"
          />

          {/* White Roof Contour */}
          <path d="M19 6 C13 6 8 8 5 11 L34 11 L34 6 Z" fill="#ffffff" opacity="0.9" />

          {/* White Aerodynamic Speed Stripe on Nose */}
          <path d="M15 14 C9 15 5 18 2.5 22 L34 22 L34 20.5 L14 20.5 C10 20.5 6 18.5 4 15 Z" fill="#ffffff" />

          {/* Panoramic Cockpit Windshield (Tinted Black, facing Left) */}
          <path d="M13 8 C9 9 5.5 13 3.5 17.5 L19 17.5 L19 8 Z" fill="url(#vbFrontGlass)" stroke="#090d16" strokeWidth="0.7" />
          <path d="M11 10 C8 11 6 14 4.5 16.5 L8.5 16.5 L14 10 Z" fill="#93c5fd" opacity="0.5" />

          {/* Driver Cab Window */}
          <rect x="22" y="10" width="8" height="5.5" rx="1.2" fill="url(#vbFrontGlass)" />
          <line x1="24" y1="11" x2="26" y2="14.5" stroke="#ffffff" strokeWidth="0.7" opacity="0.35" />

          {/* Black Aero band under window */}
          <rect x="20" y="16" width="14" height="1" fill="#0f172a" />

          {/* Front LED Headlight */}
          <circle cx="2" cy="21.5" r="2" fill="#ffffff" />
          <circle cx="2" cy="21.5" r="4" fill="url(#vbFrontHeadlight)" />
          <circle cx="3.8" cy="23" r="0.8" fill="#ef4444" />
        </svg>
      </div>

      {/* 2. CENTER BODY: "Indian Railways" Text cleanly ABOVE wheels with zero overlap */}
      <div className="flex flex-col items-center justify-end self-end">
        {/* "Indian Railways" Text - Clean, crisp, comfortably sitting ABOVE the wheels */}
        <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 block leading-tight px-0.5 pb-0.5 whitespace-nowrap">
          Indian Railways
        </span>

        {/* Wheels Running Cleanly Underneath the Text */}
        <div className="w-full flex items-center">
          <svg
            viewBox="0 0 130 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-2 sm:h-2.5"
            preserveAspectRatio="none"
          >
            {/* Continuous Track Rail Line */}
            <line x1="0" y1="6.8" x2="130" y2="6.8" stroke="#cbd5e1" strokeWidth="0.9" />

            {/* Bogie 1 (Under "Ind") */}
            <rect x="9" y="1" width="16" height="1.5" rx="0.4" fill="#334155" />
            <circle cx="13" cy="4.2" r="2.5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
            <circle cx="13" cy="4.2" r="1" fill="#cbd5e1" />
            <circle cx="21" cy="4.2" r="2.5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
            <circle cx="21" cy="4.2" r="1" fill="#cbd5e1" />

            {/* Bogie 2 (Under "ian") */}
            <rect x="41" y="1" width="16" height="1.5" rx="0.4" fill="#334155" />
            <circle cx="45" cy="4.2" r="2.5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
            <circle cx="45" cy="4.2" r="1" fill="#cbd5e1" />
            <circle cx="53" cy="4.2" r="2.5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
            <circle cx="53" cy="4.2" r="1" fill="#cbd5e1" />

            {/* Bogie 3 (Under "Rail") */}
            <rect x="73" y="1" width="16" height="1.5" rx="0.4" fill="#334155" />
            <circle cx="77" cy="4.2" r="2.5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
            <circle cx="77" cy="4.2" r="1" fill="#cbd5e1" />
            <circle cx="85" cy="4.2" r="2.5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
            <circle cx="85" cy="4.2" r="1" fill="#cbd5e1" />

            {/* Bogie 4 (Under "ways") */}
            <rect x="105" y="1" width="16" height="1.5" rx="0.4" fill="#334155" />
            <circle cx="109" cy="4.2" r="2.5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
            <circle cx="109" cy="4.2" r="1" fill="#cbd5e1" />
            <circle cx="117" cy="4.2" r="2.5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
            <circle cx="117" cy="4.2" r="1" fill="#cbd5e1" />
          </svg>
        </div>
      </div>

      {/* 3. REAR TOE: Small, sleek aerodynamic Vande Bharat tail car (No wheels), snugly attached to 's' */}
      <div className="shrink-0 -ml-0.5 self-end">
        <svg
          viewBox="0 0 16 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105"
        >
          <defs>
            {/* Saffron Gradient for Small Tail */}
            <linearGradient id="vbSmallTailSaffron" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="40%" stopColor="#f97316" />
              <stop offset="85%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>

            {/* Tinted Rear Glass */}
            <linearGradient id="vbSmallTailGlass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>

            {/* Glowing Red Tail Marker Light */}
            <radialGradient id="vbSmallTailRedGlow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Track line continuing under tail */}
          <line x1="0" y1="30" x2="16" y2="30" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />

          {/* Charcoal Lower Skirt & Diffuser (No wheels) */}
          <path d="M0 24.5 L9 24.5 C12 24.5 14 25.2 15 26.5 L0 26.5 Z" fill="#1e293b" />

          {/* Saffron Aerodynamic Small Tail Body (Tightly attached to 's' at x=0) */}
          <path
            d="M0 8 L6 8 C10 8 13.5 13 15 19 C15.5 21 14.5 23.5 12.5 24.5 L0 24.5 Z"
            fill="url(#vbSmallTailSaffron)"
          />

          {/* White Roof Contour */}
          <path d="M0 8 L5 8 C8.5 8 11.5 10 13 13 L0 13 Z" fill="#ffffff" opacity="0.9" />

          {/* White Speed Stripe on Tail */}
          <path d="M0 20 L7 20 C10 20 12 18 13.5 15 C14.2 16.5 13.5 19 12 21 L0 21 Z" fill="#ffffff" />

          {/* Rear Tinted Window (Small aerodynamic visor) */}
          <path d="M0 10 L4 10 C6.5 10 8.5 13 9.5 16 L0 16 Z" fill="url(#vbSmallTailGlass)" stroke="#090d16" strokeWidth="0.6" />
          <path d="M0 11.5 L3 11.5 C4.5 11.5 6 13.5 7 15.5 L0 15.5 Z" fill="#93c5fd" opacity="0.4" />

          {/* Black Aero band under window */}
          <rect x="0" y="16.5" width="8" height="0.8" fill="#0f172a" />

          {/* GLOWING RED TAIL MARKER LIGHT */}
          <circle cx="14" cy="21.5" r="1.5" fill="#ffffff" />
          <circle cx="14" cy="21.5" r="3.2" fill="url(#vbSmallTailRedGlow)" />
          <circle cx="13" cy="22.5" r="0.7" fill="#ef4444" />
        </svg>
      </div>
    </div>
  );
};
