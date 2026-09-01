const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      hardwareAcceleration: true,
      backgroundThrottling: false
    },
    titleBarStyle: 'default',
    show: false, // Don't show until ready
    // Performance window options
    transparent: false,
    frame: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    fullscreenable: true,
    // Additional performance options
    skipTaskbar: false,
    alwaysOnTop: false,
    focusable: true,
    closable: true
  });

  // Load the app
  if (isDev) {
    // Development: Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Only open DevTools on demand for better performance
    // mainWindow.webContents.openDevTools();
  } else {
    // Production: Load from built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Note: CSP warning is just a security notice, not an error
  // It won't affect functionality and will disappear when packaged

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();

    // DevTools on demand only. This used to open unconditionally on every
    // launch, including in a packaged build, which is not something a player
    // should ever see.
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // The renderer previously had a large block of WebGL/pointer-lock probing
  // injected into it here, ending with a console.log on every single
  // mousemove - in a game where the mouse drives the camera, that is thousands
  // of log lines a second and a real frame-rate cost.
  //
  // A stylesheet forcing `animation-duration: 0.01ms !important` on every
  // element was also injected on did-finish-load, in the name of performance.
  // It cannot help rendering (the scene is WebGL, not CSS) and it flattens the
  // game's own menu and HUD transitions, so it is gone too.

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Basic WebGL support
app.commandLine.appendSwitch('--enable-webgl');
// Pointer lock support for mouse look
app.commandLine.appendSwitch('--enable-pointer-lock');
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});

// Create application menu
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New Game',
        accelerator: 'CmdOrCtrl+N',
        click: () => {
          // Send message to renderer to start new game
          if (mainWindow) {
            mainWindow.webContents.send('new-game');
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: () => {
          if (mainWindow) {
            mainWindow.reload();
          }
        }
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Actual Size',
        accelerator: 'CmdOrCtrl+0',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.setZoomLevel(0);
          }
        }
      },
      {
        label: 'Zoom In',
        accelerator: 'CmdOrCtrl+Plus',
        click: () => {
          if (mainWindow) {
            const currentZoom = mainWindow.webContents.getZoomLevel();
            mainWindow.webContents.setZoomLevel(currentZoom + 1);
          }
        }
      },
      {
        label: 'Zoom Out',
        accelerator: 'CmdOrCtrl+-',
        click: () => {
          if (mainWindow) {
            const currentZoom = mainWindow.webContents.getZoomLevel();
            mainWindow.webContents.setZoomLevel(currentZoom - 1);
          }
        }
      }
    ]
  },
  {
    label: 'Game',
    submenu: [
      {
        label: 'Pause/Resume',
        accelerator: 'Space',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('toggle-pause');
          }
        }
      },
      {
        label: 'Fullscreen',
        accelerator: 'F11',
        click: () => {
          if (mainWindow) {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        }
      }
    ]
  }
];

// macOS specific menu adjustments
if (process.platform === 'darwin') {
  template.unshift({
    label: app.getName(),
    submenu: [
      {
        label: 'About ' + app.getName(),
        role: 'about'
      },
      { type: 'separator' },
      {
        label: 'Services',
        role: 'services',
        submenu: []
      },
      { type: 'separator' },
      {
        label: 'Hide ' + app.getName(),
        accelerator: 'Command+H',
        role: 'hide'
      },
      {
        label: 'Hide Others',
        accelerator: 'Command+Shift+H',
        role: 'hideothers'
      },
      {
        label: 'Show All',
        role: 'unhide'
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  });
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
