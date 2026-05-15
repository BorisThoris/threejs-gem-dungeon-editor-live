import { ComponentConfig } from './componentScanner';

/**
 * Dynamically loads components and creates configurations
 */
export class ComponentLoader {
  private static instance: ComponentLoader;
  private componentCache: Map<string, React.ComponentType<any>> = new Map();

  static getInstance(): ComponentLoader {
    if (!ComponentLoader.instance) {
      ComponentLoader.instance = new ComponentLoader();
    }
    return ComponentLoader.instance;
  }

  /**
   * Loads a component dynamically
   */
  async loadComponent(componentName: string, category: string): Promise<React.ComponentType<any> | null> {
    const cacheKey = `${category}/${componentName}`;
    
    if (this.componentCache.has(cacheKey)) {
      return this.componentCache.get(cacheKey)!;
    }

    try {
      let component: React.ComponentType<any>;
      
      switch (category) {
        case 'room':
          component = await this.loadRoomComponent(componentName);
          break;
        case 'object':
          component = await this.loadObjectComponent(componentName);
          break;
        case 'element':
          component = await this.loadElementComponent(componentName);
          break;
        default:
          console.warn(`Unknown component category: ${category}`);
          return null;
      }

      this.componentCache.set(cacheKey, component);
      return component;
    } catch (error) {
      console.warn(`Failed to load component ${componentName}:`, error);
      return null;
    }
  }

  /**
   * Loads room components
   */
  private async loadRoomComponent(componentName: string): Promise<React.ComponentType<any>> {
    const module = await import(`../components/rooms/${componentName}`);
    return module.default;
  }

  /**
   * Loads object components
   */
  private async loadObjectComponent(componentName: string): Promise<React.ComponentType<any>> {
    const module = await import(`../components/objects/${componentName}`);
    return module.default;
  }

  /**
   * Loads element components
   */
  private async loadElementComponent(componentName: string): Promise<React.ComponentType<any>> {
    const module = await import(`../components/roomElements/${componentName}`);
    return module.default;
  }

  /**
   * Loads all components and returns complete configurations
   */
  async loadAllComponents(): Promise<ComponentConfig[]> {
    const { scanAllComponents } = await import('./componentScanner');
    const configs = await scanAllComponents();
    
    const loadedConfigs: ComponentConfig[] = [];
    
    for (const config of configs) {
      const component = await this.loadComponent(config.title, config.category);
      if (component) {
        loadedConfigs.push({
          ...config,
          component,
        });
      }
    }
    
    return loadedConfigs;
  }

  /**
   * Gets component by type
   */
  async getComponentByType(type: string): Promise<React.ComponentType<any> | null> {
    const configs = await this.loadAllComponents();
    const config = configs.find(c => c.type === type);
    return config?.component || null;
  }

  /**
   * Gets all room components
   */
  async getRoomComponents(): Promise<ComponentConfig[]> {
    const configs = await this.loadAllComponents();
    return configs.filter(c => c.category === 'room');
  }

  /**
   * Gets all object components
   */
  async getObjectComponents(): Promise<ComponentConfig[]> {
    const configs = await this.loadAllComponents();
    return configs.filter(c => c.category === 'object');
  }

  /**
   * Gets all element components
   */
  async getElementComponents(): Promise<ComponentConfig[]> {
    const configs = await this.loadAllComponents();
    return configs.filter(c => c.category === 'element');
  }
}

/**
 * Utility function to get component loader instance
 */
export function getComponentLoader(): ComponentLoader {
  return ComponentLoader.getInstance();
}





