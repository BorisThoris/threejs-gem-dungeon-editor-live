import { lazy, Suspense, useEffect } from "react";

import { bus } from "./game/events";
import { installKeyboard, keyboard } from "./game/input/keyboard";
import { readGamepad } from "./game/input/gamepad";
import { Scene } from "./game/Scene";
import { useRun } from "./game/state/run";
import { Audio } from "./game/systems/Audio";
import { Hint } from "./ui/Hint";
import { Hud } from "./ui/Hud";
import { MainMenu } from "./ui/MainMenu";
import { Minimap } from "./ui/Minimap";
import { PauseMenu } from "./ui/PauseMenu";
import { Prompt } from "./ui/Prompt";
import { PuzzleOverlay } from "./ui/PuzzleOverlay";
import { RunSummary } from "./ui/RunSummary";

/**
 * Esc / Start toggles pause while a run is on. Polled on a short interval
 * rather than in the render loop: the pad's rising edge is memoised per
 * frame, and the pause menu has no frame loop of its own to read it from.
 */
function usePauseKeys() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Escape" || event.repeat) return;
      const run = useRun.getState();
      if (run.phase !== "playing") return;
      if (run.paused) run.resume();
      else run.pause();
    };
    const poll = window.setInterval(() => {
      if (readGamepad().pausePressed) {
        const run = useRun.getState();
        if (run.phase !== "playing") return;
        if (run.paused) run.resume();
        else run.pause();
      }
    }, 50);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearInterval(poll);
    };
  }, []);
}

/**
 * The authoring tools, in development only. `import.meta.env.DEV` is
 * statically false in a production build, so the dynamic import below is
 * unreachable there and the whole editor tree is dropped from the bundle.
 */
const Editor = import.meta.env.DEV ? lazy(() => import("./editor/Editor")) : null;
const wantsEditor = () =>
  import.meta.env.DEV && new URLSearchParams(window.location.search).has("editor");

export default function App() {
  const phase = useRun((s) => s.phase);
  const paused = useRun((s) => s.paused);
  usePauseKeys();

  useEffect(() => installKeyboard(), []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as Record<string, unknown>;
    w.__bus = bus;
    w.__keyboard = keyboard;
  }, []);

  if (Editor && wantsEditor()) {
    return (
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    );
  }

  if (phase === "menu") return <MainMenu />;

  return (
    <>
      <Scene />
      <Audio />
      <Hud />
      <Minimap />
      <Hint />
      <Prompt />
      <PuzzleOverlay />
      {paused && phase === "playing" && <PauseMenu />}
      {(phase === "won" || phase === "lost") && <RunSummary />}
    </>
  );
}
