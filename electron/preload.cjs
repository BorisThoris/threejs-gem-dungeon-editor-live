const { contextBridge } = require("electron");

/**
 * The seam to Steam's achievements.
 *
 * The game calls this with a deed's Steam API name the first time it is
 * earned (see `src/game/state/deeds.ts`, which is the only caller). There
 * is no Steamworks binding here and there cannot be one yet: it needs an
 * app ID, a partner account and a native module, none of which exist. So
 * this is the whole of the wiring, deliberately in one place, and
 * `steam/README.md` says exactly what to put inside it.
 *
 * It must never throw. An achievement that fails to report is a small
 * disappointment; one that takes the run down with it is a refund. The
 * caller wraps it too - two guards for one call is not paranoia when the
 * thing being guarded is a native module that may or may not be loaded.
 */
function reportAchievement(name) {
  try {
    if (typeof name !== "string" || !name) return;
    // Wire the real client here. With steamworks.js, that is:
    //
    //   const steam = require("steamworks.js").init(APP_ID);
    //   steam.achievement.activate(name);
    //
    // initialised once at startup rather than per call.
    if (process.env.GEM_DUNGEON_LOG_ACHIEVEMENTS) console.log("[achievement]", name);
  } catch {
    // Nothing a deed does is worth a crash.
  }
}

/** What the page may know about the shell it runs in. Nothing else crosses. */
contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  steamDeck: process.env.SteamDeck === "1" || process.env.SteamOS === "1",
  achievement: reportAchievement,
});
