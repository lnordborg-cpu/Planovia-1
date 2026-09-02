import React from "react";

/**
 * Planovia knowledge-tree logo.
 * Stylised, Scandinavian: rounded leaf canopy in muted sage/olive/beige/cream/rose,
 * dusty-rose heart centered in the canopy, deep sage trunk.
 */

// Brand palette
const TRUNK = "#47594E";
const HEART = "#D89A9A";
const LEAF_SAGE = "#8FA69A";
const LEAF_OLIVE = "#A5A867";
const LEAF_BEIGE = "#D9C7A6";
const LEAF_CREAM = "#EFE3D2";
const LEAF_ROSE = "#E7C8C8";
const WORDMARK_COLOR = "#3B4A44"; // deep muted forest
const TAGLINE_COLOR = "#5E6B65";
const CORE_SAMLA = "#718A7F";
const CORE_PLANERA = "#B98B8B";
const CORE_INSPIRERA = "#B49E6A";

// Icon-only SVG (tree + heart). Uses viewBox 0 0 64 64.
export const PlanoviaMark = ({ size = 32, className = "", withBackground = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {withBackground && (
      <rect x="0" y="0" width="64" height="64" rx="14" fill="#FFFEFB" />
    )}
    {/* Trunk */}
    <path
      d="M32 34 C 32 44, 30 50, 26 56 L 38 56 C 34 50, 32 44, 32 34 Z"
      fill={TRUNK}
    />
    {/* Ground line */}
    <path d="M22 56 L 42 56" stroke={TRUNK} strokeWidth="1.5" strokeLinecap="round" />

    {/* Canopy leaves – overlapping soft ellipses */}
    {/* Bottom ring */}
    <circle cx="20" cy="30" r="7.5" fill={LEAF_SAGE} />
    <circle cx="44" cy="30" r="7.5" fill={LEAF_OLIVE} />
    <circle cx="26" cy="34" r="6.5" fill={LEAF_BEIGE} />
    <circle cx="38" cy="34" r="6.5" fill={LEAF_CREAM} />
    {/* Middle ring */}
    <circle cx="16" cy="22" r="7" fill={LEAF_OLIVE} />
    <circle cx="48" cy="22" r="7" fill={LEAF_SAGE} />
    <circle cx="24" cy="20" r="7" fill={LEAF_CREAM} />
    <circle cx="40" cy="20" r="7" fill={LEAF_BEIGE} />
    {/* Top */}
    <circle cx="32" cy="14" r="7" fill={LEAF_ROSE} />
    <circle cx="22" cy="14" r="6" fill={LEAF_SAGE} />
    <circle cx="42" cy="14" r="6" fill={LEAF_OLIVE} />

    {/* Heart nestled in centre of canopy */}
    <path
      d="M32 32.5
         C 32 30.5, 30 28.5, 27.8 28.5
         C 25.6 28.5, 24 30.2, 24 32.3
         C 24 35.5, 27.5 37.8, 32 40.5
         C 36.5 37.8, 40 35.5, 40 32.3
         C 40 30.2, 38.4 28.5, 36.2 28.5
         C 34 28.5, 32 30.5, 32 32.5 Z"
      fill={HEART}
    />
  </svg>
);

// Compact lockup: icon + wordmark (used in sidebar / navigation)
export const PlanoviaCompact = ({ iconSize = 30, className = "" }) => (
  <div className={`flex items-center gap-2.5 ${className}`}>
    <PlanoviaMark size={iconSize} />
    <span
      className="font-display leading-none tracking-tight font-bold"
      style={{ color: WORDMARK_COLOR, fontSize: Math.round(iconSize * 0.78) }}
    >
      Planovia
    </span>
  </div>
);

// Standard lockup: icon + wordmark + tagline (for wider headers, settings/about)
export const PlanoviaStandard = ({ iconSize = 40, className = "" }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <PlanoviaMark size={iconSize} />
    <div className="flex flex-col leading-tight">
      <span
        className="font-display font-bold tracking-tight"
        style={{ color: WORDMARK_COLOR, fontSize: Math.round(iconSize * 0.78) }}
      >
        Planovia
      </span>
      <span className="text-xs tracking-wide" style={{ color: TAGLINE_COLOR }}>
        Din digitala lärarplanerare
      </span>
    </div>
  </div>
);

// Full brand lockup: icon + wordmark + tagline + core words (login/welcome only)
export const PlanoviaFull = ({ iconSize = 80, className = "" }) => (
  <div className={`flex flex-col items-center text-center gap-4 ${className}`}>
    <PlanoviaMark size={iconSize} />
    <div>
      <div
        className="font-display font-bold tracking-tight"
        style={{ color: WORDMARK_COLOR, fontSize: Math.round(iconSize * 0.7), lineHeight: 1 }}
      >
        Planovia
      </div>
      <div className="mt-2 text-sm tracking-wide" style={{ color: TAGLINE_COLOR }}>
        Din digitala lärarplanerare
      </div>
    </div>
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] pt-2">
      <span style={{ color: CORE_SAMLA }}>Samla</span>
      <span style={{ color: TAGLINE_COLOR }}>·</span>
      <span style={{ color: CORE_PLANERA }}>Planera</span>
      <span style={{ color: TAGLINE_COLOR }}>·</span>
      <span style={{ color: CORE_INSPIRERA }}>Inspirera</span>
    </div>
  </div>
);

export default PlanoviaMark;
