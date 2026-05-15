import * as fs from 'fs';
import * as path from 'path';
import { ComponentLoader } from './componentLoader';

/**
 * Generates editor configuration files automatically
 */
export class EditorConfigGenerator {
  private outputPath: string;

  constructor(outputPath: string = 'src/config') {
    this.outputPath = outputPath;
  }

  /**
   * Generates all editor configuration files
   */
  async generateAll(): Promise<void> {
    // Ensure output directory exists
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }

    // Generate room configurations
    await this.generateRoomConfig();
    
    // Generate object configurations
    await this.generateObjectConfig();
    
    // Generate element configurations
    await this.generateElementConfig();
    
    // Generate combined configuration
    await this.generateCombinedConfig();
  }

  /**
   * Generates room configuration
   */
  private async generateRoomConfig(): Promise<void> {
    const loader = ComponentLoader.getInstance();
    const rooms = await loader.getRoomComponents();
    
    const config = this.generateConfigFile(rooms, 'RoomConfig');
    const filePath = path.join(this.outputPath, 'roomConfig.ts');
    fs.writeFileSync(filePath, config);
    
    // Generated room configuration
  }

  /**
   * Generates object configuration
   */
  private async generateObjectConfig(): Promise<void> {
    const loader = ComponentLoader.getInstance();
    const objects = await loader.getObjectComponents();
    
    const config = this.generateConfigFile(objects, 'ObjectConfig');
    const filePath = path.join(this.outputPath, 'objectConfig.ts');
    fs.writeFileSync(filePath, config);
    
    // Generated object configuration
  }

  /**
   * Generates element configuration
   */
  private async generateElementConfig(): Promise<void> {
    const loader = ComponentLoader.getInstance();
    const elements = await loader.getElementComponents();
    
    const config = this.generateConfigFile(elements, 'ElementConfig');
    const filePath = path.join(this.outputPath, 'elementConfig.ts');
    fs.writeFileSync(filePath, config);
    
    // Generated element configuration
  }

  /**
   * Generates combined configuration
   */
  private async generateCombinedConfig(): Promise<void> {
    const loader = ComponentLoader.getInstance();
    const allComponents = await loader.loadAllComponents();
    
    const config = this.generateCombinedConfigFile(allComponents);
    const filePath = path.join(this.outputPath, 'editorConfig.ts');
    fs.writeFileSync(filePath, config);
    
    // Generated combined configuration
  }

  /**
   * Generates a configuration file for a specific component type
   */
  private generateConfigFile(components: any[], configName: string): string {
    const imports = this.generateImports(components);
    const configs = this.generateConfigArray(components);
    
    return `// Auto-generated configuration file
// Do not edit manually - run 'npm run generate-config' to update

${imports}

export const ${configName}: ComponentConfig[] = ${configs};
`;
  }

  /**
   * Generates combined configuration file
   */
  private generateCombinedConfigFile(components: any[]): string {
    const imports = this.generateImports(components);
    const rooms = components.filter(c => c.category === 'room');
    const objects = components.filter(c => c.category === 'object');
    const elements = components.filter(c => c.category === 'element');
    
    return `// Auto-generated configuration file
// Do not edit manually - run 'npm run generate-config' to update

${imports}

export const ROOM_CONFIGS: ComponentConfig[] = ${this.generateConfigArray(rooms)};

export const OBJECT_CONFIGS: ComponentConfig[] = ${this.generateConfigArray(objects)};

export const ELEMENT_CONFIGS: ComponentConfig[] = ${this.generateConfigArray(elements)};

export const ALL_CONFIGS = {
  rooms: ROOM_CONFIGS,
  objects: OBJECT_CONFIGS,
  elements: ELEMENT_CONFIGS,
};
`;
  }

  /**
   * Generates import statements
   */
  private generateImports(components: any[]): string {
    const roomImports = components
      .filter(c => c.category === 'room')
      .map(c => `import ${c.title} from '../components/rooms/${c.title}';`)
      .join('\n');
    
    const objectImports = components
      .filter(c => c.category === 'object')
      .map(c => `import ${c.title} from '../components/objects/${c.title}';`)
      .join('\n');
    
    const elementImports = components
      .filter(c => c.category === 'element')
      .map(c => `import ${c.title} from '../components/roomElements/${c.title}';`)
      .join('\n');

    const allImports = [roomImports, objectImports, elementImports]
      .filter(imp => imp.trim())
      .join('\n');

    return `import React from 'react';

// Room imports
${roomImports}

// Object imports  
${objectImports}

// Element imports
${elementImports}

// Types
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
}`;
  }

  /**
   * Generates configuration array
   */
  private generateConfigArray(components: any[]): string {
    const configs = components.map(component => {
      const props = this.generatePropsObject(component.props);
      const editableProps = this.generateEditableProps(component.editableProps);
      
      return `  {
    type: "${component.type}",
    component: ${component.title},
    title: "${component.title}",
    emoji: "${component.emoji}",
    description: "${component.description}",
    props: ${props},
    editableProps: ${editableProps},
    category: "${component.category}",
  }`;
    }).join(',\n');

    return `[\n${configs}\n]`;
  }

  /**
   * Generates props object
   */
  private generatePropsObject(props: any): string {
    if (!props || Object.keys(props).length === 0) {
      return '{}';
    }

    const propStrings = Object.entries(props).map(([key, value]) => {
      if (typeof value === 'string') {
        return `      ${key}: "${value}"`;
      } else if (typeof value === 'number') {
        return `      ${key}: ${value}`;
      } else if (typeof value === 'boolean') {
        return `      ${key}: ${value}`;
      } else if (Array.isArray(value)) {
        return `      ${key}: ${JSON.stringify(value)}`;
      } else {
        return `      ${key}: ${JSON.stringify(value)}`;
      }
    });

    return `{\n${propStrings.join(',\n')}\n    }`;
  }

  /**
   * Generates editable props array
   */
  private generateEditableProps(props: any[]): string {
    if (!props || props.length === 0) {
      return 'undefined';
    }

    const propStrings = props.map(prop => {
      const propObj = `      {
        key: "${prop.name}",
        type: "${prop.type}" as const,
        required: ${prop.required}`;

      const additionalProps = [];
      if (prop.options) {
        additionalProps.push(`        options: ${JSON.stringify(prop.options)}`);
      }
      if (prop.min !== undefined) {
        additionalProps.push(`        min: ${prop.min}`);
      }
      if (prop.max !== undefined) {
        additionalProps.push(`        max: ${prop.max}`);
      }
      if (prop.step !== undefined) {
        additionalProps.push(`        step: ${prop.step}`);
      }

      return propObj + (additionalProps.length > 0 ? ',\n' + additionalProps.join(',\n') : '') + '\n      }';
    });

    return `[\n${propStrings.join(',\n')}\n    ]`;
  }
}

/**
 * Utility function to generate all configurations
 */
export async function generateEditorConfigurations(): Promise<void> {
  const generator = new EditorConfigGenerator();
  await generator.generateAll();
  // All editor configurations generated successfully!
}





