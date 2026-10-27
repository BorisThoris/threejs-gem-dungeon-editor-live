import { useEffect, useRef, useState } from "react";
import { BOSS_HEALTH, BOSS_REWARD, bossBeat, expeditionPower } from "../game/progression";
import { runClock, useRun } from "../game/state/run";
import { body, button, colors, fullscreen, panel, secondaryButton, title } from "./overlay";
import { usePadMenu } from "./padMenu";
import { enterImmersive } from "../game/input/device";

export function ExpeditionChoice() {
  const cycle = useRun(s => s.newGamePlus);
  const ref = useRef<HTMLDivElement>(null);
  usePadMenu({ container: ref });
  return <div data-testid="expedition-choice" style={{ ...fullscreen, background: "rgba(5,6,8,.94)", zIndex: 1300 }}>
    <div ref={ref} style={panel}>
      <h2 style={title}>The last crossroads</h2>
      <p style={body}>Three floors behind you. Your equipment and remaining supplies are yours to carry forward.</p>
      <button style={button} data-testid="choose-boss" onClick={() => { enterImmersive(); useRun.getState().beginBoss(); }}>
        Challenge the Crown Warden
      </button>
      <p style={body}>A final duel for freedom and {BOSS_REWARD} gems. Orange circle: move out. Pink outer ring: move in. Strike between warnings. Defeat ends the run.</p>
      <button style={secondaryButton} data-testid="choose-ng" onClick={() => { enterImmersive(); useRun.getState().continueExpedition(); }}>
        Continue into New Game+ {cycle + 1}
      </button>
      <p style={body}>Fresh dungeons. Enemy health and incoming damage ×{expeditionPower(cycle + 1)}. Keep weapons, backpack, relics, identified items, gems, lives and oil. Floor keys and placed tools stay behind. No free healing.</p>
    </div>
  </div>;
}

export function BossStatus() {
  const active = useRun(s => s.bossActive);
  const health = useRun(s => s.bossHealth);
  const cycle = useRun(s => s.newGamePlus);
  const [, refresh] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => refresh(v => v + 1), 80);
    return () => window.clearInterval(timer);
  }, [active]);
  if (!active) return null;
  const s = useRun.getState(), beat = bossBeat(runClock(s) - s.bossStartedAt);
  return <div data-testid="boss-status" style={{ position: "fixed", left: "50%", bottom: 160, transform: "translateX(-50%)",
    width: "min(400px, 85vw)", padding: 12, background: colors.panel, color: colors.ink, textAlign: "center", pointerEvents: "none", zIndex: 950 }}>
    <div>CROWN WARDEN · {health}/{BOSS_HEALTH * expeditionPower(cycle)}</div>
    <progress aria-label="Crown Warden health" value={health} max={BOSS_HEALTH * expeditionPower(cycle)} style={{ width: "100%" }} />
    <div>{beat.warning ? beat.outer ? "OUTER RING — MOVE IN" : "INNER CIRCLE — MOVE OUT" : "RECOVERING — STRIKE"}</div>
  </div>;
}
