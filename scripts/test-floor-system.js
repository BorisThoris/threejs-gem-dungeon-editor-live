const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Floor System...\n');

// Test 1: Check if Floor component exists and has correct exports
const floorPath = path.join(__dirname, '..', 'src', 'components', 'primitives', 'elements', 'Floor.tsx');
if (fs.existsSync(floorPath)) {
  const floorContent = fs.readFileSync(floorPath, 'utf8');
  
  // Check for required exports
  const hasFloorMaterial = floorContent.includes('export type FloorMaterial');
  const hasFloorPattern = floorContent.includes('export type FloorPattern');
  const hasFloorShape = floorContent.includes('export type FloorShape');
  const hasFloorComponent = floorContent.includes('const Floor: React.FC<FloorProps>');
  const hasDefaultExport = floorContent.includes('export default Floor');
  
  console.log('✅ Floor.tsx exists');
  console.log(`   - FloorMaterial type: ${hasFloorMaterial ? '✅' : '❌'}`);
  console.log(`   - FloorPattern type: ${hasFloorPattern ? '✅' : '❌'}`);
  console.log(`   - FloorShape type: ${hasFloorShape ? '✅' : '❌'}`);
  console.log(`   - Floor component: ${hasFloorComponent ? '✅' : '❌'}`);
  console.log(`   - Default export: ${hasDefaultExport ? '✅' : '❌'}`);
} else {
  console.log('❌ Floor.tsx not found');
}

// Test 2: Check if RoomFloor component exists
const roomFloorPath = path.join(__dirname, '..', 'src', 'components', 'primitives', 'elements', 'RoomFloor.tsx');
if (fs.existsSync(roomFloorPath)) {
  const roomFloorContent = fs.readFileSync(roomFloorPath, 'utf8');
  
  const hasRoomFloorComponent = roomFloorContent.includes('const RoomFloor: React.FC<RoomFloorProps>');
  const hasDefaultExport = roomFloorContent.includes('export default RoomFloor');
  const hasTypeImports = roomFloorContent.includes('import type { FloorMaterial, FloorPattern, FloorShape }');
  
  console.log('\n✅ RoomFloor.tsx exists');
  console.log(`   - RoomFloor component: ${hasRoomFloorComponent ? '✅' : '❌'}`);
  console.log(`   - Default export: ${hasDefaultExport ? '✅' : '❌'}`);
  console.log(`   - Type imports: ${hasTypeImports ? '✅' : '❌'}`);
} else {
  console.log('\n❌ RoomFloor.tsx not found');
}

// Test 3: Check if elements index exports the components
const elementsIndexPath = path.join(__dirname, '..', 'src', 'components', 'primitives', 'elements', 'index.ts');
if (fs.existsSync(elementsIndexPath)) {
  const elementsIndexContent = fs.readFileSync(elementsIndexPath, 'utf8');
  
  const hasFloorExport = elementsIndexContent.includes('export { default as Floor }');
  const hasRoomFloorExport = elementsIndexContent.includes('export { default as RoomFloor }');
  
  console.log('\n✅ elements/index.ts exists');
  console.log(`   - Floor export: ${hasFloorExport ? '✅' : '❌'}`);
  console.log(`   - RoomFloor export: ${hasRoomFloorExport ? '✅' : '❌'}`);
} else {
  console.log('\n❌ elements/index.ts not found');
}

// Test 4: Check if RoomFactory uses RoomFloor
const roomFactoryPath = path.join(__dirname, '..', 'src', 'components', 'primitives', 'game-rooms', 'RoomFactory.tsx');
if (fs.existsSync(roomFactoryPath)) {
  const roomFactoryContent = fs.readFileSync(roomFactoryPath, 'utf8');
  
  const hasRoomFloorImport = roomFactoryContent.includes('RoomFloor') && roomFactoryContent.includes('import');
  const hasRoomFloorUsage = roomFactoryContent.includes('<RoomFloor');
  
  console.log('\n✅ RoomFactory.tsx exists');
  console.log(`   - RoomFloor import: ${hasRoomFloorImport ? '✅' : '❌'}`);
  console.log(`   - RoomFloor usage: ${hasRoomFloorUsage ? '✅' : '❌'}`);
} else {
  console.log('\n❌ RoomFactory.tsx not found');
}

// Test 5: Check if ShapedShell uses Floor
const shapedShellPath = path.join(__dirname, '..', 'src', 'components', 'primitives', 'game-rooms', 'ShapedShell.tsx');
if (fs.existsSync(shapedShellPath)) {
  const shapedShellContent = fs.readFileSync(shapedShellPath, 'utf8');
  
  const hasFloorImport = shapedShellContent.includes('Floor') && shapedShellContent.includes('import');
  const hasFloorUsage = shapedShellContent.includes('<Floor');
  
  console.log('\n✅ ShapedShell.tsx exists');
  console.log(`   - Floor import: ${hasFloorImport ? '✅' : '❌'}`);
  console.log(`   - Floor usage: ${hasFloorUsage ? '✅' : '❌'}`);
} else {
  console.log('\n❌ ShapedShell.tsx not found');
}

// Test 6: Check if test example exists
const testExamplePath = path.join(__dirname, '..', 'src', 'examples', 'FloorTestExample.tsx');
if (fs.existsSync(testExamplePath)) {
  console.log('\n✅ FloorTestExample.tsx exists');
  console.log('   - Test suite ready for manual testing');
} else {
  console.log('\n❌ FloorTestExample.tsx not found');
}

console.log('\n🎯 Floor System Test Complete!');
console.log('\nTo test the floor system:');
console.log('1. Run: npm run dev');
console.log('2. Navigate to: http://localhost:5173');
console.log('3. Check that all rooms have proper floors');
console.log('4. Or use the FloorTestExample component for detailed testing');
