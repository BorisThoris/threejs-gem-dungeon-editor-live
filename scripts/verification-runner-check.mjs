import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fixture = mkdtempSync(join(tmpdir(), "gem-verification-"));
try {
  const scripts = join(fixture, "scripts");
  mkdirSync(scripts);
  // Empty stand-ins keep runner tests isolated from game and browser checks.
  for (const file of readdirSync(join(root, "scripts"))) writeFileSync(join(scripts, file), "");
  copyFileSync(join(root, "scripts/verify.mjs"), join(scripts, "verify.mjs"));
  copyFileSync(join(root, "package.json"), join(fixture, "package.json"));
  const run = (...args) => spawnSync(process.execPath, [join(scripts, "verify.mjs"), ...args], { encoding: "utf8" });
  for (const mode of [[], ["--full"], ["--systems"]]) {
    const result = run(...mode, "--list");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /checks\nsource/);
    assert.match(result.stdout, /browser /);
  }
  const focused = run("--list", "--only=test:water-sound");
  assert.equal(focused.status, 0, focused.stderr);
  assert.equal(focused.stdout.trim(), "focused: 1 checks\nsource  test:water-sound");
  assert.equal(existsSync(join(fixture, "output")), false, "listing cannot create or replace reports");
  assert.notEqual(run("--list", "--only=unknown-check.mjs").status, 0);
  const orphan = join(scripts, "unregistered-check.mjs");
  writeFileSync(orphan, "");
  const unregistered = run("--list");
  assert.notEqual(unregistered.status, 0);
  assert.match(unregistered.stderr, /Checks outside every verification gate: unregistered-check.mjs/);
  rmSync(orphan);
  rmSync(join(scripts, "world-browser-check.mjs"));
  const missing = run("--list");
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Registered verification files are missing: world-browser-check.mjs/);
  writeFileSync(join(scripts, "world-browser-check.mjs"), "");
  const reportPath = join(fixture, "output/verification/focused.json");
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify({ status: "passed", startedAt: "stale" }));
  const probe = `import assert from "node:assert/strict";
    import { readFileSync } from "node:fs";
    const report = JSON.parse(readFileSync("output/verification/focused.json", "utf8"));
    assert.equal(report.status, "running");
    assert.notEqual(report.startedAt, "stale");
    assert.equal(report.finishedAt, undefined);
    assert.deepEqual(report.checks.map(check => [check.label, check.status]),
      [["test:handbuilt", "passed"], ["test:water-sound", "running"]]);
    console.log("live report observed");`;
  writeFileSync(join(scripts, "water-sound-check.mjs"), probe);
  const completed = run("--only=test:handbuilt", "--only=test:water-sound");
  assert.equal(completed.status, 0, completed.stdout + completed.stderr);
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  assert.equal(report.status, "passed");
  assert.ok(report.finishedAt);
  assert.ok(report.checks.every(check => check.status === "passed"));
  assert.match(readFileSync(join(fixture, report.checks[1].logFile), "utf8"), /live report observed/);
  writeFileSync(join(scripts, "water-sound-check.mjs"), probe + "\nprocess.exitCode = 7;");
  assert.notEqual(run("--only=test:handbuilt", "--only=test:water-sound").status, 0);
  const failed = JSON.parse(readFileSync(reportPath, "utf8"));
  assert.equal(failed.status, "failed");
  assert.equal(failed.checks[0].status, "passed");
  assert.equal(failed.checks[1].status, "failed");
  assert.match(failed.checks[1].error, /exited 7/);
  // Windows scanners/readers can briefly deny atomic replacement of a
  // report. Exercise the real runner with that filesystem failure injected.
  writeFileSync(join(scripts, "water-sound-check.mjs"), probe);
  const lockedRename = join(fixture, "locked-rename.mjs");
  writeFileSync(lockedRename, `import fs from "node:fs";
    import { syncBuiltinESMExports } from "node:module";
    const rename = fs.renameSync;
    let attempts = 0;
    fs.renameSync = (from, to) => {
      if (to.endsWith("focused.json") && (process.env.REPORT_ALWAYS_LOCKED || attempts++ % 3 < 2)) {
        throw Object.assign(new Error("simulated Windows report lock"), { code: "EPERM" });
      }
      return rename(from, to);
    };
    syncBuiltinESMExports();`);
  const underLock = always => spawnSync(process.execPath,
    [join(scripts, "verify.mjs"), "--only=test:handbuilt", "--only=test:water-sound"],
    { encoding: "utf8", timeout: 15000, env: { ...process.env,
      NODE_OPTIONS: `--import=${pathToFileURL(lockedRename).href}`,
      REPORT_ALWAYS_LOCKED: always ? "1" : "" } });
  const recovered = underLock(false);
  assert.equal(recovered.status, 0, recovered.stdout + recovered.stderr);
  const recoveredReport = readFileSync(reportPath, "utf8");
  assert.equal(JSON.parse(recoveredReport).status, "passed");
  const locked = underLock(true);
  assert.notEqual(locked.status, 0);
  assert.equal(locked.error, undefined, "a persistent lock must fail within the retry bound");
  assert.match(locked.stderr, /simulated Windows report lock/);
  assert.equal(readFileSync(reportPath, "utf8"), recoveredReport,
    "a persistent lock leaves the last complete report intact");
  console.log("PASS verification runner: inventory, listing, live progress, durable logs and terminal success/failure reports");
} finally {
  // fixture is the exact fresh directory returned by mkdtempSync above.
  rmSync(fixture, { recursive: true, force: true });
}
