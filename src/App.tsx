import { lazy, Suspense, useEffect } from "react";

import { bus } from "./game/events";
import { installKeyboard, keyboard } from "./game/input/keyboard";
import { useWardenWarning } from "./game/warden/warning";
import { lockLossPause } from "./game/input/mouseLook";
import { Scene } from "./game/Scene";
import { useRun } from "./game/state/run";
import { useRecords } from "./game/state/records";
import { useSettings } from "./game/state/settings";
import { Audio } from "./game/systems/Audio";
import { Hint } from "./ui/Hint";
import { Hud } from "./ui/Hud";
import { MainMenu } from "./ui/MainMenu";
import { Minimap } from "./ui/Minimap";
import { PauseMenu } from "./ui/PauseMenu";
import { Prompt } from "./ui/Prompt";
import { PuzzleOverlay } from "./ui/PuzzleOverlay";
import { RunSummary } from "./ui/RunSummary";
import { ItemLog, Satchel } from "./ui/Satchel";
import { Transitions } from "./ui/Transitions";

/**
 * Esc toggles pause while a run is on and no puzzle is up: a puzzle owns
 * Esc while it is open. The pad's Start button is read in the frame loop,
 * where the rest of the pad is read (see PadPause in the scene).
 */
function usePauseKeys() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Escape" || event.repeat) return;
      const run = useRun.getState();
      if (run.phase !== "playing" || run.inputLocks > 0) return;
      // The Esc that released the pointer already paused; do not undo it.
      if (run.paused && performance.now() - lockLossPause.at < 400) return;
      if (run.paused) run.resume();
      else run.pause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * 1 to 4 drink or read what is in that slot. The store refuses while a
 * puzzle or a menu is up, so there is no guard here.
 */
function useSatchelKeys() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const slot = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(event.code);
      if (slot < 0) return;
      useRun.getState().useItem(slot);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
  useSatchelKeys();
  useWardenWarning();

  useEffect(() => installKeyboard(), []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as Record<string, unknown>;
    w.__bus = bus;
    w.__keyboard = keyboard;
    w.__settings = useSettings;
    w.__records = useRecords;
    void import("./game/sentry/placement").then((m) => (w.__sentryFor = m.sentryFor));
    void import("./game/textures/registry").then((m) => (w.__anisotropy = m.currentAnisotropy));
    void import("./game/systems/audio").then((m) => {
      w.__stalking = m.sfx.isStalking;
      w.__sfx = m.sfx;
    });
    // Room drafts marked live in the editor register themselves when the
    // drafts module loads. The game at "/" never loads the editor, so load
    // just that module here - development only, dropped from production.
    void import("./editor/drafts");
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
      <Transitions />
      <Audio />
      <Hud />
      <Minimap />
      <Hint />
      <Prompt />
      <Satchel />
      <ItemLog />
      <PuzzleOverlay />
      {paused && phase === "playing" && <PauseMenu />}
      {(phase === "won" || phase === "lost") && <RunSummary />}
    </>
  );
}
