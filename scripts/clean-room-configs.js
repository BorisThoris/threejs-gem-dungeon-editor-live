const fs = require('fs');
const path = require('path');

const filePath = 'src/components/AutoThreeDEditor.tsx';

console.log('🧹 Cleaning ROOM_CONFIGS to only include true rooms...\n');

if (fs.existsSync(filePath)) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find the start and end of ROOM_CONFIGS array
    const startPattern = /const ROOM_CONFIGS: RoomConfig\[\] = \[/;
    const endPattern = /\];\s*$/m;
    
    const startMatch = content.match(startPattern);
    if (!startMatch) {
      console.log('❌ ROOM_CONFIGS array not found');
      process.exit(1);
    }
    
    const startIndex = startMatch.index + startMatch[0].length;
    
    // Find the end of the array by looking for the closing bracket
    let bracketCount = 1;
    let endIndex = startIndex;
    
    while (endIndex < content.length && bracketCount > 0) {
      if (content[endIndex] === '[') bracketCount++;
      if (content[endIndex] === ']') bracketCount--;
      endIndex++;
    }
    
    if (bracketCount !== 0) {
      console.log('❌ Could not find end of ROOM_CONFIGS array');
      return;
    }
    
    // Extract the current array content
    const currentArrayContent = content.substring(startIndex, endIndex - 1);
    
    // Define the new clean ROOM_CONFIGS array with only true rooms
    const newRoomConfigs = `  {
    type: "start",
    component: StartRoom,
    title: "Start Room",
    emoji: "🚀",
    description: "The beginning of your adventure",
    props: { size: 10 },
    category: "room",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "middle-stairs",
    component: MiddleStairsRoom,
    title: "Middle Stairs Room",
    emoji: "🪜",
    description: "A room with stairs in the middle",
    props: { size: 10 },
    category: "room",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "stairs",
    component: StairsRoom,
    title: "Stairs Room",
    emoji: "🪜",
    description: "A room with stairs",
    props: { size: 10 },
    category: "room",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "component-showcase",
    component: ComponentShowcaseRoom,
    title: "Component Showcase Room",
    emoji: "🎨",
    description: "A room showcasing various components",
    props: { size: 10 },
    category: "room",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "room-factory",
    component: RoomFactory,
    title: "Room Factory",
    emoji: "🏭",
    description: "A factory for creating rooms",
    props: { size: 10 },
    category: "room",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "shaped-shell",
    component: ShapedShell,
    title: "Shaped Shell Room",
    emoji: "🐚",
    description: "A room with a unique shell shape",
    props: { size: 10 },
    category: "room",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "clean-breakable",
    component: CleanBreakableRoom,
    title: "Clean Breakable Room",
    emoji: "💥",
    description: "A room with clean breakable objects",
    props: { size: 10 },
    category: "room",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "optional-breaking",
    component: OptionalBreakingDemo,
    title: "Optional Breaking Demo",
    emoji: "🔨",
    description: "A demo of optional breaking functionality",
    props: { size: 10 },
    category: "room",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "all-breakable",
    component: AllBreakableDemo,
    title: "All Breakable Demo",
    emoji: "💥",
    description: "A demo of all breakable objects",
    props: { size: 10 },
    category: "room",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "universal-breakable",
    component: UniversalBreakableDemo,
    title: "Universal Breakable Demo",
    emoji: "🌍",
    description: "A demo of universal breakable objects",
    props: { size: 10 },
    category: "room",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "colosseum",
    component: ColosseumRoom,
    title: "Colosseum Room",
    emoji: "🏛️",
    description: "A grand colosseum for epic battles",
    props: { size: 10 },
    category: "room",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "corridor",
    component: CorridorRoom,
    title: "Corridor Room",
    emoji: "🚪",
    description: "A connecting corridor between rooms",
    props: { size: 10 },
    category: "room",
    editableProps: [
      {
        key: "size",
        label: "Room Size",
        type: "number",
        min: 5,
        max: 20,
        step: 1,
      },
    ],
  },
  {
    type: "cracked-brick-demo",
    component: CrackedBrickDemo,
    title: "Cracked Brick Demo",
    emoji: "🧱💥",
    description: "Demo room showcasing cracked brick components",
    props: {},
    category: "room",
    editableProps: [],
  }`;
    
    // Replace the array content
    const newContent = content.substring(0, startIndex) + '\n' + newRoomConfigs + '\n' + content.substring(endIndex - 1);
    
    fs.writeFileSync(filePath, newContent);
    console.log('✅ ROOM_CONFIGS cleaned successfully!');
    console.log('   - Removed all biome components');
    console.log('   - Kept only true room components');
    console.log('   - Updated categories to "room"');
    
  } catch (error) {
    console.error('❌ Error cleaning ROOM_CONFIGS:', error.message);
  }
} else {
  console.log('❌ File not found:', filePath);
}

console.log('\n🎉 ROOM_CONFIGS cleanup complete!');
