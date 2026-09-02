import type { CSSProperties } from "react";

/**
 * Shared look for every DOM overlay: one font, one palette, one set of
 * button styles. The old tree had a 200-colour theme system for a game
 * with one look.
 */
export const FONT = "'Press Start 2P', 'Courier New', monospace";

export const colors = {
  ink: "#f2f4f8",
  dim: "#aab0bd",
  accent: "#7fe3ff",
  danger: "#f08196",
  gold: "#ffd479",
  panel: "rgba(10, 12, 18, 0.86)",
  line: "rgba(255,255,255,0.14)",
};

export const fullscreen: CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: FONT,
  color: colors.ink,
  zIndex: 1000,
};

export const panel: CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.line}`,
  borderRadius: 8,
  padding: "28px 32px",
  minWidth: 320,
  maxWidth: 520,
  textAlign: "center",
};

export const title: CSSProperties = {
  fontSize: 18,
  letterSpacing: "0.06em",
  margin: "0 0 18px",
};

export const body: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.8,
  color: colors.dim,
  margin: "0 0 22px",
};

export const button: CSSProperties = {
  display: "block",
  width: "100%",
  margin: "0 0 10px",
  padding: "12px 16px",
  fontFamily: FONT,
  fontSize: 11,
  letterSpacing: "0.05em",
  color: "#0a0c12",
  background: colors.accent,
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};

export const secondaryButton: CSSProperties = {
  ...button,
  color: colors.ink,
  background: "transparent",
  border: `1px solid ${colors.line}`,
};

export const chip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 26,
  height: 26,
  borderRadius: 4,
  fontSize: 12,
  color: "#0a0c12",
};
