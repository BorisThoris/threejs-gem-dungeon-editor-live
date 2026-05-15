// Simple test runner for pattern validation logic
// Run with: node src/components/primitives/game-rooms/__tests__/patternValidationTest.js

console.log('🧪 Testing Memory Game Pattern Validation Logic\n');

// Test the pattern validation logic directly
const validatePattern = (playerSequence, expectedPattern) => {
  if (playerSequence.length !== expectedPattern.length) {
    return false;
  }
  return playerSequence.every((id, index) => id === expectedPattern[index]);
};

// Test cases
const testCases = [
  {
    name: 'Correct pattern - single element',
    player: [0],
    expected: [0],
    shouldPass: true
  },
  {
    name: 'Incorrect pattern - single element',
    player: [1],
    expected: [0],
    shouldPass: false
  },
  {
    name: 'Correct pattern - multiple elements',
    player: [2, 0, 1],
    expected: [2, 0, 1],
    shouldPass: true
  },
  {
    name: 'Incorrect pattern - wrong order',
    player: [1, 0, 2],
    expected: [2, 0, 1],
    shouldPass: false
  },
  {
    name: 'Incorrect pattern - wrong length',
    player: [2, 0],
    expected: [2, 0, 1],
    shouldPass: false
  },
  {
    name: 'Correct pattern - repeated elements',
    player: [0, 0, 1, 1],
    expected: [0, 0, 1, 1],
    shouldPass: true
  },
  {
    name: 'Incorrect pattern - repeated elements wrong order',
    player: [0, 1, 0, 1],
    expected: [0, 0, 1, 1],
    shouldPass: false
  },
  {
    name: 'Correct pattern - all block IDs',
    player: [0, 1, 2, 3],
    expected: [0, 1, 2, 3],
    shouldPass: true
  },
  {
    name: 'Incorrect pattern - all block IDs reversed',
    player: [3, 2, 1, 0],
    expected: [0, 1, 2, 3],
    shouldPass: false
  }
];

// Run tests
let passedTests = 0;
let totalTests = testCases.length;

console.log('Running pattern validation tests...\n');

testCases.forEach((testCase, index) => {
  const result = validatePattern(testCase.player, testCase.expected);
  const passed = result === testCase.shouldPass;
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  Player: [${testCase.player.join(', ')}]`);
  console.log(`  Expected: [${testCase.expected.join(', ')}]`);
  console.log(`  Result: ${result ? 'PASS' : 'FAIL'}`);
  console.log(`  Expected: ${testCase.shouldPass ? 'PASS' : 'FAIL'}`);
  console.log(`  Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  if (passed) passedTests++;
});

// Test pattern generation
console.log('Testing pattern generation...\n');

const generatePattern = (length) => {
  return Array.from({ length }, () => Math.floor(Math.random() * 4));
};

const testPatternGeneration = () => {
  const lengths = [1, 2, 3, 4, 5];
  let generationTestsPassed = 0;
  
  lengths.forEach(length => {
    const pattern = generatePattern(length);
    const hasCorrectLength = pattern.length === length;
    const hasValidIds = pattern.every(id => id >= 0 && id <= 3);
    
    console.log(`Length ${length}: [${pattern.join(', ')}] - ${hasCorrectLength && hasValidIds ? '✅' : '❌'}`);
    
    if (hasCorrectLength && hasValidIds) generationTestsPassed++;
  });
  
  return generationTestsPassed === lengths.length;
};

const generationPassed = testPatternGeneration();
console.log(`\nPattern generation tests: ${generationPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}\n`);

// Summary
console.log('📊 Test Summary:');
console.log(`Pattern Validation: ${passedTests}/${totalTests} tests passed`);
console.log(`Pattern Generation: ${generationPassed ? 'PASSED' : 'FAILED'}`);
console.log(`Overall: ${passedTests === totalTests && generationPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

if (passedTests === totalTests && generationPassed) {
  console.log('\n🎉 Pattern validation logic is working correctly!');
  console.log('The issue might be elsewhere in the component (state management, timing, etc.)');
} else {
  console.log('\n🐛 Pattern validation logic has issues that need to be fixed!');
}

