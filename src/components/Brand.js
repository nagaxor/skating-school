"use client";

import { useId } from "react";

// Brand primitives: logo mark, wordmark and the "rink lines" signature motif.
// Pure SVG, no network assets, safe under the strict CSP.

export function LogoMark({ size = 36, className = "" }) {
  // Unique gradient ids: several marks render per page (one may be hidden),
  // and duplicate ids make the visible copy lose its fill.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#161B2C" />
          <stop offset="1" stopColor="#0B0F1C" />
        </linearGradient>
        <linearGradient id={`ice${uid}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0A9FC4" />
          <stop offset="1" stopColor="#63D5F0" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="39" rx="11" fill={`url(#bg${uid})`} stroke="rgba(255,255,255,0.10)" />
      {/* Two glide arcs: the trace a skate blade leaves on the rink */}
      <path d="M9 27.5c5.5-.6 9.2-3.6 11.4-8.2 2.1-4.4 5.2-7 10.6-7.3" fill="none" stroke={`url(#ice${uid})`} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M11.5 32c4.6-.3 8.4-2 11-5" fill="none" stroke="#EDBE57" strokeWidth="2.2" strokeLinecap="round" opacity="0.95" />
      <circle cx="31.2" cy="12" r="1.9" fill="#ECFBFF" />
    </svg>
  );
}

export function Wordmark({ className = "", tone = "light", compact = false }) {
  const main = tone === "light" ? "text-white" : "text-ink-950 dark:text-white";
  return (
    <span className={`font-display font-bold tracking-tight leading-none ${main} ${className}`}>
      Online Skating{!compact && <span className="text-brand-400"> School</span>}
    </span>
  );
}

export function Logo({ size = 36, tone = "light", compact = false, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="flex-shrink-0" />
      <Wordmark tone={tone} compact={compact} className={size >= 36 ? "text-[17px]" : "text-[15px]"} />
    </span>
  );
}

// Concentric rink outlines with a light streak gliding around the outer lane.
export function RinkLines({ className = "", animated = true }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const lanes = [0, 1, 2, 3, 4, 5];
  return (
    <svg viewBox="0 0 1200 640" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`fade${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#63D5F0" stopOpacity="0.28" />
          <stop offset="1" stopColor="#63D5F0" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={`streak${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22BCE0" stopOpacity="0" />
          <stop offset="0.6" stopColor="#63D5F0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ECFBFF" />
        </linearGradient>
      </defs>
      {lanes.map((i) => {
        const inset = 40 + i * 46;
        return (
          <rect
            key={i}
            x={inset}
            y={inset * 0.62}
            width={1200 - inset * 2}
            height={640 - inset * 1.24}
            rx={(640 - inset * 1.24) / 2}
            fill="none"
            stroke={`url(#fade${uid})`}
            strokeWidth={i === 0 ? 1.4 : 1}
            strokeDasharray={i % 2 ? "2 10" : undefined}
          />
        );
      })}
      {animated && (
        <rect
          x="40" y="24.8" width="1120" height="590.4" rx="295.2"
          fill="none" stroke={`url(#streak${uid})`} strokeWidth="2.4" strokeLinecap="round"
          strokeDasharray="160 840" pathLength="1000"
          className="animate-glide"
        />
      )}
      <line x1="600" y1="25" x2="600" y2="615" stroke="#63D5F0" strokeOpacity="0.07" />
      <circle cx="600" cy="320" r="62" fill="none" stroke="#63D5F0" strokeOpacity="0.10" />
    </svg>
  );
}
