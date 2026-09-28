/** Windows headless Chrome can still clip the physical cursor on pointer lock.
 * Keep all automated browser processes off the interactive window station.
 * Import this module instead of playwright-core in project automation scripts.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { chromium, firefox, webkit, _electron } from "playwright-core";
export * from "playwright-core";
export { default } from "playwright-core";

let verified = false;
export function assertBrowserIsolation() {
  if (process.platform !== "win32" || verified) return;
  const shell = join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const probe = spawnSync(shell, ["-NoProfile", "-NonInteractive", "-Command",
    "if ([Environment]::UserInteractive) { exit 1 } else { exit 0 }"],
  { windowsHide: true, stdio: "ignore", timeout: 10000 });
  if (probe.status !== 0) {
    throw new Error("Browser test blocked: Windows headless Chrome can confine the physical mouse when the game requests pointer lock. Run this Node process through D:\\gha-runners\\headless-tools\\Start-IsolatedProcess.ps1 or another verified noninteractive Windows runner. Do not bypass with headless flags or a hidden shell.");
  }
  verified = true;
}

const guarded = Symbol.for("gem-dungeon.browser-isolation");
for (const target of [chromium, firefox, webkit, _electron]) {
  if (target[guarded]) continue;
  for (const method of ["launch", "launchPersistentContext", "connect", "connectOverCDP"]) {
    if (typeof target[method] !== "function") continue;
    const original = target[method].bind(target);
    target[method] = (...args) => {
      assertBrowserIsolation();
      return original(...args);
    };
  }
  target[guarded] = true;
}
