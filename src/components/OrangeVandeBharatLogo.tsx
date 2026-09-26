import React from 'react';

interface OrangeVandeBharatLogoProps {
  className?: string;
}

export const OrangeVandeBharatLogo: React.FC<OrangeVandeBharatLogoProps> = ({
  className = 'h-7 sm:h-8 w-auto',
}) => {
  return (
    <svg
      viewBox="0 0 38 34"
      width="38"
      height="34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Orange Vande Bharat Engine Nose"
    >
      <defs>
        {/* Authentic Vande Bharat Saffron Gradient */}
        <linearGradient id="vbSaffron2W" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="35%" stopColor="#f97316" />
          <stop offset="85%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>

        {/* Roof Highlight Gradient */}
        <linearGradient id="vbRoof2W" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Dark Tinted Panoramic Windshield & Window Glass */}
        <linearGradient id="vbGlass2W" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>

        {/* Headlight Golden Glow */}
        <radialGradient id="vbHeadlightGlow2W" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>

        {/* Forward Headlight Beam Flare (Shining to the Left) */}
        <linearGradient id="vbBeam2W" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>

        {/* Soft Drop Shadow Filter */}
        <filter id="vbShadow2W" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Headlight Beam Shining Forward to the Left */}
      <polygon points="1,24 -12,18 -12,29 1,26" fill="url(#vbBeam2W)" opacity="0.45" />

      {/* Ground Track Shadow (Under the front 2 wheels) */}
      <ellipse cx="23" cy="32" rx="15" ry="1.8" fill="#000000" opacity="0.25" />

      {/* Front Engine Body Group */}
      <g filter="url(#vbShadow2W)">

        {/* BOGIE FRAME CONNECTOR */}
        <rect x="15" y="27" width="17" height="2" rx="0.5" fill="#334155" />

        {/* FRONT 2 WHEELS ONLY */}
        {/* Wheel 1 (Front Wheel) */}
        <circle cx="18" cy="29" r="3.5" fill="#0f172a" stroke="#475569" strokeWidth="1" />
        <circle cx="18" cy="29" r="1.5" fill="#cbd5e1" />

        {/* Wheel 2 (Second Wheel) */}
        <circle cx="29" cy="29" r="3.5" fill="#0f172a" stroke="#475569" strokeWidth="1" />
        <circle cx="29" cy="29" r="1.5" fill="#cbd5e1" />

        {/* CHARCOAL LOWER SKIRT & AERODYNAMIC COWCATCHER */}
        <path
          d="M3 27 C1.5 27 2 28.5 4 29 L38 29 L38 26 L12 26 C9 26 5 26.5 3 27 Z"
          fill="#1e293b"
        />

        {/* MAIN AERODYNAMIC SAFFRON/ORANGE LOCOMOTIVE BODY (Facing Left, ending cleanly after 2 wheels at x=38) */}
        <path
          d="M20 7 C14 7 6 12 2 21 C1 23 2 26 5 27 L38 27 L38 7 L20 7 Z"
          fill="url(#vbSaffron2W)"
        />

        {/* AERODYNAMIC ROOF CONTOUR & HIGHLIGHT */}
        <path
          d="M22 7 C16 7 11 9 7 12 L38 12 L38 7 Z"
          fill="url(#vbRoof2W)"
        />

        {/* ICONIC WHITE/SILVER AERODYNAMIC SPEED STRIPE ON NOSE */}
        <path
          d="M18 15 C11 16 6 20 3 24 L38 24 L38 22.5 L17 22.5 C12 22.5 8 20 5 16.5 Z"
          fill="#ffffff"
          opacity="0.95"
        />

        {/* PANORAMIC COCKPIT WINDSHIELD (Tinted Aerodynamic Black - Facing Left) */}
        <path
          d="M16 9 C11 10 7 14 4.5 19 L22 19 L22 9 Z"
          fill="url(#vbGlass2W)"
          stroke="#090d16"
          strokeWidth="0.8"
        />

        {/* Windshield Reflection Glare */}
        <path
          d="M14 11 C10 12 7.5 15 6 18 L10 18 L17 11 Z"
          fill="#93c5fd"
          opacity="0.5"
        />

        {/* Driver Cab Side Window */}
        <rect x="25" y="11" width="9" height="6.5" rx="1.5" fill="url(#vbGlass2W)" />
        <rect x="25.5" y="11.5" width="2" height="5.5" fill="#38bdf8" opacity="0.3" />

        {/* Black Aerodynamic Accent Band */}
        <rect x="23" y="17.8" width="15" height="1.2" fill="#0f172a" />

        {/* FRONT SHARP LED HEADLIGHT (At Nose Tip) */}
        <circle cx="2.5" cy="23.5" r="2.2" fill="#ffffff" />
        <circle cx="2.5" cy="23.5" r="4.5" fill="url(#vbHeadlightGlow2W)" />
        {/* Auxiliary Red Marker */}
        <circle cx="4.5" cy="25" r="0.9" fill="#ef4444" />

      </g>
    </svg>
  );
};
