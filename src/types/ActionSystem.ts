import type { Action, BasePrototype } from './PrototypeSystem';
import { createCustomAction } from './PrototypeSystem';

// Built-in action library
export const BUILT_IN_ACTIONS = {
  // Visual actions
  PAINT: createCustomAction(
    'paint',
    'Paint',
    'Change the color of this object',
    '🎨',
    (target, context) => {
      if (context && typeof context === 'object' && 'color' in context) {
        target.color = context.color as string;
      }
    }
  ),

  ROTATE: createCustomAction(
    'rotate',
    'Rotate',
    'Rotate this object',
    '🔄',
    (target, context) => {
      const angle = (context && typeof context === 'object' && 'angle' in context) 
        ? (context.angle as number) 
        : Math.PI / 4;
      target.rotation = (target.rotation + angle) % (Math.PI * 2);
    }
  ),

  SCALE: createCustomAction(
    'scale',
    'Scale',
    'Scale this object',
    '📏',
    (target, context) => {
      const factor = (context && typeof context === 'object' && 'factor' in context) 
        ? (context.factor as number) 
        : 1.1;
      target.scale = Math.max(0.1, Math.min(3, target.scale * factor));
    }
  ),

  MOVE: createCustomAction(
    'move',
    'Move',
    'Move this object',
    '↔️',
    (target, context) => {
      if (context && typeof context === 'object' && 'position' in context) {
        target.position = context.position as [number, number, number];
      }
    }
  ),

  // Animation actions
  PULSE: createCustomAction(
    'pulse',
    'Pulse',
    'Make this object pulse',
    '💓',
    (target, context) => {
      const duration = (context && typeof context === 'object' && 'duration' in context) 
        ? (context.duration as number) 
        : 1000;
      const scale = (context && typeof context === 'object' && 'scale' in context) 
        ? (context.scale as number) 
        : 1.2;
      
      // This would integrate with an animation system
      console.log(`Pulsing ${target.id} for ${duration}ms with scale ${scale}`);
    }
  ),

  FADE: createCustomAction(
    'fade',
    'Fade',
    'Fade this object in/out',
    '👻',
    (target, context) => {
      const direction = (context && typeof context === 'object' && 'direction' in context) 
        ? (context.direction as string) 
        : 'out';
      const duration = (context && typeof context === 'object' && 'duration' in context) 
        ? (context.duration as number) 
        : 1000;
      
      console.log(`Fading ${target.id} ${direction} for ${duration}ms`);
    }
  ),

  // Interaction actions
  CLICK: createCustomAction(
    'click',
    'Click',
    'Handle click interaction',
    '👆',
    (target, context) => {
      console.log(`Clicked on ${target.id}`);
      if (context && typeof context === 'object' && 'onClick' in context) {
        (context.onClick as (target: BasePrototype) => void)(target);
      }
    }
  ),

  HOVER: createCustomAction(
    'hover',
    'Hover',
    'Handle hover interaction',
    '👀',
    (target, context) => {
      console.log(`Hovered over ${target.id}`);
      if (context && typeof context === 'object' && 'onHover' in context) {
        (context.onHover as (target: BasePrototype) => void)(target);
      }
    }
  ),

  // Utility actions
  DUPLICATE: createCustomAction(
    'duplicate',
    'Duplicate',
    'Create a copy of this object',
    '📋',
    (target, context) => {
      if (context && typeof context === 'object' && 'onDuplicate' in context) {
        const clone = { ...target };
        clone.id = `${target.id}_copy_${Date.now()}`;
        (context.onDuplicate as (clone: BasePrototype) => void)(clone);
      }
    }
  ),

  DELETE: createCustomAction(
    'delete',
    'Delete',
    'Remove this object',
    '🗑️',
    (target, context) => {
      if (context && typeof context === 'object' && 'onDelete' in context) {
        (context.onDelete as (id: string) => void)(target.id);
      }
    }
  ),

  // Group actions
  GROUP: createCustomAction(
    'group',
    'Group',
    'Group this object with others',
    '📦',
    (target, context) => {
      if (context && typeof context === 'object' && 'onGroup' in context) {
        (context.onGroup as (target: BasePrototype) => void)(target);
      }
    }
  ),

  UNGROUP: createCustomAction(
    'ungroup',
    'Ungroup',
    'Remove this object from its group',
    '📤',
    (target, context) => {
      if (context && typeof context === 'object' && 'onUngroup' in context) {
        (context.onUngroup as (target: BasePrototype) => void)(target);
      }
    }
  ),

  // Special effects
  GLOW: createCustomAction(
    'glow',
    'Glow',
    'Make this object glow',
    '✨',
    (target, context) => {
      const intensity = (context && typeof context === 'object' && 'intensity' in context) 
        ? (context.intensity as number) 
        : 1.5;
      target.properties.glow = { enabled: true, intensity };
      console.log(`Glowing ${target.id} with intensity ${intensity}`);
    }
  ),

  SHADOW: createCustomAction(
    'shadow',
    'Shadow',
    'Toggle shadow for this object',
    '🌑',
    (target) => {
      target.properties.castShadow = !target.properties.castShadow;
      console.log(`Shadow ${target.properties.castShadow ? 'enabled' : 'disabled'} for ${target.id}`);
    }
  ),

  // Physics actions
  GRAVITY: createCustomAction(
    'gravity',
    'Gravity',
    'Toggle gravity for this object',
    '⬇️',
    (target) => {
      target.properties.gravity = !target.properties.gravity;
      console.log(`Gravity ${target.properties.gravity ? 'enabled' : 'disabled'} for ${target.id}`);
    }
  ),

  BOUNCE: createCustomAction(
    'bounce',
    'Bounce',
    'Make this object bouncy',
    '⚡',
    (target, context) => {
      const restitution = (context && typeof context === 'object' && 'restitution' in context) 
        ? (context.restitution as number) 
        : 0.8;
      target.properties.bounce = { enabled: true, restitution };
      console.log(`Bounce enabled for ${target.id} with restitution ${restitution}`);
    }
  ),
};

