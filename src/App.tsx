import { lazy, Suspense, useEffect } from "react";

import { bus } from "./game/events";
import { installKeyboard, keyboard } from "./game/input/keyboard";
import { useDeedWatch } from "./game/deeds/watch";
import { useWardenWarning } from "./game/warden/warning";
import { lockLossPause } from "./game/input/mouseLook";
import { Scene } from "./game/Scene";
import { canControl, useRun } from "./game/state/run";
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
import { useMixerSettings } from "./game/systems/mixer";
import { Captions } from "./ui/Captions";
import { UI_SCALE_VAR } from "./ui/overlay";
import { DeedToast } from "./ui/Deed";
import { ItemLog, Satchel } from "./ui/Satchel";
import { TouchControls } from "./ui/TouchControls";
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
 * 1 to 4 drink, read or set down what is in that slot, and F is the lantern. The store refuses whenever the
 * player is not in control - a menu, a puzzle, a pause, or the black frame
 * between two rooms - so there is no guard here. It is `canControl` that
 * decides that, in one place; this hook does not get a vote, and nor do
 * the pad's slot buttons in Scene, which are read off the frame loop with
 * no guard of their own.
 */
/**
 * The player's overlay scale, on the document root.
 *
 * One style write rather than threading a number through every overlay:
 * every size in `ui/overlay.ts` is a clamp that multiplies by this
 * variable, so setting it here resizes the HUD, the prompts, the menus and
 * the summary at once and re-renders nothing.
 */
function useUiScale() {
  const uiScale = useSettings((s) => s.uiScale);
  useEffect(() => {
    document.documentElement.style.setProperty(UI_SCALE_VAR, String(uiScale));
  }, [uiScale]);
}

const SLOT_ACTIONS = ["slot1", "slot2", "slot3", "slot4"] as const;

function useSatchelKeys() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      // The lantern, beside the satchel keys because it is the same kind
      // of thing: a hand doing something, refused by the store whenever
      // the player is not in control. Which key that is belongs to the
      // player now (`input/bindings.ts`), so nothing here names one.
      const bindings = useSettings.getState().bindings;
      if (bindings.lantern.includes(event.code)) {
        if (canControl(useRun.getState())) useRun.getState().toggleLantern();
        return;
      }
      const slot = SLOT_ACTIONS.findIndex((action) => bindings[action].includes(event.code));
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
  useUiScale();
  // The mixer follows the settings wherever the player is, including the
  // title screen the volume slider lives on.
  useMixerSettings();
  useWardenWarning();
  // What earns a deed, in one place. Nothing else in the game knows deeds
  // exist, which is the only way a list of achievements stays a list of
  // sentences about the game rather than bookkeeping smeared across it.
  useDeedWatch();

  useEffect(() => installKeyboard(), []);


  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as Record<string, unknown>;
    w.__bus = bus;
    w.__keyboard = keyboard;
    w.__settings = useSettings;
    // What the mixer is actually set to, so a check on the volume slider
    // asks the audio rather than the setting that was supposed to reach it.
    void import("./game/systems/audio").then((m) => (w.__sfxVolume = m.sfx.volume));
    w.__records = useRecords;
    w.__settings = useSettings;
    void import("./game/state/deeds").then((m) => (w.__deeds = m.useDeeds));
    // The numbers themselves, so a check never keeps its own copy of one.
    // A check that hardcodes 1.05 for the Warden's reach is a second owner
    // of it, and passes for years after the constant moves.
    void import("./game/world").then((m) => (w.__world = m));
    // And the Sentry's arithmetic, so a check can ask what the module
    // predicts for the speed a body actually managed rather than for the
    // speed the constants assume - on a software rasteriser those are not
    // the same number.
    void import("./game/sentry/beam").then((m) => (w.__beam = m));
    // And the arena's, so the check that walks its circle can ask whether
    // the ground it walked is ground the arms actually sweep.
    void import("./game/arena/sweep").then((m) => (w.__sweep = m));
    // The room geometry's own constants, for the same reason as `__world`:
    // a check that keeps its own copy of a hazard's reach is a second owner
    // of it and goes on passing after the number moves.
    void import("./game/dungeon/layout").then((m) => (w.__layout = m));
    // Where the camera is pointing, written once a frame by the look
    // controls. Deliberately not store state - it changes every frame a
    // mouse moves - so a check has no other way to read it.
    void import("./game/input/look").then((m) => (w.__look = m.look));
    // What the on-screen stick is doing, for the check that plays by
    // touch: module data written by pointer handlers, and the frame loop
    // is the only other reader.
    void import("./game/input/touch").then((m) => (w.__touch = m.readTouch));
    // Where every carryable is and which one is in the player's hands.
    // Module data rather than store state, because it changes every frame
    // something is carried and nothing re-renders for it - so a check that
    // wants to know whether a candle actually landed on the plate has no
    // other way to ask.
    void import("./game/puzzles/Carryable").then((m) => (w.__carry = m.carry));
    void import("./game/sentry/placement").then((m) => (w.__sentryFor = m.sentryFor));
    // Which room a floor's Cutpurse nests in. Derived from the dungeon
    // rather than stored in it, so a check that wants to set up a theft
    // has no way to ask the store which room to expect.
    void import("./game/thief/nest").then((m) => (w.__nestRoom = m.nestRoom));
    // The bars: the edge key and the pathing round one. A check that kept
    // its own copy of "which doorway is this" would be a second owner of
    // the one fact the whole feature turns on.
    void import("./game/warden/bars").then((m) => (w.__bars = m));
    void import("./game/warden/roam").then((m) => (w.__roam = m));
    void import("./game/textures/registry").then((m) => (w.__anisotropy = m.currentAnisotropy));
    // Where each kind's own content stands, so a probe can walk up to a
    // lectern or a pressure plate without a copy of the geometry.
    void import("./game/rooms/anchors").then((m) => (w.__anchorsFor = m.reservedAnchorsFor));
    // Where a room's gem is, for the walker that plays a run to the end.
    // Without it a probe has to sweep the eight diagonal anchors hoping to
    // cross one, which is how the old gem check came to fail one run in
    // five: it was testing its own luck.
    void import("./game/rooms/kinds").then((m) => {
      w.__gemFor = m.gemFor;
      // And where the floor's key lies, for the check that walks up and
      // takes it. Worked out from the room and the seed, the same way the
      // room and the dressing each work it out.
      w.__keyFor = m.keyFor;
    });
    // The audio module, from the same instance the game plays through.
    //
    // A check that reaches for it with its own `import()` gets a different
    // copy: the dev server hands the running app an updated module after an
    // edit and a bare import the original, so `ambience.setTension` went to
    // a second, never-started bed and returned without doing anything,
    // silently, for a whole cycle's worth of measurements. A probe is the
    // only honest way for a check to talk to a module's state.
    void import("./game/systems/audio").then((m) => {
      w.__stalking = m.sfx.isStalking;
      w.__sfx = m.sfx;
      w.__ambience = m.ambience;
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
      {/* The stick, the look drag and the buttons, on anything held in
          the hands. Renders nothing on a desktop until it is touched. */}
      <TouchControls />
      <Captions />
      <DeedToast />
      <PuzzleOverlay />
      {paused && phase === "playing" && <PauseMenu />}
      {(phase === "won" || phase === "lost") && <RunSummary />}
    </>
  );
}
