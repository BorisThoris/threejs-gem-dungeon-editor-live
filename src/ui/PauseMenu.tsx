import { useEffect, useRef, useState } from "react";

import {
  ACTIONS,
  ACTION_LABEL,
  bindable,
  keysLabel,
  unbound,
  type Action,
} from "../game/input/bindings";
import { device } from "../game/input/device";
import { useRun } from "../game/state/run";
import type { TouchControls } from "../game/state/settings";
import { useSettings } from "../game/state/settings";
import { body, button, colors, fullscreen, panel, secondaryButton, text, title } from "./overlay";
import { usePadMenu } from "./padMenu";

/** Esc pauses; the run is untouched underneath and resumes where it was. */
export function PauseMenu() {
  const resume = useRun((s) => s.resume);
  const quitToMenu = useRun((s) => s.quitToMenu);
  // B resumes, which is what backing out of a pause menu means.
  const panelRef = useRef<HTMLDivElement>(null);
  usePadMenu({ container: panelRef, onBack: resume });
  return (
    <div style={{ ...fullscreen, background: "rgba(5, 6, 8, 0.72)" }}>
      <div style={panel} ref={panelRef}>
        <h2 style={title}>PAUSED</h2>
        <p style={body}>The dungeon waits.</p>
        <button style={button} data-testid="pause-resume" onClick={resume}>
          Resume
        </button>
        <Options />
        <button style={secondaryButton} data-testid="pause-quit" onClick={quitToMenu}>
          Quit to menu
        </button>
      </div>
    </div>
  );
}

/**
 * The two settings worth having.
 *
 * Head bob is the one that matters: it makes some people ill, and a game
 * that forces it is a game they cannot play. It lives here rather than
 * behind a menu nobody opens, because the moment you want it off is the
 * moment you have just noticed it.
 */
/**
 * Everything a player may change.
 *
 * This was two toggles, and most of what is here is not a preference: it
 * is the list a Steam release gets judged on, and several of these are the
 * difference between a game somebody can play and one they cannot. Head
 * bob and screen shake make people ill. A game whose main threat is a
 * sound needs a way to see the sound. The alarm and the item charges were
 * said in hue alone. Sprint on a held key is a real barrier over a chase
 * that lasts a minute. And a seven-inch screen wants bigger text than a
 * monitor does.
 *
 * Grouped rather than listed, because thirteen controls in a column is a
 * wall. Every one of them is a button or a pair of buttons - no native
 * range inputs - so that the whole screen answers a gamepad, which is
 * what the Deck needs and what `usePadMenu` already walks.
 */
export function Options({ showBindings = true }: { showBindings?: boolean }) {
  const s = useSettings();
  return (
    <div style={{ margin: "4px 0 14px", textAlign: "left" }}>
      <Group label="Comfort" />
      <Toggle label="Head bob" on={s.cameraBob} onChange={s.setCameraBob} testId="opt-bob" />
      <Toggle label="Screen shake" on={s.shake} onChange={s.setShake} testId="opt-shake" />
      <Toggle
        label="Sprint"
        on={s.toggleSprint}
        onChange={s.setToggleSprint}
        testId="opt-sprint"
        onWord="press"
        offWord="hold"
      />

      <Group label="Look" />
      <Slider
        label="Mouse"
        value={s.sensitivity}
        onChange={s.setSensitivity}
        min={0.25}
        max={3}
        testId="opt-sensitivity"
      />
      <Slider
        label="Right stick"
        value={s.padLook}
        onChange={s.setPadLook}
        min={0.25}
        max={3}
        testId="opt-padlook"
      />
      <Toggle label="Invert look" on={s.invertY} onChange={s.setInvertY} testId="opt-invert" />

      <Group label="Sound" />
      <Toggle label="Sound" on={s.sound} onChange={s.setSound} testId="opt-sound" />
      <Slider
        label="Volume"
        value={s.volume}
        onChange={s.setVolume}
        min={0}
        max={1}
        testId="opt-volume"
      />
      <Toggle label="Captions" on={s.captions} onChange={s.setCaptions} testId="opt-captions" />

      <Group label="Reading" />
      <Toggle
        label="High contrast marks"
        on={s.highContrast}
        onChange={s.setHighContrast}
        testId="opt-contrast"
      />
      <Slider
        label="Overlay size"
        value={s.uiScale}
        onChange={s.setUiScale}
        min={0.8}
        max={1.6}
        testId="opt-uiscale"
      />

      {/* Only where a screen can be touched at all. On a desktop with no
          touchscreen these are three rows about a thing that cannot
          happen, and the gamepad walk through this menu is three stops
          longer for it. */}
      {touchable() && (
        <>
          <Group label="Touch" />
          <Cycle
            label="On-screen controls"
            value={s.touchControls}
            options={TOUCH_MODES}
            onChange={s.setTouchControls}
            testId="opt-touch"
          />
          <Slider
            label="Touch look"
            value={s.touchLook}
            onChange={s.setTouchLook}
            min={0.25}
            max={3}
            testId="opt-touchlook"
          />
          <Toggle
            label="Walking thumb"
            on={s.stickSide === "right"}
            onChange={(on) => s.setStickSide(on ? "right" : "left")}
            testId="opt-stick"
            onWord="right"
            offWord="left"
          />
        </>
      )}

      {/* Not on a phone: twelve rows of keys it does not have, on the
          screen least able to spare the room. A tablet may well have a
          keyboard clipped to it, and keeps them. */}
      {showBindings && device !== "phone" && <Bindings />}
    </div>
  );
}

