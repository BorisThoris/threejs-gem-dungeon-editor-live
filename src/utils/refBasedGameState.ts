// Ref-based game state management to prevent React re-renders

interface BuffState {
  id: string;
  type: string;
  value: number;
  duration: number;
  startTime: number;
  active: boolean;
}

interface TimerState {
  id: string;
  duration: number;
  startTime: number;
  active: boolean;
  onComplete?: () => void;
}

class RefBasedGameState {
  private buffs = new Map<string, BuffState>();
  private timers = new Map<string, TimerState>();
  private listeners = new Map<string, Set<() => void>>();

  // Buff management
  addBuff = (id: string, type: string, value: number, duration: number) => {
    const buff: BuffState = {
      id,
      type,
      value,
      duration,
      startTime: performance.now(),
      active: true,
    };
    this.buffs.set(id, buff);
    this.notifyListeners('buffs');
  };

  removeBuff = (id: string) => {
    this.buffs.delete(id);
    this.notifyListeners('buffs');
  };

  getBuffs = () => {
    return Array.from(this.buffs.values());
  };

  getActiveBuffs = () => {
    const now = performance.now();
    return Array.from(this.buffs.values()).filter(buff => {
      if (!buff.active) return false;
      const elapsed = now - buff.startTime;
      if (elapsed >= buff.duration) {
        buff.active = false;
        this.buffs.delete(buff.id);
        return false;
      }
      return true;
    });
  };

  // Timer management
  startTimer = (id: string, duration: number, onComplete?: () => void) => {
    const timer: TimerState = {
      id,
      duration,
      startTime: performance.now(),
      active: true,
      onComplete,
    };
    this.timers.set(id, timer);
    this.notifyListeners('timers');
  };

  stopTimer = (id: string) => {
    const timer = this.timers.get(id);
    if (timer) {
      timer.active = false;
      this.timers.delete(id);
      this.notifyListeners('timers');
    }
  };

  getTimers = () => {
    return Array.from(this.timers.values());
  };

  getActiveTimers = () => {
    const now = performance.now();
    return Array.from(this.timers.values()).filter(timer => {
      if (!timer.active) return false;
      const elapsed = now - timer.startTime;
      if (elapsed >= timer.duration) {
        timer.active = false;
        timer.onComplete?.();
        this.timers.delete(timer.id);
        return false;
      }
      return true;
    });
  };

  // Event system
  subscribe = (event: string, callback: () => void) => {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  };

  private notifyListeners = (event: string) => {
    this.listeners.get(event)?.forEach(callback => callback());
  };

  // Update all active states (call this in useFrame)
  update = () => {
    const now = performance.now();
    
    // Update buffs
    this.buffs.forEach((buff, id) => {
      if (buff.active) {
        const elapsed = now - buff.startTime;
        if (elapsed >= buff.duration) {
          buff.active = false;
          this.buffs.delete(id);
        }
      }
    });

    // Update timers
    this.timers.forEach((timer, id) => {
      if (timer.active) {
        const elapsed = now - timer.startTime;
        if (elapsed >= timer.duration) {
          timer.active = false;
          timer.onComplete?.();
          this.timers.delete(id);
        }
      }
    });
  };

  // Get current state snapshot
  getState = () => ({
    buffs: this.getActiveBuffs(),
    timers: this.getActiveTimers(),
  });
}

export const refBasedGameState = new RefBasedGameState();
