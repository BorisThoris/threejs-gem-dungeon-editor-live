# Developing this with an agent

Most of this game is written by an agent, so the repo's job is not only to
run - it is to be checkable by something that cannot look at the screen.
That is a different requirement from being readable, and the two come apart
in specific places. This document says what the repo already gives an agent,
what it still owes one, and in what order the gap is worth closing.

An agent's throughput is three things: how fast it finds the one place a
change belongs, how reliably it can tell whether the change worked, and how
many wrong turns it takes before either. Everything below buys one of those.

## What already works

These are assets, not accidents, and the list is here so that nothing in the
task list below is read as a rewrite of them.

- **One owner per fact.** `ARCHITECTURE.md` opens with the rule and the rest
  of the file is the map of who owns what. For an agent this is worth more
  than any tooling: a fact with one owner has one place to change and no
  silent second copy to miss. Every bug fixed in the week before the rebuild
  was two modules holding different values for one thing.
- **The probes.** `App.tsx` publishes `__bus`, `Perf.tsx` publishes
  `__scene`, `run.ts` publishes `__run`, and twenty-seven files in all publish
  their own state at frame rate. This is a headless inspector: a check can ask
  the running game what it actually built, in text, without a human looking.
- **Twenty-eight `test:*` checks** that drive the real game in a browser
  rather than a mock of it, plus `layout-check.mjs` at 5,933 lines holding
  the generator to its invariants over hundreds of seeds.
- **A written perf budget** with real numbers, described in the README as a
  tripwire rather than an aspiration.
- **`mobs/contract.ts`.** A typed row per creature and a suite that holds
  every row to every field. Add a creature by adding a row; the suite says
  what is missing. This is the best idea in the codebase and most of the
  task list below is a proposal to use it more widely.

What is missing is at the edges of that loop, not in the middle of it.

## 1. There is no CLAUDE.md

Today: the file does not exist, and neither does `.claude/`.

What it costs. 36,187 lines across 233 files, a hard architectural rule, 28
test commands with no index, an editor reachable only at `?editor`, a perf
budget, a probe convention, and a house prose voice - and every session
rediscovers all of it from the README or not at all. The recurring failure
is not a wrong edit; it is an agent solving a problem the repo already
solved, in a second place, which is the exact thing the one-owner rule
exists to prevent.

Done looks like: a CLAUDE.md carrying the one-owner rule, which check
answers which kind of change, the budget numbers, the probe convention,
`yarn typecheck` being clean with no error budget, and a note on the prose
style of the docs. The voice in `PLAYTEST.md` and `ARCHITECTURE.md` is
specific and an agent will flatten it into release-note English unless it is
told not to.

## 2. There is no one command that verifies a change

Today: 28 `test:*` entries in `package.json` and nothing that runs a
meaningful subset of them.

What it costs. Faced with 28 names, an agent picks one or two and guesses
low - usually `test:smoke`, because it is first in the README. The checks
that would have caught the change are the ones nobody ran.

Done looks like: two tiers. `yarn verify` for typecheck, lint, layout and
smoke, cheap enough to run on every change. `yarn verify:full` for
everything, for the end of a piece of work. Tiering is the point: agents run
what is cheap and named, so the cheap one has to exist and has to be worth
trusting.

## 3. CI runs none of the checks

Today: `.github/workflows/` holds `project-meta.yml` and
`project-meta-refresh.yml`. Between them they check that the link-preview
card and the icons are current, and photograph the live site after a deploy.
Neither runs `typecheck`, `lint`, or any of the 28 checks.

What it costs. The harness is a thing you *can* run rather than a thing that
*runs*. The perf budget in particular is described as a tripwire for the day
a cycle adds a mesh per prop - which the README notes has happened twice and
was caught by nothing - and a tripwire that only fires when someone
remembers is not one. For an agent opening a pull request, it means no
signal comes back at all.

Done looks like: the tiers from task 2 wired to push and pull request. This
is the task that converts the existing work into leverage, and it needs no
new checks written.

## 4. The probes are untyped

Today: the probe surface is declared inline at each site, as casts of the
form `(window as unknown as { __bats?: ... })`, and the shapes are repeated
rather than shared. The check scripts are `.mjs` with no types at all.

