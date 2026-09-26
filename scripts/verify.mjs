/** A fresh game server for each verification run avoids stale HMR state. */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { createWriteStream, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { finished } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const node = process.execPath;
const vite = join(root, "node_modules", "vite", "bin", "vite.js");
const args = process.argv.slice(2);
const full = args.includes("--full");
const systems = args.includes("--systems");
const list = args.includes("--list");
if (full && systems) throw new Error("Choose either --full or --systems");
const requested = args.filter(arg => arg.startsWith("--only=")).map(arg => arg.slice("--only=".length));
const focused = requested.length > 0;
const unknownFlags = args.filter(arg => arg !== "--full" && arg !== "--systems" && arg !== "--list" && !arg.startsWith("--only="));
if (unknownFlags.length) throw new Error(`Unknown verification option: ${unknownFlags.join(", ")}`);
const baseChecks = ["test:verification", "typecheck", "lint", "test:layout", "test:prop-overlap", "test:sentry-projection", "test:bat-flight"];
const fullChecks = ["test:world", "test:walk-navigation", "test:prod", "test:desktop"];
const systemChecks = ["test:lighting", "test:service-trail", "test:handbuilt", "test:water-sound"];
const baseBrowserChecks = ["core-flow-browser-check.mjs", "sprint-noise-browser-check.mjs", "sentry-room-browser-check.mjs", "hud-space-browser-check.mjs", "test-hall-browser-check.mjs", "scenario-browser-check.mjs", "dev-run-links-browser-check.mjs", "signal-graph-browser-check.mjs"];
const fullBrowserChecks = ["gameplay-check.mjs", "pad-check.mjs", "touch-check.mjs", "audio-check.mjs", "perf-check.mjs",
  "walk-run.mjs",
  "smoke-test.mjs", "creature-render-check.mjs", "barricade-browser-check.mjs", "pursuit-browser-check.mjs",
  "ambient-behavior-browser-check.mjs", "trap-combat-browser-check.mjs", "exploration-browser-check.mjs",
  "ecology-browser-check.mjs", "architecture-browser-check.mjs", "scenario-matrix-browser-check.mjs", "capture-scenario-review.mjs",
  "overlay-check.mjs"];
const systemBrowserChecks = ["world-browser-check.mjs", "block-lighting-browser-check.mjs", "terrain-browser-check.mjs",
  "terrain-stealth-browser-check.mjs", "footstep-collision-browser-check.mjs", "grate-browser-check.mjs", "interaction-probe-browser-check.mjs",
  "watercourse-browser-check.mjs", "water-browser-check.mjs", "secret-clue-browser-check.mjs",
  "secret-history-browser-check.mjs", "bellcap-browser-check.mjs", "apse-browser-check.mjs",
  "beetle-browser-check.mjs", "rat-spikes-browser-check.mjs", "room-acoustics-check.mjs",
  "builder-world-check.mjs", "draft-storage-browser-check.mjs", "surface-storage-browser-check.mjs", "painter-browser-check.mjs", "mosaic-browser-check.mjs", "rows-check.mjs", "authored-room-browser-check.mjs",
  "strata-browser-check.mjs", "threshold-echo-browser-check.mjs", "channel-frame-browser-check.mjs"];
const known = new Set([...baseChecks, ...fullChecks, ...systemChecks,
  ...baseBrowserChecks, ...fullBrowserChecks, ...systemBrowserChecks]);
// A check left outside every gate silently stops protecting the game.
// Resolve source command filenames from package.json, not a second mapping.
const packageScripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts;
const registeredFiles = new Set([...baseBrowserChecks, ...fullBrowserChecks, ...systemBrowserChecks]);
for (const label of [...baseChecks, ...fullChecks, ...systemChecks]) {
  const command = packageScripts[label];
  if (typeof command !== "string") throw new Error(`Missing package script for verification check: ${label}`);
  for (const match of command.matchAll(/scripts\/([\w.-]+\.mjs)/g)) registeredFiles.add(match[1]);
}
const scriptFiles = new Set(readdirSync(join(root, "scripts")));
const missing = [...registeredFiles].filter(file => !scriptFiles.has(file));
if (missing.length) throw new Error(`Registered verification files are missing: ${missing.join(", ")}`);
const unregistered = [...scriptFiles].filter(file => file.endsWith("-check.mjs") && !registeredFiles.has(file));
if (unregistered.length) throw new Error(`Checks outside every verification gate: ${unregistered.join(", ")}. Register them in scripts/verify.mjs.`);
const unknownChecks = requested.filter(label => !known.has(label));
if (unknownChecks.length) throw new Error(`Unknown verification check: ${unknownChecks.join(", ")}`);
const selected = new Set(requested);
const checks = focused ? [...baseChecks, ...fullChecks, ...systemChecks].filter(label => selected.has(label))
  : systems ? systemChecks : [...baseChecks, ...(full ? fullChecks : [])];
const browserChecks = focused ? [...baseBrowserChecks, ...fullBrowserChecks, ...systemBrowserChecks].filter(label => selected.has(label))
  : systems ? systemBrowserChecks : [...baseBrowserChecks, ...(full ? fullBrowserChecks : [])];
const mode = focused ? "focused" : full ? "full" : systems ? "systems" : "short";
if (list) {
  console.log(`${mode}: ${checks.length + browserChecks.length} checks`);
  checks.forEach(label => console.log(`source  ${label}`));
  browserChecks.forEach(label => console.log(`browser ${label}`));
  process.exit(0);
}
const reportDir = join(root, "output", "verification");
const reportPath = join(reportDir, `${mode}.json`);
const runStartedAt = new Date().toISOString();
const runStarted = performance.now();
const results = [];

async function run(label, command, args, env = {}, logPath) {
  mkdirSync(dirname(logPath), { recursive: true });
  const log = createWriteStream(logPath);
  const flushed = finished(log).then(() => null, error => error);
  let failure;
  try { await new Promise((resolve, reject) => {
    console.log(`\n── ${label} ──`);
    const usingYarn = command === "yarn" && Boolean(process.env.npm_execpath);
    const child = spawn(usingYarn ? node : command, usingYarn ? [process.env.npm_execpath, ...args] : args, {
      cwd: root,
      stdio: ["inherit", "pipe", "pipe"],
      shell: process.platform === "win32" && command === "yarn" && !usingYarn,
      env: { ...process.env, ...env },
    });
    child.stdout.on("data", chunk => { process.stdout.write(chunk); log.write(chunk); });
    child.stderr.on("data", chunk => { process.stderr.write(chunk); log.write(chunk); });
    let spawnError;
    child.once("error", error => { spawnError = error; log.write(`${error}\n`); });
    // close follows both output streams; exit can arrive before their last bytes.
    child.once("close", (code) => spawnError ? reject(spawnError)
      : code === 0 ? resolve() : reject(new Error(`${label} exited ${code}`)));
  }); } catch (error) { failure = error; }
  finally { log.end(); }
  const logError = await flushed;
  if (logError) throw new Error(`Could not save ${label} output: ${logError.message}`);
  if (failure) throw failure;
}

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const port = typeof address === "object" ? address.port : 0;
  server.close();
  await once(server, "close");
  return port;
}

