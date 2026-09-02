import * as fs from 'fs';
import * as path from 'path';

export interface ComponentMetadata {
  name: string;
  filePath: string;
  props: PropMetadata[];
  category: 'room' | 'object' | 'element';
  emoji: string;
  description: string;
}

export interface PropMetadata {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ComponentConfig {
  type: string;
  component: React.ComponentType<any>;
  title: string;
  emoji: string;
  description: string;
  props?: any;
  editableProps?: PropMetadata[];
  category: 'room' | 'object' | 'element';
}

/**
 * Scans a directory for React components and extracts metadata
 */
export class ComponentScanner {
  private basePath: string;
  private componentCache: Map<string, ComponentMetadata> = new Map();

  constructor(basePath: string = 'src/components') {
    this.basePath = basePath;
  }

  /**
   * Scans all components in the specified directories
   */
  async scanComponents(): Promise<ComponentConfig[]> {
    const components: ComponentConfig[] = [];

    // Scan game rooms
    const gameRooms = await this.scanDirectory('primitives/game-rooms', 'room');
    components.push(...gameRooms);
    
    // Scan demo rooms
    const demoRooms = await this.scanDirectory('primitives/demo-rooms', 'room');
    components.push(...demoRooms);

    // Scan objects
    const objects = await this.scanDirectory('primitives/objects', 'object');
    components.push(...objects);

    // Scan room elements
    const elements = await this.scanDirectory('primitives/elements', 'element');
    components.push(...elements);

    return components;
  }

  /**
   * Scans a specific directory for components
   */
  private async scanDirectory(
    dirName: string,
    category: 'room' | 'object' | 'element'
  ): Promise<ComponentConfig[]> {
    const components: ComponentConfig[] = [];
    const dirPath = path.join(this.basePath, dirName);

    if (!fs.existsSync(dirPath)) {
      console.warn(`Directory ${dirPath} does not exist`);
      return components;
    }

    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      if (file.endsWith('.tsx') && !file.endsWith('.d.ts') && file !== 'index.ts') {
        const componentName = this.getComponentName(file);
        const filePath = path.join(dirPath, file);
        
        try {
          const metadata = await this.extractComponentMetadata(filePath, componentName, category);
          if (metadata) {
            const config = this.createComponentConfig(metadata);
            components.push(config);
          }
        } catch (error) {
          console.warn(`Failed to scan component ${file}:`, error);
        }
      }
    }

    return components;
  }

  /**
   * Extracts metadata from a component file
   */
  private async extractComponentMetadata(
    filePath: string,
    componentName: string,
    category: 'room' | 'object' | 'element'
  ): Promise<ComponentMetadata | null> {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract props interface
    const props = this.extractPropsFromInterface(content);
    
    // Extract component metadata from comments
    const metadata = this.extractMetadataFromComments(content);
    
    return {
      name: componentName,
      filePath,
      props,
      category,
      emoji: metadata.emoji || this.getDefaultEmoji(category),
      description: metadata.description || `${componentName} component`,
    };
  }

