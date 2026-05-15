// Base prototype system for extensible objects
export interface BasePrototype {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
  color: string;
  texture?: string;
  actions?: Action[];
  properties: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface Action {
  id: string;
  name: string;
  description: string;
  icon: string;
  execute: (target: BasePrototype, context?: unknown) => void;
  canExecute?: (target: BasePrototype, context?: unknown) => boolean;
}

export interface TextureData {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'procedural' | 'video';
  properties: {
    repeat?: [number, number];
    offset?: [number, number];
    rotation?: number;
    scale?: [number, number];
  };
}

export interface PrototypeManager {
  registerPrototype(prototype: BasePrototype): void;
  getPrototype(id: string): BasePrototype | undefined;
  getAllPrototypes(): BasePrototype[];
  addAction(prototypeId: string, action: Action): void;
  removeAction(prototypeId: string, actionId: string): void;
  setTexture(prototypeId: string, texture: TextureData): void;
  updateProperty(prototypeId: string, key: string, value: unknown): void;
  executeAction(prototypeId: string, actionId: string, context?: unknown): void;
}

// Base prototype class
export class BasePrototypeClass implements BasePrototype {
  public id: string;
  public type: string;
  public position: [number, number, number];
  public rotation: number;
  public scale: number;
  public color: string;
  public texture?: string;
  public actions: Action[] = [];
  public properties: Record<string, unknown> = {};
  public metadata: Record<string, unknown> = {};

  constructor(config: Partial<BasePrototype> = {}) {
    this.id = config.id || this.generateId();
    this.type = config.type || 'base';
    this.position = config.position || [0, 0, 0];
    this.rotation = config.rotation || 0;
    this.scale = config.scale || 1;
    this.color = config.color || '#ffffff';
    this.texture = config.texture;
    this.actions = config.actions || [];
    this.properties = config.properties || {};
    this.metadata = config.metadata || {};
  }

