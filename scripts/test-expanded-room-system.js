#!/usr/bin/env node

/**
 * Test script for the expanded room system
 * Tests room size variations and new shapes
 */

import { SimpleMapGenerator, defaultSimpleConfig } from '../src/algorithms/simpleMapGenerator.ts';
import { calculateDoorPosition } from '../src/utils/doorUtils.ts';

console.log('🧪 Testing Expanded Room System...\n');

// Test configuration with room size variations enabled
const testConfig = {
  ...defaultSimpleConfig,
  useVariableRoomSizes: true,
  minRoomSizeMultiplier: 1.0,
  maxRoomSizeMultiplier: 2.5,
  sizeVariationChance: 0.6,
  useMultiTileRooms: true,
  multiTileChance: 0.5,
  multiTileMaxSegments: 4,
  width: 15,
  height: 15,
  minRooms: 10,
  maxRooms: 15
};

console.log('📋 Test Configuration:');
console.log(`- Variable room sizes: ${testConfig.useVariableRoomSizes}`);
console.log(`- Size range: ${testConfig.minRoomSizeMultiplier}x - ${testConfig.maxRoomSizeMultiplier}x`);
console.log(`- Size variation chance: ${testConfig.sizeVariationChance * 100}%`);
console.log(`- Multi-tile rooms: ${testConfig.useMultiTileRooms}`);
console.log(`- Multi-tile chance: ${testConfig.multiTileChance * 100}%`);
console.log(`- Map size: ${testConfig.width}x${testConfig.height}`);
console.log(`- Room count: ${testConfig.minRooms}-${testConfig.maxRooms}\n`);

try {
  // Generate test map
  console.log('🏗️  Generating test map...');
  const generator = new SimpleMapGenerator(testConfig);
  const map = generator.generateMap();
  
  console.log(`✅ Generated map with ${map.rooms.length} rooms\n`);
  
  // Analyze room sizes
  console.log('📊 Room Size Analysis:');
  const sizeStats = {
    standard: 0,
    variable: 0,
    multiTile: 0,
    sizeRange: { min: Infinity, max: -Infinity }
  };
  
  map.rooms.forEach(room => {
    if (room.actualSize && room.actualSize !== room.size) {
      sizeStats.variable++;
      sizeStats.sizeRange.min = Math.min(sizeStats.sizeRange.min, room.actualSize);
      sizeStats.sizeRange.max = Math.max(sizeStats.sizeRange.max, room.actualSize);
    } else {
      sizeStats.standard++;
    }
    
    if (room.isMultiTile) {
      sizeStats.multiTile++;
    }
  });
  
  console.log(`- Standard size rooms: ${sizeStats.standard}`);
  console.log(`- Variable size rooms: ${sizeStats.variable}`);
  console.log(`- Multi-tile rooms: ${sizeStats.multiTile}`);
  console.log(`- Size range: ${sizeStats.sizeRange.min.toFixed(1)} - ${sizeStats.sizeRange.max.toFixed(1)} units\n`);
  
  // Analyze room shapes
  console.log('🔷 Room Shape Analysis:');
  const shapeStats = {};
  map.rooms.forEach(room => {
    const shape = room.shape || 'square';
    shapeStats[shape] = (shapeStats[shape] || 0) + 1;
  });
  
  Object.entries(shapeStats).forEach(([shape, count]) => {
    console.log(`- ${shape}: ${count} rooms`);
  });
  console.log();
  
  // Test door positioning
  console.log('🚪 Door Positioning Test:');
  let doorTests = 0;
  let doorSuccesses = 0;
  
  map.rooms.forEach(room => {
    if (room.connections && room.connections.length > 0) {
      room.connections.forEach(connectionId => {
        const targetRoom = map.rooms.find(r => r.id === connectionId);
        if (targetRoom) {
          doorTests++;
          // Test that door position calculation works
          try {
            const doorPos = calculateDoorPosition(room, targetRoom, room.actualSize);
            if (doorPos && doorPos.position && doorPos.rotation) {
              doorSuccesses++;
            }
          } catch (error) {
            console.log(`❌ Door positioning failed for ${room.id} -> ${targetRoom.id}: ${error.message}`);
          }
        }
      });
    }
  });
  
  console.log(`- Door positioning tests: ${doorSuccesses}/${doorTests} successful`);
  console.log(`- Success rate: ${((doorSuccesses / doorTests) * 100).toFixed(1)}%\n`);
  
  // Test entry point generation
  console.log('🎯 Entry Point Generation Test:');
  let entryTests = 0;
  let entrySuccesses = 0;
  
  map.rooms.forEach(room => {
    if (room.entryPoints) {
      entryTests++;
      if (room.entryPoints.length > 0) {
        entrySuccesses++;
      }
    }
  });
  
  console.log(`- Entry point tests: ${entrySuccesses}/${entryTests} successful`);
  console.log(`- Success rate: ${((entrySuccesses / entryTests) * 100).toFixed(1)}%\n`);
  
  // Summary
  console.log('📈 Test Summary:');
  console.log(`✅ Map generation: SUCCESS`);
  console.log(`✅ Room size variation: ${sizeStats.variable > 0 ? 'SUCCESS' : 'NO VARIATIONS'}`);
  console.log(`✅ Multi-tile rooms: ${sizeStats.multiTile > 0 ? 'SUCCESS' : 'NO MULTI-TILE'}`);
  console.log(`✅ Door positioning: ${doorSuccesses === doorTests ? 'SUCCESS' : 'PARTIAL'}`);
  console.log(`✅ Entry points: ${entrySuccesses === entryTests ? 'SUCCESS' : 'PARTIAL'}`);
  
  console.log('\n🎉 Expanded room system test completed!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
