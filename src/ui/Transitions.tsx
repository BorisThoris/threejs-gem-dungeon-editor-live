import { useEffect, useRef, useState } from "react";

import { bus } from "../game/events";

const MIN_DARK_MS = 220;
const HURT_MS = 520;

/**
 * Full-screen effects that make state changes feel like something.
 *
 * Walking through a door teleports the player into the next room the moment
 * it mounts. Without a cut that reads as a glitch, so the screen goes dark
 * as the door opens and comes back once the new room reports in, and stays
 * dark for a beat even when the room mounts instantly. Taking damage
 * flashes the edges red; lives are in the HUD corner and a hit had nothing
 * in the player's eye line. And the edges of the screen close in while the
 * Warden is near, which is the only warning a player gets when it is behind
 * them - the one thing a first-person camera cannot show.
 */
export function Transitions() {
  const [dark, setDark] = useState(false);
  const [hurt, setHurt] = useState(0);
  const [dread, setDread] = useState(0);
  const darkSince = useRef(0);
  const reveal = useRef<number | null>(null);

  useEffect(() => {
    const cancelReveal = () => {
      if (reveal.current !== null) window.clearTimeout(reveal.current);
      reveal.current = null;
    };
    const goDark = () => {
      cancelReveal();
      darkSince.current = performance.now();
      setDark(true);
    };
    const comeBack = () => {
      cancelReveal();
      const wait = Math.max(0, MIN_DARK_MS - (performance.now() - darkSince.current));
      reveal.current = window.setTimeout(() => setDark(false), wait);
    };
    const offs = [
      bus.on("doorOpened", goDark),
      bus.on("roomEntered", comeBack),
      bus.on("runStarted", () => {
        cancelReveal();
        setDark(false);
      }),
      bus.on("damaged", () => setHurt((n) => n + 1)),
      bus.on("wardenProximity", ({ level }) => setDread(level)),
      bus.on("runStarted", () => setDread(0)),
    ];
    return () => {
      cancelReveal();
      offs.forEach((off) => off());
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes gd-hurt { from { opacity: 0.7 } to { opacity: 0 } }
        @keyframes gd-dread { 0%, 100% { opacity: var(--gd-dread) } 50% { opacity: calc(var(--gd-dread) * 0.55) } }
      `}</style>
      {/* The Warden's closeness, as the room narrowing around the player. */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(4,2,10,0) 30%, rgba(4,2,10,0.96) 100%)",
          ["--gd-dread" as string]: String(dread * 0.3),
          opacity: dread * 0.3,
          animation: dread >= 2 ? "gd-dread 1.1s ease-in-out infinite" : undefined,
          transition: "opacity 500ms ease-out",
          pointerEvents: "none",
          zIndex: 930,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#000",
          opacity: dark ? 1 : 0,
          transition: dark ? "opacity 90ms ease-out" : "opacity 380ms ease-in",
          pointerEvents: "none",
          zIndex: 950,
        }}
      />
      {hurt > 0 && (
        <div
          key={hurt}
          style={{
            position: "fixed",
            inset: 0,
            background: "radial-gradient(ellipse at center, rgba(180,20,40,0) 45%, rgba(180,20,40,0.9) 100%)",
            animation: `gd-hurt ${HURT_MS}ms ease-out forwards`,
            pointerEvents: "none",
            zIndex: 940,
          }}
        />
      )}
    </>
  );
}