  private generateId(): string {
    return `${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method to add actions dynamically
  public addAction(action: Action): void {
    this.actions.push(action);
  }

  // Method to remove actions
  public removeAction(actionId: string): void {
    this.actions = this.actions.filter(action => action.id !== actionId);
  }

  // Method to set texture
  public setTexture(texture: TextureData): void {
    this.texture = texture.url;
    this.properties.texture = texture;
  }

  // Method to update properties
  public updateProperty(key: string, value: unknown): void {
    this.properties[key] = value;
  }

  // Method to execute actions
  public executeAction(actionId: string, context?: unknown): boolean {
    const action = this.actions.find(a => a.id === actionId);
    if (action && (!action.canExecute || action.canExecute(this, context))) {
      action.execute(this, context);
      return true;
    }
    return false;
  }

  // Method to clone the prototype
  public clone(): BasePrototypeClass {
    const cloned = new BasePrototypeClass({
      id: this.generateId(),
      type: this.type,
      position: [...this.position],
      rotation: this.rotation,
      scale: this.scale,
      color: this.color,
      texture: this.texture,
      actions: [...this.actions],
      properties: { ...this.properties },
      metadata: { ...this.metadata },
    });
    return cloned;
  }

  // Method to serialize for storage
  public serialize(): string {
    return JSON.stringify({
      id: this.id,
      type: this.type,
      position: this.position,
      rotation: this.rotation,
      scale: this.scale,
      color: this.color,
      texture: this.texture,
      actions: this.actions,
      properties: this.properties,
      metadata: this.metadata,
    });
  }

  // Method to deserialize from storage
  public static deserialize(data: string): BasePrototypeClass {
    const parsed = JSON.parse(data);
    return new BasePrototypeClass(parsed);
  }
}

// Specific prototype classes
export class GridCellPrototype extends BasePrototypeClass {
  public shape: 'square' | 'circle' | 'triangle' | 'diamond' | 'hexagon';
  public size: number;

  constructor(config: Partial<BasePrototype & { shape: string; size: number }> = {}) {
    super(config);
    this.type = 'grid-cell';
    this.shape = (config.shape as 'square' | 'circle' | 'triangle' | 'diamond' | 'hexagon') || 'square';
    this.size = config.size || 1;
    
    // Add default actions
    this.addDefaultActions();
  }

  private addDefaultActions(): void {
    this.addAction({
      id: 'paint',
      name: 'Paint',
      description: 'Paint this cell with selected color',
      icon: '🎨',
      execute: (target, context) => {
        if (context && typeof context === 'object' && 'color' in context) {
          target.color = context.color as string;
        }
      },
    });

    this.addAction({
      id: 'change-shape',
      name: 'Change Shape',
      description: 'Change the shape of this cell',
      icon: '🔷',
      execute: (target, context) => {
        if (context && typeof context === 'object' && 'shape' in context) {
          (target as GridCellPrototype).shape = context.shape as 'square' | 'circle' | 'triangle' | 'diamond' | 'hexagon';
        }
      },
    });

    this.addAction({
      id: 'rotate',
      name: 'Rotate',
      description: 'Rotate this cell',
      icon: '🔄',
      execute: (target) => {
        target.rotation = (target.rotation + Math.PI / 4) % (Math.PI * 2);
      },
    });

    this.addAction({
      id: 'scale',
      name: 'Scale',
      description: 'Scale this cell',
      icon: '📏',
      execute: (target, context) => {
        if (context && typeof context === 'object' && 'scale' in context) {
          target.scale = Math.max(0.1, Math.min(3, target.scale * (context.scale as number)));
        }
      },
    });

    this.addAction({
      id: 'duplicate',
      name: 'Duplicate',
      description: 'Create a copy of this cell',
      icon: '📋',
      execute: (target, context) => {
        if (context && typeof context === 'object' && 'onDuplicate' in context) {
          const clone = (target as BasePrototypeClass).clone();
          clone.position = [
            target.position[0] + 1,
            target.position[1] + 1,
            target.position[2]
          ];
          (context.onDuplicate as (clone: BasePrototypeClass) => void)(clone);
        }
      },
    });

    this.addAction({
      id: 'delete',
      name: 'Delete',
      description: 'Remove this cell',
      icon: '🗑️',
      execute: (target, context) => {
        if (context && typeof context === 'object' && 'onDelete' in context) {
          (context.onDelete as (id: string) => void)(target.id);
        }
      },
    });
  }
}

// Prototype Manager implementation
export class PrototypeManagerClass implements PrototypeManager {
  private prototypes: Map<string, BasePrototype> = new Map();

  registerPrototype(prototype: BasePrototype): void {
    this.prototypes.set(prototype.id, prototype);
  }

  getPrototype(id: string): BasePrototype | undefined {
    return this.prototypes.get(id);
  }

  getAllPrototypes(): BasePrototype[] {
    return Array.from(this.prototypes.values());
  }

  addAction(prototypeId: string, action: Action): void {
    const prototype = this.prototypes.get(prototypeId);
    if (prototype && prototype.actions) {
      prototype.actions.push(action);
    }
  }

  removeAction(prototypeId: string, actionId: string): void {
    const prototype = this.prototypes.get(prototypeId);
    if (prototype && prototype.actions) {
      prototype.actions = prototype.actions.filter(action => action.id !== actionId);
    }
  }

  setTexture(prototypeId: string, texture: TextureData): void {
    const prototype = this.prototypes.get(prototypeId);
    if (prototype) {
      prototype.texture = texture.url;
      prototype.properties.texture = texture;
    }
  }

  updateProperty(prototypeId: string, key: string, value: unknown): void {
    const prototype = this.prototypes.get(prototypeId);
    if (prototype) {
      prototype.properties[key] = value;
    }
  }

  executeAction(prototypeId: string, actionId: string, context?: unknown): void {
    const prototype = this.prototypes.get(prototypeId);
    if (prototype && prototype.actions) {
      const action = prototype.actions.find(a => a.id === actionId);
      if (action && (!action.canExecute || action.canExecute(prototype, context))) {
        action.execute(prototype, context);
      }
    }
  }
}

// Global prototype manager instance
export const prototypeManager = new PrototypeManagerClass();

// Utility functions
export const createGridCell = (config: Partial<BasePrototype & { shape: string; size: number }> = {}): GridCellPrototype => {
  const cell = new GridCellPrototype(config);
  prototypeManager.registerPrototype(cell);
  return cell;
};

export const createCustomAction = (
  id: string,
  name: string,
  description: string,
  icon: string,
  execute: (target: BasePrototype, context?: unknown) => void,
  canExecute?: (target: BasePrototype, context?: unknown) => boolean
): Action => ({
  id,
  name,
  description,
  icon,
  execute,
  canExecute,
});
