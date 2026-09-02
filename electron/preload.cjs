const { contextBridge } = require("electron");

/** What the page may know about the shell it runs in. Nothing else crosses. */
contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  steamDeck: process.env.SteamDeck === "1" || process.env.SteamOS === "1",
});