async function ready(port, server) {
  const until = Date.now() + 60000;
  while (Date.now() < until) {
    if (server.exitCode !== null) throw new Error(`Vite exited ${server.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch { /* still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Vite did not start within 60 seconds");
}

let server;
const failures = [];
let fatalError = null;
function saveReport(status) {
  const report = { schemaVersion: 2, mode, status, startedAt: runStartedAt,
    updatedAt: new Date().toISOString(),
    ...(status === "running" ? {} : { finishedAt: new Date().toISOString() }),
    durationMs: Math.round(performance.now() - runStarted), checks: results,
    ...(focused ? { selectedChecks: requested } : {}),
    ...(fatalError ? { fatalError } : {}) };
  mkdirSync(reportDir, { recursive: true });
  const temporary = `${reportPath}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(report, null, 2) + "\n");
  renameSync(temporary, reportPath);
  return report;
}
async function check(label, kind, command, args, env) {
  const startedAt = new Date().toISOString();
  const started = performance.now();
  let status = "passed", message;
  const logPath = join(reportDir, `${mode}-logs`, `${label.replace(/[^a-zA-Z0-9_.-]/g, "_")}.log`);
  const result = { label, kind, status: "running", startedAt,
    logFile: relative(root, logPath).replaceAll("\\", "/"), durationMs: 0 };
  results.push(result);
  saveReport("running");
  try { await run(label, command, args, env, logPath); }
  catch (error) {
    status = "failed";
    message = error.message;
    failures.push(`${label}: ${message}`);
    if (!full && !focused && !systems) throw error;
    console.error(`Continuing ${mode} verification after ${label} failed.`);
  } finally {
    Object.assign(result, { status, durationMs: Math.round(performance.now() - started),
      ...(message ? { error: message } : {}) });
    saveReport("running");
  }
}
try {
  saveReport("running");
  for (const script of checks) await check(script, "source", "yarn", [script]);
  if (browserChecks.length) {
    const port = await freePort();
    console.log(`\n── fresh Vite server on ${port} ──`);
    server = spawn(node, [vite, "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
      cwd: root, stdio: "inherit", env: process.env,
    });
    await ready(port, server);
    for (const script of browserChecks) {
      await check(script, "browser", node, [join(root, "scripts", script), String(port)], {
        PORT: String(port), ...(script === "creature-render-check.mjs" ? { CREATURES: "" } : {}),
      });
    }
  }
  if (failures.length) throw new Error(`Verification failed:\n${failures.join("\n")}`);
  console.log("\nVerification passed.");
} catch (error) {
  fatalError = error.message;
  console.error(error);
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    if (process.platform === "win32") {
      await new Promise((resolve) => {
        const killer = spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
        killer.once("exit", resolve);
        killer.once("error", resolve);
      });
    } else {
      server.kill("SIGTERM");
    }
  }
  const passed = results.filter(result => result.status === "passed").length;
  try {
    const report = saveReport(process.exitCode ? "failed" : "passed");
    const slowest = [...results].sort((a, b) => b.durationMs - a.durationMs).slice(0, 3)
      .map(result => `${result.label} ${(result.durationMs / 1000).toFixed(1)}s`).join(", ");
    console.log(`\nVerification: ${passed}/${results.length} checks passed in ${(report.durationMs / 1000).toFixed(1)}s.`);
    if (slowest) console.log(`Slowest: ${slowest}`);
    console.log(`Report: ${reportPath}`);
  } catch (error) {
    console.error(`Could not write verification report: ${error}`);
    process.exitCode = 1;
  }
}
