import { useEffect } from "react";

import { useSettings } from "../state/settings";
import { sfx } from "./audio";

/**
 * The mixer, following the player's settings.
 *
 * Its own file and mounted at the root, because `Audio.tsx` is only
 * rendered while a run is on - and the volume slider is on the title
 * screen. Turning it down in the menu stored the number, changed nothing,
 * and took effect on the next run; measured directly, the setting read
 * 0.5 while the mixer was still at 0.8. A control that does nothing where
 * it is offered is worse than no control.
 */
export function useMixerSettings() {
  const sound = useSettings((s) => s.sound);
  const volume = useSettings((s) => s.volume);
  useEffect(() => sfx.setMuted(!sound), [sound]);
  useEffect(() => sfx.setVolume(volume), [volume]);
}