  /**
   * Extracts props from TypeScript interface
   */
  private extractPropsFromInterface(content: string): PropMetadata[] {
    const props: PropMetadata[] = [];
    
    // Look for interface definitions
    const interfaceRegex = /interface\s+(\w+Props)\s*\{([^}]+)\}/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      const interfaceContent = match[2];
      const propMatches = this.extractPropsFromInterfaceContent(interfaceContent);
      props.push(...propMatches);
    }
    
    return props;
  }

  /**
   * Extracts individual props from interface content
   */
  private extractPropsFromInterfaceContent(interfaceContent: string): PropMetadata[] {
    const props: PropMetadata[] = [];
    const lines = interfaceContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        const prop = this.parsePropLine(trimmed);
        if (prop) {
          props.push(prop);
        }
      }
    }
    
    return props;
  }

  /**
   * Parses a single prop line from interface
   */
  private parsePropLine(line: string): PropMetadata | null {
    // Match patterns like: propName?: type;
    const propRegex = /(\w+)(\?)?\s*:\s*([^;]+);?/;
    const match = line.match(propRegex);
    
    if (!match) return null;
    
    const [, name, optional, type] = match;
    const isRequired = !optional;
    
    // Parse type and extract additional metadata
    const { baseType, options, min, max, step } = this.parseType(type.trim());
    
    return {
      name,
      type: baseType,
      required: isRequired,
      options,
      min,
      max,
      step,
    };
  }

  /**
   * Parses TypeScript type and extracts metadata
   */
  private parseType(type: string): {
    baseType: string;
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
  } {
    // Handle union types like "string | number"
    if (type.includes('|')) {
      const types = type.split('|').map(t => t.trim());
      if (types.includes('string') && types.includes('number')) {
        return { baseType: 'number' };
      }
      if (types.includes('string')) {
        return { baseType: 'string' };
      }
      if (types.includes('boolean')) {
        return { baseType: 'boolean' };
      }
    }
    
    // Handle array types
    if (type.includes('[]')) {
      return { baseType: 'array' };
    }
    
    // Handle literal types (for select options)
    if (type.includes('"') && type.includes('|')) {
      const options = type.match(/"([^"]+)"/g)?.map(opt => opt.replace(/"/g, ''));
      return { baseType: 'select', options };
    }
    
    // Handle specific types
    if (type.includes('number')) return { baseType: 'number' };
    if (type.includes('boolean')) return { baseType: 'boolean' };
    if (type.includes('string')) return { baseType: 'string' };
    if (type.includes('object')) return { baseType: 'object' };
    if (type.includes('color')) return { baseType: 'color' };
    
    return { baseType: 'string' };
  }

  /**
   * Extracts metadata from JSDoc comments
   */
  private extractMetadataFromComments(content: string): {
    emoji?: string;
    description?: string;
  } {
    const metadata: { emoji?: string; description?: string } = {};
    
    // Look for JSDoc comments
    const jsdocRegex = /\/\*\*\s*\n\s*\*\s*@(\w+)\s+(.+?)(?=\n\s*\*\s*@|\n\s*\*\/)/g;
    let match;
    
    while ((match = jsdocRegex.exec(content)) !== null) {
      const [, tag, value] = match;
      switch (tag) {
        case 'emoji':
          metadata.emoji = value.trim();
          break;
        case 'description':
          metadata.description = value.trim();
          break;
      }
    }
    
    return metadata;
  }

  /**
   * Gets component name from filename
   */
  private getComponentName(filename: string): string {
    return filename.replace('.tsx', '').replace(/^[a-z]/, (match) => match.toUpperCase());
  }

  /**
   * Gets default emoji based on category
   */
  private getDefaultEmoji(category: 'room' | 'object' | 'element'): string {
    const emojis = {
      room: '🏠',
      object: '📦',
      element: '🧩',
    };
    return emojis[category];
  }

  /**
   * Creates component config from metadata
   */
  private createComponentConfig(metadata: ComponentMetadata): ComponentConfig {
    // Create default props object
    const props: any = {};
    const editableProps: PropMetadata[] = [];
    
    for (const prop of metadata.props) {
      // Set default value
      if (prop.defaultValue !== undefined) {
        props[prop.name] = prop.defaultValue;
      } else {
        // Set sensible defaults based on type
        switch (prop.type) {
          case 'number':
            props[prop.name] = prop.min || 0;
            break;
          case 'boolean':
            props[prop.name] = false;
            break;
          case 'string':
            props[prop.name] = '';
            break;
          case 'array':
            props[prop.name] = [];
            break;
          case 'object':
            props[prop.name] = {};
            break;
          default:
            props[prop.name] = null;
        }
      }
      
      // Add to editable props if it's a simple type
      if (['number', 'boolean', 'string', 'select', 'color'].includes(prop.type)) {
        editableProps.push(prop);
      }
    }
    
    return {
      type: metadata.name.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase(),
      component: null as any, // Will be set by the loader
      title: metadata.name,
      emoji: metadata.emoji,
      description: metadata.description,
      props,
      editableProps,
      category: metadata.category,
    };
  }
}

/**
 * Utility function to scan components and return configurations
 */
export async function scanAllComponents(): Promise<ComponentConfig[]> {
  const scanner = new ComponentScanner();
  return await scanner.scanComponents();
}