const TOUCH_MODES: readonly TouchControls[] = ["auto", "on", "off"];

/** Whether this screen can be touched, which is when the touch rows are worth showing. */
const touchable = (): boolean =>
  typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0;

/**
 * One of a few words, stepped through by pressing. The shape of the
 * toggle for a setting with three answers rather than two, so it is still
 * a button and the pad still walks it.
 */
function Cycle<T extends string>({
  label,
  value,
  options,
  onChange,
  testId,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  testId: string;
}) {
  const next = options[(options.indexOf(value) + 1) % options.length];
  return (
    <button
      style={{
        ...secondaryButton,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: text.small,
      }}
      data-testid={testId}
      onClick={() => onChange(next)}
    >
      <span>{label}</span>
      <span data-value={value} style={{ color: colors.accent }}>
        {value}
      </span>
    </button>
  );
}

function Group({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: text.small,
        color: colors.dim,
        letterSpacing: "0.1em",
        margin: "12px 0 4px",
      }}
    >
      {label.toUpperCase()}
    </div>
  );
}

/**
 * A number, changed in steps by two buttons.
 *
 * Not an `<input type="range">`, and that is the whole reason this exists:
 * a native slider is a drag, a gamepad cannot drag, and the Deck is a
 * gamepad. Two buttons and a readout is the shape every console options
 * screen uses, and `usePadMenu` already walks buttons.
 */
function Slider({
  label,
  value,
  onChange,
  min,
  max,
  testId,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  testId: string;
}) {
  const step = (max - min) / 10;
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v * 100) / 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "2px 0" }}>
      <span style={{ flex: 1, fontSize: text.small, color: colors.ink }}>{label}</span>
      <button
        style={{ ...secondaryButton, width: 34, padding: "4px 0", margin: 0, fontSize: text.small }}
        data-testid={`${testId}-down`}
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </button>
      <span
        data-testid={testId}
        data-value={String(value)}
        style={{ width: 46, textAlign: "center", fontSize: text.small, color: colors.accent }}
      >
        {Math.round(((value - min) / (max - min)) * 100)}%
      </span>
      <button
        style={{ ...secondaryButton, width: 34, padding: "4px 0", margin: 0, fontSize: text.small }}
        data-testid={`${testId}-up`}
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </button>
    </div>
  );
}

/**
 * The keys, and changing them.
 *
 * Click a row and the next key you press is that action's. Escape is never
 * bindable - it is how a player gets the pointer and the menu back, and a
 * game that lets you bind it away is a game you can get stuck in - and
 * binding a key that another action holds takes it off that one, which is
 * what every rebinding screen does and the only behaviour that cannot
 * leave a player unable to bind anything without first hunting for which
 * row is holding their key.
 */
function Bindings() {
  const bindings = useSettings((s) => s.bindings);
  const bind = useSettings((s) => s.bind);
  const reset = useSettings((s) => s.resetBindings);
  const [listening, setListening] = useState<Action | null>(null);

  useEffect(() => {
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      // Escape is the way out of this, not a key to bind.
      if (event.code === "Escape") {
        setListening(null);
        return;
      }
      if (!bindable(event.code)) return;
      bind(listening, event.code);
      setListening(null);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [listening, bind]);

  const missing = unbound(bindings);

  return (
    <>
      <Group label="Keys" />
      {ACTIONS.map((action) => (
        <button
          key={action}
          style={{
            ...secondaryButton,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: text.small,
            borderColor: listening === action ? colors.gold : colors.line,
          }}
          data-testid={`bind-${action}`}
          data-keys={bindings[action].join(",")}
          onClick={() => setListening(action)}
        >
          <span>{ACTION_LABEL[action]}</span>
          <span style={{ color: listening === action ? colors.gold : colors.accent }}>
            {listening === action ? "press a key…" : keysLabel(bindings[action])}
          </span>
        </button>
      ))}
      {missing.length > 0 && (
        <div style={{ fontSize: text.small, color: colors.danger, margin: "4px 0" }}>
          Unbound: {missing.map((a) => ACTION_LABEL[a]).join(", ")}
        </div>
      )}
      <button
        style={{ ...secondaryButton, fontSize: text.small }}
        data-testid="bind-reset"
        onClick={reset}
      >
        Reset keys
      </button>
    </>
  );
}

function Toggle({
  label,
  on,
  onChange,
  testId,
  onWord = "on",
  offWord = "off",
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
  testId: string;
  /** Some of these are not on and off: sprint is hold and press. */
  onWord?: string;
  offWord?: string;
}) {
  return (
    <button
      style={{
        ...secondaryButton,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: text.small,
      }}
      data-testid={testId}
      onClick={() => onChange(!on)}
    >
      <span>{label}</span>
      <span
        data-value={on ? "on" : "off"}
        style={{ color: on ? colors.accent : colors.dim }}
      >
        {on ? onWord : offWord}
      </span>
    </button>
  );
}
