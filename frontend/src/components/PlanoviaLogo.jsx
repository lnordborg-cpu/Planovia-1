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

// Icon-only official Planovia logo (tree + heart).
// Uses the uploaded PNG asset – never redrawn, never distorted.
export const PlanoviaMark = ({ size = 32, className = "", withBackground = false }) => (
  <div
    className={className}
    style={{
      width: size,
      height: size,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: withBackground ? Math.round(size * 0.22) : 0,
      backgroundColor: withBackground ? "#FFFEFB" : "transparent",
      flexShrink: 0,
    }}
    aria-hidden="true"
  >
    <img
      src="/planovia-logo.png"
      alt=""
      width={size}
      height={size}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
      }}
    />
  </div>
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
