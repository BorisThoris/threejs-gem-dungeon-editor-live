import type { CSSProperties } from "react";

import { colors, FONT, button as gameButton, secondaryButton as gameSecondary } from "../ui/overlay";

/** The editor borrows the game's look, at working-tool density. */

export const shell: CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "grid",
  gridTemplateRows: "48px 1fr",
  background: "#0a0c12",
  color: colors.ink,
  fontFamily: FONT,
  fontSize: 11,
};

export const topbar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 16px",
  borderBottom: `1px solid ${colors.line}`,
};

export const tab = (active: boolean): CSSProperties => ({
  padding: "8px 14px",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 10,
  letterSpacing: "0.05em",
  color: active ? "#0a0c12" : colors.dim,
  background: active ? colors.accent : "transparent",
  border: "none",
  fontFamily: FONT,
});

export const panel: CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.line}`,
  borderRadius: 6,
  padding: 14,
  minHeight: 0,
};

export const label: CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.08em",
  color: colors.dim,
  margin: "0 0 6px",
};

export const small: CSSProperties = {
  fontSize: 9,
  lineHeight: 1.7,
  color: colors.dim,
};

export const field: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  marginBottom: 8,
  fontFamily: FONT,
  fontSize: 10,
  color: colors.ink,
  background: "rgba(255,255,255,0.05)",
  border: `1px solid ${colors.line}`,
  borderRadius: 4,
};

export const button: CSSProperties = { ...gameButton, fontSize: 10, padding: "9px 12px" };
export const secondaryButton: CSSProperties = { ...gameSecondary, fontSize: 10, padding: "9px 12px" };
