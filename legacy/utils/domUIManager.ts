// Small pieces of chrome that are not worth a React tree of their own: the
// mouse-look indicator (toggled by an event fired from a pointer handler) and
// the static controls line.
//
// The player-stats panel that used to live here is gone. It rendered
// `refBasedPlayerState` - a third parallel state object no game system reads
// or writes - so it reported "Health 100/100" and "Mana 100/100" for stats
// that do not exist, and it rewrote its whole innerHTML on a 1s interval to do
// it. The real HUD is `GameHUD`, driven by the consolidated store.
import { uiEvents, UI_EVENTS } from './uiEvents';

class DOMUIManager {
  private mouseLookIndicator: HTMLElement | null = null;
  private instructions: HTMLElement | null = null;
  private isInitialized = false;
  private unsubs: Array<() => void> = [];

  init() {
    if (this.isInitialized) return;

    // Create mouse look indicator
    this.mouseLookIndicator = document.createElement('div');
    this.mouseLookIndicator.id = 'mouse-look-indicator';
    this.mouseLookIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      font-family: monospace;
      pointer-events: none;
      border: 1px solid #00ff00;
      display: none;
      z-index: 1001;
    `;
    this.mouseLookIndicator.textContent = '🖱️ Mouse Look Active - Release Right Mouse Button to Exit';
    document.body.appendChild(this.mouseLookIndicator);

    // Create instructions
    this.instructions = document.createElement('div');
    this.instructions.id = 'game-instructions';
    this.instructions.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: #ffffff;
      padding: 10px 20px;
      border-radius: 4px;
      font-size: 12px;
      font-family: 'Press Start 2P', cursive;
      text-align: center;
      pointer-events: none;
      z-index: 1000;
    `;
    this.instructions.textContent = 'WASD to move • Right-click and hold to look around • Esc or X to pause';
    document.body.appendChild(this.instructions);

    // Listen to UI events
    this.setupEventListeners();

    this.isInitialized = true;
  }

  private setupEventListeners() {
    // Keep unsubscribe functions to clean up later
    const offMouseLookStart = uiEvents.on(UI_EVENTS.MOUSE_LOOK_START, () => {
      if (this.mouseLookIndicator) {
        this.mouseLookIndicator.style.display = 'block';
      }
      // Hide cursor when mouse look is active
      document.body.style.cursor = 'none';
    });

    const offMouseLookEnd = uiEvents.on(UI_EVENTS.MOUSE_LOOK_END, () => {
      if (this.mouseLookIndicator) {
        this.mouseLookIndicator.style.display = 'none';
      }
      // Show cursor when mouse look is inactive
      document.body.style.cursor = 'default';
    });

    this.unsubs.push(offMouseLookStart, offMouseLookEnd);
  }

  destroy() {
    // Remove all event listeners
    if (this.unsubs.length) {
      this.unsubs.forEach(off => {
        try { off(); } catch { /* listener already gone */ }
      });
      this.unsubs = [];
    }
    if (this.mouseLookIndicator) {
      this.mouseLookIndicator.remove();
      this.mouseLookIndicator = null;
    }
    if (this.instructions) {
      this.instructions.remove();
      this.instructions = null;
    }
    this.isInitialized = false;
  }
}

export const domUIManager = new DOMUIManager();