// Action categories for organization
export const ACTION_CATEGORIES = {
  VISUAL: ['paint', 'rotate', 'scale', 'move', 'glow', 'shadow'],
  ANIMATION: ['pulse', 'fade'],
  INTERACTION: ['click', 'hover'],
  UTILITY: ['duplicate', 'delete', 'group', 'ungroup'],
  PHYSICS: ['gravity', 'bounce'],
};

// Action factory for creating custom actions
export class ActionFactory {
  static createVisualAction(
    id: string,
    name: string,
    description: string,
    icon: string,
    execute: (target: BasePrototype, context?: unknown) => void
  ): Action {
    return createCustomAction(id, name, description, icon, execute);
  }

  static createAnimationAction(
    id: string,
    name: string,
    description: string,
    icon: string,
    execute: (target: BasePrototype, context?: unknown) => void
  ): Action {
    return createCustomAction(id, name, description, icon, execute);
  }

  static createInteractionAction(
    id: string,
    name: string,
    description: string,
    icon: string,
    execute: (target: BasePrototype, context?: unknown) => void
  ): Action {
    return createCustomAction(id, name, description, icon, execute);
  }

  static createUtilityAction(
    id: string,
    name: string,
    description: string,
    icon: string,
    execute: (target: BasePrototype, context?: unknown) => void
  ): Action {
    return createCustomAction(id, name, description, icon, execute);
  }

  static createPhysicsAction(
    id: string,
    name: string,
    description: string,
    icon: string,
    execute: (target: BasePrototype, context?: unknown) => void
  ): Action {
    return createCustomAction(id, name, description, icon, execute);
  }
}

// Action manager for handling action execution
export class ActionManager {
  private actionHistory: Array<{ action: Action; target: BasePrototype; context?: unknown; timestamp: number }> = [];
  private maxHistorySize = 100;

  executeAction(target: BasePrototype, actionId: string, context?: unknown): boolean {
    if (!target.actions) return false;
    
    const action = target.actions.find(a => a.id === actionId);
    if (action && (!action.canExecute || action.canExecute(target, context))) {
      action.execute(target, context);
      
      // Add to history
      this.actionHistory.push({
        action,
        target,
        context,
        timestamp: Date.now(),
      });

      // Trim history if too large
      if (this.actionHistory.length > this.maxHistorySize) {
        this.actionHistory = this.actionHistory.slice(-this.maxHistorySize);
      }

      return true;
    }
    return false;
  }

  undoLastAction(): boolean {
    if (this.actionHistory.length > 0) {
      const lastAction = this.actionHistory.pop();
      if (lastAction) {
        // This would implement undo logic based on action type
        console.log(`Undoing action ${lastAction.action.id} on ${lastAction.target.id}`);
        return true;
      }
    }
    return false;
  }

  getActionHistory(): Array<{ action: Action; target: BasePrototype; context?: unknown; timestamp: number }> {
    return [...this.actionHistory];
  }

  clearHistory(): void {
    this.actionHistory = [];
  }
}

// Global action manager instance
export const actionManager = new ActionManager();