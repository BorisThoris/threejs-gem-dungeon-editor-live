# The room authoring bench

The twenty templates in `src/content/templates.json` were not typed by hand,
and this is what made them.

Every prop in an authored room passes through the same filters the seeded
dressing does - out of the door lanes, clear of the gem, clear of the floor's
key, clear of the kind's own content, clear of the braziers, clear of every
other prop - and anything that fails is dropped without a word. A template
written by hand therefore renders as a sparse room rather than as an error,
which is how the first shipped treasure room showed two of its three chests
for weeks.

So the bench works the other way round: you write what the room MEANS and it
finds coordinates that survive. `templateProblems` in
`src/game/rooms/validate.ts` is the single owner of the rules; nothing here
has its own copy.

## The files

| file | what it does |
| --- | --- |
| `space.mjs` | bundles the game's own pure modules for node, and reports every problem with a template across sixteen grids |
| `compose.mjs` | takes an intent - a list of props at wanted positions - and nudges each to the nearest position the rules allow, dropping anything that cannot fit anywhere |
| `author.mjs` | the fourteen compositions written for the kinds that had none, and the sizes and shapes each is built at |
| `map.mjs` | an ASCII map of where one prop kind may legally stand in one kind of room |
| `probe.mjs` | how much legal floor each prop kind has, which is the first thing to know before composing |
| `pairs.mjs` | the sizes and shapes each kind of room may actually be built at |
| `props.mjs` | the prop catalogue, with radius and solidity |
| `show.mjs` | draws a composed template, so you can see whether it still reads as a made thing after nudging |

## Using it

```
node scripts/authoring/probe.mjs                 # where anything may stand
node scripts/authoring/map.mjs pillar library 18 # where one thing may stand
node scripts/authoring/pairs.mjs                 # what sizes a kind allows
node scripts/authoring/author.mjs                # compose, validate, write JSON
node scripts/authoring/show.mjs hall-camp        # look at what came out
```

`author.mjs` writes `authored.json` beside itself; merging that into
`src/content/templates.json` is deliberately a separate step, because the
shipped file is content and overwriting it should be a decision. Running
`author.mjs` against the shipped file reproduces the fourteen rooms it
composed, prop for prop.

The six templates that shipped before the bench existed - `vault-a`,
`hall-a` and the four tableaux - were brought up from four-to-six props to
eleven in one migration, keeping their existing props exactly where they
were. That migration is spent, and the shipped file is now their record.

## Two things the bench will not tell you

It holds a composition to the rules, not to being any good. A room that
passes every check and still reads as eleven props in a heap is a room that
passes every check. Look at it.

And the cap of eleven props is the DRAW CALL budget, not taste: a dressed
room reads 51-59 calls against a written 72 in `scripts/perf-check.mjs`.
Raising it is a measurement, not an opinion.
