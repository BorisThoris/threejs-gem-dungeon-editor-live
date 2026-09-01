#!/usr/bin/env node
/**
 * Type-error ratchet.
 *
 * Runs `tsc --noEmit` over the app project, counts the reported errors and
 * compares that count against a committed baseline. The build is NOT gated on
 * reaching zero errors (there is a large pre-existing backlog); it is gated on
 * the backlog never growing.
 *
 *   count > baseline -> exit 1 (you added new type errors)
 *   count < baseline -> exit 0, but tell the user to lower the baseline
 *   count = baseline -> exit 0
 *
 * Plain Node, no dependencies.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const baselinePath = join(scriptDir, 'typecheck-baseline.json');
const project = 'tsconfig.app.json';

const args = new Set(process.argv.slice(2));
const shouldUpdate = args.has('--update') || args.has('--write');

function readBaseline() {
  try {
    const parsed = JSON.parse(readFileSync(baselinePath, 'utf8'));
    if (typeof parsed.errors !== 'number' || !Number.isFinite(parsed.errors)) {
      throw new Error('"errors" must be a number');
    }
    return parsed;
  } catch (err) {
    console.error(`Could not read baseline at ${baselinePath}: ${err.message}`);
    console.error('Create it with: node scripts/check-types.mjs --update');
    process.exit(2);
  }
}

function runTsc() {
  const result = spawnSync(
    process.execPath,
    [join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit', '-p', project],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );

  if (result.error) {
    console.error(`Failed to run tsc: ${result.error.message}`);
    process.exit(2);
  }

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const lines = output.split('\n').filter((line) => /error TS\d+/.test(line));
  return { output, count: lines.length };
}

const baseline = readBaseline();
const { output, count } = runTsc();

if (shouldUpdate) {
  const next = { ...baseline, errors: count, updated: new Date().toISOString().slice(0, 10) };
  writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Baseline updated: ${baseline.errors} -> ${count} type errors.`);
  process.exit(0);
}

const delta = count - baseline.errors;
console.log(`Type errors: ${count} (baseline ${baseline.errors}, delta ${delta >= 0 ? '+' : ''}${delta})`);

if (delta > 0) {
  console.log(output.trim());
  console.error('');
  console.error(`FAIL: ${delta} new type error${delta === 1 ? '' : 's'} introduced.`);
  console.error('Fix them, or if they are genuinely pre-existing, investigate before');
  console.error('raising scripts/typecheck-baseline.json. The baseline may only go down.');
  process.exit(1);
}

if (delta < 0) {
  console.log('');
  console.log(`Nice: ${-delta} fewer type error${delta === -1 ? '' : 's'} than the baseline.`);
  console.log('Lock the win in by lowering the baseline:');
  console.log('  node scripts/check-types.mjs --update');
  console.log(`(sets scripts/typecheck-baseline.json "errors" to ${count})`);
  process.exit(0);
}

console.log('OK: no new type errors.');
if (count > 0) {
  console.log(`${count} pre-existing error${count === 1 ? '' : 's'} remain in the backlog.`);
}
