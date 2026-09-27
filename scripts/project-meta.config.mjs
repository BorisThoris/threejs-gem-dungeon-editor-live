// Metadata inputs for this repository - unique to threejs-gem-dungeon-editor-live.
//
// This checkout tracks main of github.com/BorisThoris/threejs-gem-dungeon-editor-live,
// which Cloudflare Pages builds into https://threejs-gem-dungeon-editor-git.pages.dev/.
// The slug keeps the portfolio's historical name for that deployment; the app
// itself is the first-person gem run (the Steam demo build).
//
// Everything here is curated by hand. Derived facts (stack, metrics, git,
// screenshots) are computed by scripts/generate-project-meta.mjs, which writes
// project.meta.json. Run it with:
//   npm run meta          regenerate project.meta.json
//   npm run meta:check    fail if project.meta.json is stale
//   npm run meta:refresh  shots -> social -> icons -> meta, for a release

import path from 'node:path';

// Screenshots are captured by the portfolio (npm run capture there). Point
// PORTFOLIO_ROOT elsewhere, or drop images in ./project-media, to override.
const portfolioRoot = process.env.PORTFOLIO_ROOT ?? String.raw`C:\Users\Gaming PC\Desktop\Repos\portfolio`;

export default {
  slug: "threejs-gem-dungeon-editor",
  classification: "web-app",

  curated: {
    "title": "Gem Dungeon",
    "subtitle": "Three floors down, and every door out has a price",
    "description": "A first-person gem heist: each floor is a fresh dungeon, the exit charges a toll of three, five, then seven gems, and every gem you pocket wakes the Warden that walks the halls. Shove, sprint, and climb out with what you can carry. React Three Fiber, Rapier and Zustand, with an Electron shell for the Steam demo.",
    "tags": [
      "Game",
      "First Person",
      "React Three Fiber",
      "Rapier",
      "Steam"
    ],
    "accent": "#a78bfa",
    "deploymentUrl": "https://threejs-gem-dungeon-editor-git.pages.dev/",
    "localUrl": "http://127.0.0.1:4116/",
    "buildCommand": "yarn build",
    "buildOutput": "dist",
    "runCommand": "yarn dev --host 127.0.0.1 --port 4116",
    "devPort": 4116,
    "showcaseTier": "showcase",
    "showcaseOrder": 4
  },

  // How this project photographs itself (npm run shots): a run in progress,
  // not the title menu - start as the Vagrant, wait for the dungeon to render,
  // dismiss the "click to look around" prompt.
  capture: {
    "route": "/",
    "actions": [
      { "type": "click", "target": { "role": "button", "name": "Start as the Vagrant" }, "label": "start a run" },
      { "type": "waitFor", "target": { "selector": "canvas" }, "state": "visible", "timeoutMs": 60000, "label": "wait for the dungeon to render" },
      { "type": "wait", "ms": 2500, "label": "let the first gallery settle" },
      { "type": "click", "target": { "selector": "canvas" }, "label": "take the pointer", "optional": true },
      { "type": "key", "key": "KeyW", "holdMs": 1200, "label": "step off the start" }
    ],
    "waitAfterReadyMs": 1200,
    "quality": { "minStd": 12, "minColours": 12 }
  },

  scores: {
    "priorityScore": 90,
    "demoabilityScore": 88,
    "depthScore": 83,
    "polishScore": 80,
    "uniquenessScore": 86,
    "maintenanceScore": 74
  },

  analysisNotes:
    "The Steam-demo gem run: title screen, seeded runs, pursuers and counterplay, controller and touch input; deployed from main.",

  // Where the link-preview card lives: the page head that carries the Open
  // Graph tags, and the static directory the image is published from.
  social: {
    "htmlFile": "index.html",
    "pageTitle": "Gem Dungeon",
    "staticDir": "public",
    "imageName": "og-image.jpg",
    "imageUrlPath": "/og-image.jpg"
  },

  // The icon set is rendered from public/favicon.svg by scripts/generate-app-icons.mjs.
  icons: {
    "background": "#050608",
    "themeColor": "#050608",
    "shortName": "Gem Dungeon"
  },

  // The trailer is recorded from the deployment through Playwright: the first
  // gallery of a Vagrant run, walked and looked around, over a music bed
  // generated locally with ACE-Step. It re-records when the game's source,
  // this recipe or the music changes (scripts/build-project-trailers.mjs).
  trailers: {
    "dir": "public/trailers",
    "urlPathPrefix": "/trailers",
    "items": [
      {
        "id": "run",
        "title": "Gem Dungeon: the first gallery",
        "kind": "capture",
        "inputs": ["src", "index.html", "public/favicon.svg"],
        "source": "deployment",
        "music": "project-media/music/run.m4a",
        "posterAt": 0.55,
        "recipe": {
          "route": "/",
          "viewport": { "width": 1280, "height": 720 },
          "durationMs": 24000,
          "quality": { "minStd": 12, "minColours": 12 },
          "setup": {
            "actions": [
              { "type": "click", "target": { "role": "button", "name": "Start as the Vagrant" }, "label": "start a run" },
              { "type": "waitFor", "target": { "selector": "canvas" }, "state": "visible", "timeoutMs": 60000, "label": "wait for the dungeon to render" },
              { "type": "wait", "ms": 2000, "label": "let the first gallery settle" },
              { "type": "click", "target": { "selector": "canvas" }, "label": "take the pointer" }
            ],
            "waitAfterReadyMs": 800
          },
          "timeline": [
            { "type": "mouse", "to": [0.65, 0.5], "steps": 40, "label": "look around" },
            { "type": "key", "key": "KeyW", "holdMs": 2600, "label": "walk into the gallery" },
            { "type": "mouse", "to": [0.35, 0.48], "steps": 50, "label": "look left" },
            { "type": "key", "key": "KeyW", "holdMs": 1800, "label": "keep walking" },
            { "type": "key", "key": "KeyD", "holdMs": 900, "label": "sidestep" },
            { "type": "press", "key": "Space", "label": "shove" },
            { "type": "mouse", "to": [0.7, 0.5], "steps": 50, "label": "turn" },
            { "type": "key", "key": "KeyW", "holdMs": 2200, "label": "walk on" },
            { "type": "press", "key": "KeyF", "label": "lantern" },
            { "type": "key", "key": "KeyA", "holdMs": 800, "label": "sidestep" },
            { "type": "mouse", "to": [0.5, 0.42], "steps": 40, "label": "look up the hall" },
            { "type": "key", "key": "KeyW", "holdMs": 3000, "label": "walk to the end" }
          ]
        }
      }
    ]
  },

  media: {
    sourceDir: path.join(portfolioRoot, "public", "project-shots", "threejs-gem-dungeon-editor", "latest"),
    publicPathPrefix: "/project-shots/threejs-gem-dungeon-editor/latest",
    primaryProfile: "card"
  }
};
