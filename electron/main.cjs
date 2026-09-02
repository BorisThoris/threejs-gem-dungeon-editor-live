const { app, BrowserWindow, Menu, globalShortcut, shell } = require("electron");
const path = require("path");

/**
 * The desktop shell: one window, no menu bar, the game filling it.
 *
 * Fullscreen by default in a packaged build and always on Steam Deck, where
 * a title bar is wasted screen; windowed in development so devtools have
 * somewhere to go. F11 toggles fullscreen either way. The old shell had a
 * File / View / Game menu with zoom levels, a reload item and a Space
 * accelerator that ate the key from the game.
 */

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const onDeck = process.env.SteamDeck === "1" || process.env.SteamOS === "1";
const wantsWindowed = process.argv.includes("--windowed");
const wantsFullscreen =
  process.argv.includes("--fullscreen") || (!wantsWindowed && (onDeck || !isDev));

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    fullscreen: wantsFullscreen,
    autoHideMenuBar: true,
    backgroundColor: "#050608",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      backgroundThrottling: false,
    },
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Links never open inside the game window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.commandLine.appendSwitch("enable-pointer-lock");

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  globalShortcut.register("F11", () => {
    if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });
  if (isDev) {
    globalShortcut.register("CommandOrControl+Shift+I", () => {
      if (mainWindow) mainWindow.webContents.toggleDevTools();
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => globalShortcut.unregisterAll());

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
