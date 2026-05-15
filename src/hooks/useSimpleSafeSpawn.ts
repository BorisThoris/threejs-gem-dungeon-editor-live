import { useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface SimpleSafeSpawnOptions {
  maxAttempts?: number;
  searchRadius?: number;
  searchHeight?: number;
  playerRadius?: number;
  playerHeight?: number;
  stepSize?: number;
}

interface SimpleSafeSpawnResult {
  position: [number, number, number];
  isSafe: boolean;
  attempts: number;
}

export const useSimpleSafeSpawn = (options: SimpleSafeSpawnOptions = {}) => {
  const {
    maxAttempts = 50,
    searchRadius = 20,
    searchHeight = 10,
    playerRadius = 0.8,
    playerHeight = 1.6,
    stepSize = 1,
  } = options;

  const { scene, camera } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const lastCheckedPosition = useRef<THREE.Vector3 | null>(null);

  // Check if a position is safe using raycasting
  const isPositionSafe = useCallback((position: THREE.Vector3): boolean => {
    if (!scene) return false;

    try {
      // Create a capsule shape for collision testing
      const capsuleGeometry = new THREE.CapsuleGeometry(playerRadius, playerHeight);
      const capsuleMesh = new THREE.Mesh(capsuleGeometry);
      capsuleMesh.position.copy(position);
      capsuleMesh.updateMatrixWorld(true);

      // Get all meshes in the scene that could collide
      const collidableMeshes: THREE.Mesh[] = [];
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry && child.visible) {
          // Skip the player's own capsule and other non-collidable objects
          if (child !== capsuleMesh && child.userData.isCollidable !== false) {
            collidableMeshes.push(child);
          }
        }
      });

      // Check for intersections using bounding box
      const capsuleBox = new THREE.Box3().setFromObject(capsuleMesh);
      
      for (const mesh of collidableMeshes) {
        const meshBox = new THREE.Box3().setFromObject(mesh);
        if (capsuleBox.intersectsBox(meshBox)) {
          return false; // Collision detected
        }
      }

      // Additional raycast check for more precision
      const directions = [
        new THREE.Vector3(1, 0, 0),   // Right
        new THREE.Vector3(-1, 0, 0),  // Left
        new THREE.Vector3(0, 0, 1),   // Forward
        new THREE.Vector3(0, 0, -1),  // Backward
        new THREE.Vector3(0, 1, 0),   // Up
        new THREE.Vector3(0, -1, 0),  // Down
      ];

      raycaster.current.set(position, new THREE.Vector3(0, 0, 0));
      
      for (const direction of directions) {
        raycaster.current.set(position, direction);
        const intersects = raycaster.current.intersectObjects(collidableMeshes, false);
        
        for (const intersect of intersects) {
          if (intersect.distance < playerRadius + 0.1) {
            return false; // Too close to an object
          }
        }
      }

      return true; // Position is safe
    } catch (error) {
      // useSimpleSafeSpawn: Error checking position safety
      // Fallback: assume position is safe if we can't check
      return true;
    }
  }, [scene, playerRadius, playerHeight]);

  // Find a safe spawn position using spiral search pattern
  const findSafeSpawnPosition = useCallback((
    centerPosition: [number, number, number] = [0, 0, 0]
  ): SimpleSafeSpawnResult => {
    if (!scene) {
      return {
        position: centerPosition,
        isSafe: false,
        attempts: 0,
      };
    }

    const center = new THREE.Vector3(...centerPosition);
    let attempts = 0;
    let bestPosition = center.clone();
    let bestDistance = Infinity;

    // Try the center position first
    if (isPositionSafe(center)) {
      return {
        position: [center.x, center.y, center.z] as [number, number, number],
        isSafe: true,
        attempts: 1,
      };
    }

    // Spiral search pattern
    for (let radius = stepSize; radius <= searchRadius && attempts < maxAttempts; radius += stepSize) {
      const angleStep = Math.PI / 4; // 8 directions per radius
      const stepsPerRadius = Math.floor((2 * Math.PI) / angleStep);
      
      for (let step = 0; step < stepsPerRadius && attempts < maxAttempts; step++) {
        attempts++;
        
        const angle = step * angleStep;
        const x = center.x + Math.cos(angle) * radius;
        const z = center.z + Math.sin(angle) * radius;
        
        // Try different heights
        for (let heightOffset = 0; heightOffset <= searchHeight; heightOffset += stepSize) {
          const testPosition = new THREE.Vector3(x, center.y + heightOffset, z);
          
          if (isPositionSafe(testPosition)) {
            const distance = center.distanceTo(testPosition);
            if (distance < bestDistance) {
              bestPosition = testPosition.clone();
              bestDistance = distance;
            }
          }
        }
      }
    }

    // If we found a safe position, return it
    if (bestDistance < Infinity) {
      return {
        position: [bestPosition.x, bestPosition.y, bestPosition.z] as [number, number, number],
        isSafe: true,
        attempts,
      };
    }

    // Fallback: try to find the highest safe position
    for (let y = center.y + searchHeight; y >= center.y - searchHeight; y -= stepSize) {
      const testPosition = new THREE.Vector3(center.x, y, center.z);
      if (isPositionSafe(testPosition)) {
        return {
          position: [testPosition.x, testPosition.y, testPosition.z] as [number, number, number],
          isSafe: true,
          attempts: attempts + 1,
        };
      }
    }

    // Last resort: spawn at ground level in center
    const fallbackPosition = new THREE.Vector3(
      center.x,
      0.5, // Ground level instead of high in air
      center.z
    );

    return {
      position: [fallbackPosition.x, fallbackPosition.y, fallbackPosition.z] as [number, number, number],
      isSafe: false,
      attempts,
    };
  }, [scene, isPositionSafe, maxAttempts, searchRadius, searchHeight, stepSize]);

  // Check if current position is safe and move if needed
  const ensureSafePosition = useCallback((
    currentPosition: [number, number, number],
    forceCheck: boolean = false
  ): SimpleSafeSpawnResult => {
    const current = new THREE.Vector3(...currentPosition);
    
    // Skip check if position hasn't changed much and we're not forcing a check
    if (!forceCheck && lastCheckedPosition.current) {
      const distance = current.distanceTo(lastCheckedPosition.current);
      if (distance < 0.1) {
        return {
          position: currentPosition,
          isSafe: true,
          attempts: 0,
        };
      }
    }

    lastCheckedPosition.current = current.clone();

    if (isPositionSafe(current)) {
      return {
        position: currentPosition,
        isSafe: true,
        attempts: 0,
      };
    }

    // Position is not safe, find a new one
    return findSafeSpawnPosition(currentPosition);
  }, [isPositionSafe, findSafeSpawnPosition]);

  return {
    findSafeSpawnPosition,
    ensureSafePosition,
    isPositionSafe,
  };
};
