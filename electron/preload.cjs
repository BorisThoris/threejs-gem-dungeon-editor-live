const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Game controls
  newGame: () => ipcRenderer.send('new-game'),
  togglePause: () => ipcRenderer.send('toggle-pause'),
  
  // Window controls
  reload: () => ipcRenderer.send('reload'),
  toggleDevTools: () => ipcRenderer.send('toggle-dev-tools'),
  setZoomLevel: (level) => ipcRenderer.send('set-zoom-level', level),
  
  // Listeners
  onNewGame: (callback) => ipcRenderer.on('new-game', callback),
  onTogglePause: (callback) => ipcRenderer.on('toggle-pause', callback),
  
  // Performance optimizations
  getGPUInfo: () => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    
    return {
      webgl: !!gl,
      webgl2: !!canvas.getContext('webgl2'),
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
    };
  },
  
  // Memory info
  getMemoryInfo: () => {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }
});

// Performance monitoring
let performanceMonitor = {
  startTime: Date.now(),
  frameCount: 0,
  lastFPSUpdate: Date.now(),
  currentFPS: 0
};

// Monitor FPS
let rafId = null;
let isMonitoring = true;

function updateFPS() {
  if (!isMonitoring) return;
  
  performanceMonitor.frameCount++;
  const now = Date.now();
  if (now - performanceMonitor.lastFPSUpdate >= 1000) {
    performanceMonitor.currentFPS = Math.round(
      (performanceMonitor.frameCount * 1000) / (now - performanceMonitor.lastFPSUpdate)
    );
    performanceMonitor.frameCount = 0;
    performanceMonitor.lastFPSUpdate = now;
  }
  rafId = requestAnimationFrame(updateFPS);
}

// Start FPS monitoring
updateFPS();

// Stop monitoring when page is about to unload
window.addEventListener('beforeunload', () => {
  isMonitoring = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
});

// Stop monitoring when page becomes hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    isMonitoring = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  } else {
    isMonitoring = true;
    updateFPS();
  }
});

// Expose performance monitoring
contextBridge.exposeInMainWorld('performanceMonitor', {
  getFPS: () => performanceMonitor.currentFPS,
  getUptime: () => Date.now() - performanceMonitor.startTime
});