What it costs. Nothing connects the probe a component publishes to the probe
a check reads, so the two drift silently and the check fails at runtime, in a
browser, with `undefined`. Learning what is inspectable means grepping
fifteen files.

Done looks like: one declaration file owning the global probe surface.
`typecheck` then catches drift at the point of the edit, and an agent has one
file to read to learn what it can ask the running game.

## 5. The probe is required only of creatures

Today: twenty-seven files publish a probe, so the habit is established. But
only the eleven creature rows are *held* to one: `contract.ts` has a `probe`
field and the suite fails a row that does not answer it. Everywhere else the
probe is discretionary, and coverage follows attention rather than need.
`worldbuilding/` is the clearest case - two of its twenty-one files publish
anything, `__bellcaps` and `__watercourse`. Terraces and elevation, identity,
the structural pattern, furnishing, the service trail and the district
thresholds publish nothing, and those are the systems that decide where a
room's geometry actually goes.

What it costs. A system with no probe can only be checked through its side
effects - what got drawn, where the player ended up - rather than by asking
it what it decided. Checks written that way are long, indirect, and fail in
ways that do not name the cause.

Done looks like: the requirement extended past the creature table, so each
worldbuilding system is held to publishing what it chose. The habit is
already there; what is missing is the row that makes it not optional.

## 6. Probes are stripped from the build that ships

Today: 35 sites guard their probe with `import.meta.env.DEV`.

What it costs. `test:prod` and `test:desktop` play the built and the packaged
game - the two checks closest to what a player actually runs - and they are
the two least able to inspect anything. What those checks can assert is
therefore the least about the thing that ships.

Done looks like: a decision, not necessarily a change. Either a flag that
keeps the probes in a non-dev build for the checks that need them, or an
explicit note that the prod checks are deliberately black-box. Today it is
neither; it is a default nobody chose.

## 7. Only creatures have a contract table

Today: `contract.ts` exists for creatures. Props, items, biomes, puzzles,
traps and lessons have no equivalent.

What it costs. The doc comment on `contract.ts` describes the failure
exactly: ten creatures built one at a time, each complete in a different way,
because nothing said what a creature was. That failure is not specific to
creatures. An agent adding a prop today has nothing telling it what a
finished prop is, so a prop is as finished as the session that added it.

Done looks like: the same shape for the other registries - a typed row, a
suite that holds every row to every field, and a comment naming the failure
it prevents. "Add a row; the suite says what is missing" then becomes the way
work is done here rather than one system's good luck.

## 8. The tour asserts nothing

Today: `yarn tour` photographs every kind of room and every screen, and
`ARCHITECTURE.md` says plainly that looking at the pictures is the check.
There are no baselines and no comparison anywhere in `scripts/`.

What it costs. This is the one loop an agent genuinely cannot close. Every
existing check asserts scene-graph facts: an agent can confirm a bat is at
the right coordinates and cannot tell you the room reads as black. That
exact failure is in the history - point light intensity moved to candela in
three r155, the torches lit nothing, and it took a human looking at
screenshots to find it.

Done looks like: baselines on a few canonical shots at fixed seed and fixed
camera, compared with a tolerance. Scope it small and keep it small. Pixel
comparison is noisy across drivers and machines, and a baseline suite that
cries wolf will be ignored, which is worse than not having one.

## 9. Session ergonomics

Today: no `.claude/` directory of any kind.

Three small things, in descending order of worth. A `SessionStart` hook so a
web session arrives with dependencies installed and the browser ready rather
than spending its first minutes on setup. A settings allowlist so routine
commands - `yarn typecheck`, `grep`, the checks - do not stop for permission.
Repo skills for the workflows that already have a shape, chiefly "add a
creature" and "add a room".

## What not to do

Every check added is a check that has to be kept green, and 28 browser runs
on every push costs real minutes. Tier the suite rather than running all of
it everywhere, and do not add a check without deciding which tier it is in.

The failure mode to avoid is machinery that describes the codebase a second
time. A contract table earns its place because the suite reads it and the
game reads it; a document that lists the same facts a third time is another
owner of a fact that already has one, and the rule this repo is built on says
what happens then.
