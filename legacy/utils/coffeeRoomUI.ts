// Ref-based UI for Coffee Room to prevent React re-renders
class CoffeeRoomUI {
  private container: HTMLElement | null = null;
  private coffeesDrunk = 0;
  private maxCoffees = 3;
  private isAnimating = false;

  public init() {
    // Create UI container
    this.container = document.createElement('div');
    this.container.id = 'coffee-room-ui';
    this.container.style.position = 'fixed';
    this.container.style.top = '50%';
    this.container.style.left = '50%';
    this.container.style.transform = 'translate(-50%, -50%)';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '1000';
    this.container.style.fontFamily = "'Press Start 2P', cursive";
    this.container.style.color = 'white';
    this.container.style.textAlign = 'center';
    this.container.style.fontSize = '14px';
    this.container.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    
    document.body.appendChild(this.container);
    this.updateUI();
  }

  public setCoffeesDrunk(count: number) {
    this.coffeesDrunk = count;
    this.updateUI();
  }

  public setAnimating(animating: boolean) {
    this.isAnimating = animating;
    this.updateUI();
  }

  private updateUI() {
    if (!this.container) return;

    const canDrink = this.coffeesDrunk < this.maxCoffees;
    
    this.container.innerHTML = `
      <div style="margin-bottom: 10px;">
        ${this.coffeesDrunk >= this.maxCoffees ? "No more coffee!" : "Click to drink coffee!"}
      </div>
      <div style="color: #00ff00; margin-bottom: 5px;">
        ${this.coffeesDrunk}/${this.maxCoffees} Coffees Drunk
      </div>
      <div style="color: #FFD700; margin-bottom: 10px;">
        +30s Speed Boost per Coffee
      </div>
      ${this.isAnimating ? '<div style="color: #FFD700; font-size: 18px;">☕ SLURP! ☕</div>' : ''}
    `;
  }

  public destroy() {
    if (this.container && document.body.contains(this.container)) {
      document.body.removeChild(this.container);
    }
    this.container = null;
  }
}

export const coffeeRoomUI = new CoffeeRoomUI();
