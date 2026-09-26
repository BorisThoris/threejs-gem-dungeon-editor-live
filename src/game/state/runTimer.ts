import { runClock, useRun } from "./run";

/** Schedule a DOM callback on the same pause-aware clock as the simulation. */
export function afterRunSeconds(seconds: number, callback: () => void): () => void {
  const deadline = runClock(useRun.getState()) + seconds;
  const timer = window.setInterval(() => {
    const run = useRun.getState();
    if (run.paused || runClock(run) < deadline) return;
    window.clearInterval(timer);
    callback();
  }, 50);
  return () => window.clearInterval(timer);
}
