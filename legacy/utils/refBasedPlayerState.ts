// Ref-based player state to prevent React re-renders

interface RefPlayerStats {
  lives: number;
  maxLives: number;
  level: number;
  experience: number;
  points: number;
  keys: number;
  bombs: number;
  streak: number;
  maxStreak: number;
  currentFloor: number;
  roomsCompleted: number;
  size: number;
  speed: number;
  strength: number;
  defense: number;
  intelligence: number;
  luck: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
}

class RefBasedPlayerState {
  private stats: RefPlayerStats = {
    lives: 3,
    maxLives: 3,
    level: 1,
    experience: 0,
    points: 0,
    keys: 0,
    bombs: 0,
    streak: 0,
    maxStreak: 0,
    currentFloor: 1,
    roomsCompleted: 0,
    size: 1,
    speed: 1,
    strength: 1,
    defense: 1,
    intelligence: 1,
    luck: 1,
    health: 100,
    maxHealth: 100,
    mana: 100,
    maxMana: 100,
  };

  private listeners = new Set<() => void>();

  // Get current stats
  getStats = () => this.stats;

  // Update stats without triggering re-renders
  updateStats = (updates: Partial<RefPlayerStats>) => {
    Object.assign(this.stats, updates);
    this.notifyListeners();
  };

  // Add experience and handle level up
  addExperience = (amount: number) => {
    this.stats.experience += amount;
    
    // Check for level up
    const expNeeded = this.stats.level * 100;
    if (this.stats.experience >= expNeeded) {
      this.stats.level += 1;
      this.stats.experience -= expNeeded;
      this.stats.maxHealth += 10;
      this.stats.health = this.stats.maxHealth;
      this.stats.maxMana += 10;
      this.stats.mana = this.stats.maxMana;
    }
    
    this.notifyListeners();
  };

  // Add points
  addPoints = (amount: number) => {
    this.stats.points += amount;
    this.notifyListeners();
  };

  // Upgrade stats
  upgradeStrength = (amount: number) => {
    this.stats.strength += amount;
    this.notifyListeners();
  };

  upgradeDefense = (amount: number) => {
    this.stats.defense += amount;
    this.notifyListeners();
  };

  upgradeIntelligence = (amount: number) => {
    this.stats.intelligence += amount;
    this.notifyListeners();
  };

  upgradeSpeed = (amount: number) => {
    this.stats.speed += amount;
    this.notifyListeners();
  };

  // Health management
  takeDamage = (amount: number) => {
    this.stats.health = Math.max(0, this.stats.health - amount);
    this.notifyListeners();
  };

  heal = (amount: number) => {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
    this.notifyListeners();
  };

  // Mana management
  useMana = (amount: number) => {
    this.stats.mana = Math.max(0, this.stats.mana - amount);
    this.notifyListeners();
  };

  restoreMana = (amount: number) => {
    this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + amount);
    this.notifyListeners();
  };

  // Event system
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };

  private notifyListeners = () => {
    this.listeners.forEach(callback => callback());
  };
}

export const refBasedPlayerState = new RefBasedPlayerState();
