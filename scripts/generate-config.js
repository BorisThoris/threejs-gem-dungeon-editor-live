#!/usr/bin/env node

/**
 * Script to generate editor configurations automatically
 * Run with: npm run generate-config
 */

const { execSync } = require('child_process');
const path = require('path');

async function generateConfig() {
  try {
    console.log('🔧 Generating editor configurations...');
    
    // Run the TypeScript configuration generator
    const configPath = path.join(__dirname, '../src/utils/generateEditorConfig.ts');
    
    // Use ts-node to run the TypeScript file
    execSync(`npx ts-node ${configPath}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('✅ Configuration generation completed successfully!');
    console.log('📁 Generated files:');
    console.log('   - src/config/roomConfig.ts');
    console.log('   - src/config/objectConfig.ts');
    console.log('   - src/config/elementConfig.ts');
    console.log('   - src/config/editorConfig.ts');
    
  } catch (error) {
    console.error('❌ Error generating configurations:', error.message);
    process.exit(1);
  }
}

// Run the generation
generateConfig();





