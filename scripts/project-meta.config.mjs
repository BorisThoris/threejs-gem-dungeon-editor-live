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
    "subtitle": "First-person gem run in a procedural dungeon",
    "description": "A first-person dungeon run: collect gems, outpace the pursuers, and spend what you carry at the exit. React Three Fiber, Rapier physics and Zustand, with an Electron shell for the Steam demo.",
    "tags": [
      "React Three Fiber",
      "Rapier",
      "Zustand",
      "Electron",
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

  // How this project photographs itself (npm run shots): the title screen.
  capture: {
    "route": "/",
    "actions": [
      {
        "type": "waitFor",
        "target": { "selector": "canvas" },
        "state": "visible",
        "label": "wait for the loaded 3D scene"
      }
    ],
    "waitAfterReadyMs": 3000
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

  media: {
    sourceDir: path.join(portfolioRoot, "public", "project-shots", "threejs-gem-dungeon-editor", "latest"),
    publicPathPrefix: "/project-shots/threejs-gem-dungeon-editor/latest",
    primaryProfile: "card"
  }
};
