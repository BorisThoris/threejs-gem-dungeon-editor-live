# 3D Floating Hand Feature

This feature adds a realistic 3D floating hand to the player in your Three.js game, serving as a visual representation of the player's hand for interactions.

## Features

- **Realistic 3D Hand Model**: Created using multiple Three.js geometries (palm, thumb, and four fingers)
- **Multiple Gestures**: Supports idle, pointing, grabbing, and waving animations
- **Smooth Animations**: Fluid floating and gesture-based movements
- **Player Integration**: Automatically follows the player's camera position and rotation
- **Customizable**: Easy to modify gestures, materials, and animations

## Components

### PlayerHand.tsx
The main hand component with:
- Realistic hand geometry using box and capsule geometries
- Four different gesture animations
- Smooth floating and swaying motions
- Customizable skin tone material

### Player.tsx Integration
The hand is integrated into the Player component with:
- Automatic positioning relative to the camera
- Hand visibility toggle
- Gesture control
- Smooth following of player movement

### HandDemo.tsx
A demonstration component showing:
- All available gestures
- Interactive controls
- 3D scene with test objects
- Real-time gesture switching

## Usage

### Basic Usage
```tsx
<PlayerHand
  position={[0, 1, 0]}
  rotation={[0, 0, 0]}
  scale={[1, 1, 1]}
  visible={true}
  gesture="idle"
  animationSpeed={1.0}
/>
```

### With Player Component
```tsx
<Player
  initialSpawnPosition={[0, 1.5, 0]}
  showHand={true}
  handGesture="pointing"
/>
```

## Available Gestures

1. **idle**: Subtle floating animation with gentle sway
2. **pointing**: Extends forward with slight shake
3. **grabbing**: Curls and clenches with scale animation
4. **waving**: Side-to-side motion with bounce

## Testing

To test the hand feature, navigate to:
```
http://localhost:3000?hand-demo=true
```

This will show the HandDemo component with interactive controls to test all gestures and animations.

## Customization

### Adding New Gestures
1. Add the gesture type to the `PlayerHandProps` interface
2. Add a case in the animation switch statement
3. Define the animation behavior using position, rotation, and scale

### Modifying Hand Appearance
- Change skin tone by modifying the material color
- Adjust finger sizes by changing capsule geometry parameters
- Add textures or more complex materials

### Animation Tuning
- Modify `animationSpeed` for faster/slower animations
- Adjust floating and swaying amplitudes
- Add more complex gesture-specific animations

## Technical Details

- Uses Three.js `CapsuleGeometry` for fingers and `BoxGeometry` for palm
- Animations are handled in `useFrame` hook for smooth 60fps updates
- Hand position is calculated relative to camera position and rotation
- All meshes support shadows and proper lighting
- Optimized for performance with minimal re-renders

## Future Enhancements

- Individual finger animations
- Hand tracking integration
- More detailed hand geometry
- Custom gesture recognition
- Hand interaction with game objects
- Different hand models (left/right, different sizes)
