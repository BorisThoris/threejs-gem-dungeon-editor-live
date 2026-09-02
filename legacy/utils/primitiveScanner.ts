import * as fs from 'fs';
import * as path from 'path';

export interface PrimitiveConfig {
  type: string;
  component: React.ComponentType<any>;
  title: string;
  emoji: string;
  description: string;
  category: 'rooms' | 'objects' | 'elements';
  props?: Record<string, any>;
  availableActions?: string[];
}

export interface PrimitiveCategory {
  name: string;
  path: string;
  components: PrimitiveConfig[];
}

/**
 * Scans the primitives directory structure and generates component configurations
 */
export class PrimitiveScanner {
  private primitivesPath: string;
  private categories: PrimitiveCategory[] = [];

  constructor(primitivesPath: string = 'src/components/primitives') {
    this.primitivesPath = primitivesPath;
  }

  /**
   * Scan all primitive categories and their components
   */
  async scanPrimitives(): Promise<PrimitiveCategory[]> {
    this.categories = [];

    // Define the categories to scan
    const categoryConfigs = [
      { name: 'rooms', path: 'rooms', type: 'rooms' as const },
      { name: 'elements', path: 'elements', type: 'elements' as const },
      { name: 'objects', path: 'objects', type: 'objects' as const },
    ];

    for (const categoryConfig of categoryConfigs) {
      const categoryPath = path.join(this.primitivesPath, categoryConfig.path);
      
      if (fs.existsSync(categoryPath)) {
        const category = await this.scanCategory(categoryConfig.name, categoryPath, categoryConfig.type);
        if (category.components.length > 0) {
          this.categories.push(category);
        }
      }
    }

    return this.categories;
  }

  /**
   * Scan a specific category directory
   */
  private async scanCategory(
    categoryName: string, 
    categoryPath: string, 
    categoryType: 'rooms' | 'objects' | 'elements'
  ): Promise<PrimitiveCategory> {
    const components: PrimitiveConfig[] = [];
    
    try {
      const files = fs.readdirSync(categoryPath);
      
      for (const file of files) {
        if (file.endsWith('.tsx') && file !== 'index.ts') {
          const componentName = this.getComponentNameFromFile(file);
          const componentPath = path.join(categoryPath, file);
          
          // Read the file to extract metadata
          const fileContent = fs.readFileSync(componentPath, 'utf-8');
          const metadata = this.extractMetadata(fileContent, componentName);
          
          // Import the component dynamically
          const componentModule = await import(`../components/primitives/${categoryName}/${file.replace('.tsx', '')}`);
          const component = componentModule.default;
          
          if (component) {
            components.push({
              type: componentName.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, ''),
              component,
              title: metadata.title || componentName,
              emoji: metadata.emoji || '🔧',
              description: metadata.description || `A ${categoryType} component`,
              category: categoryType,
              props: metadata.props || {},
              availableActions: metadata.availableActions || [],
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Error scanning category ${categoryName}:`, error);
    }

    return {
      name: categoryName,
      path: categoryPath,
      components,
    };
  }

  /**
   * Extract metadata from component file content
   */
  private extractMetadata(fileContent: string, componentName: string) {
    const metadata: any = {};

    // Extract emoji from @emoji comment
    const emojiMatch = fileContent.match(/@emoji\s+(\S+)/);
    if (emojiMatch) {
      metadata.emoji = emojiMatch[1];
    }

    // Extract description from @description comment
    const descMatch = fileContent.match(/@description\s+(.+)/);
    if (descMatch) {
      metadata.description = descMatch[1];
    }

    // Extract title from component name or @title comment
    const titleMatch = fileContent.match(/@title\s+(.+)/);
    if (titleMatch) {
      metadata.title = titleMatch[1];
    } else {
      metadata.title = componentName;
    }

    // Extract props from interface
    const propsMatch = fileContent.match(/interface\s+\w+Props\s*\{([^}]+)\}/s);
    if (propsMatch) {
      const propsContent = propsMatch[1];
      const props: Record<string, any> = {};
      
      // Simple prop extraction (can be enhanced)
      const propLines = propsContent.split('\n').filter(line => 
        line.includes('?:') || line.includes(':')
      );
      
      for (const line of propLines) {
        const propMatch = line.match(/(\w+)\??\s*:\s*([^;]+)/);
        if (propMatch) {
          const propName = propMatch[1];
          const propType = propMatch[2].trim();
          
          // Set default values based on type
          if (propType.includes('string')) {
            props[propName] = propName === 'color' ? '#4CAF50' : 'default';
          } else if (propType.includes('number')) {
            props[propName] = 1;
          } else if (propType.includes('boolean')) {
            props[propName] = false;
          } else if (propType.includes('[') && propType.includes(']')) {
            props[propName] = [0, 0, 0];
          }
        }
      }
      
      metadata.props = props;
    }

    // Extract available actions from comments
    const actionsMatch = fileContent.match(/@actions\s+(.+)/);
    if (actionsMatch) {
      metadata.availableActions = actionsMatch[1].split(',').map(a => a.trim());
    }

    return metadata;
  }

  /**
   * Get component name from filename
   */
  private getComponentNameFromFile(filename: string): string {
    return filename.replace('.tsx', '');
  }

  /**
   * Generate configuration for the 3D Editor
   */
  generateEditorConfig(): { rooms: PrimitiveConfig[]; objects: PrimitiveConfig[]; elements: PrimitiveConfig[] } {
    const config = {
      rooms: [] as PrimitiveConfig[],
      objects: [] as PrimitiveConfig[],
      elements: [] as PrimitiveConfig[],
    };

    for (const category of this.categories) {
      if (category.name === 'rooms') {
        config.rooms = category.components;
      } else if (category.name === 'objects') {
        config.objects = category.components;
      } else if (category.name === 'elements') {
        config.elements = category.components;
      }
    }

    return config;
  }
}

/**
 * Utility function to scan primitives and return editor configuration
 */
export async function scanPrimitivesForEditor(): Promise<{
  rooms: PrimitiveConfig[];
  objects: PrimitiveConfig[];
  elements: PrimitiveConfig[];
}> {
  const scanner = new PrimitiveScanner();
  await scanner.scanPrimitives();
  return scanner.generateEditorConfig();
}
