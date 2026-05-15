import { useRef, useCallback } from 'react';
import { useRapier } from '@react-three/rapier';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface SafeSpawnOptions {
  maxAttempts?: number;
  searchRadius?: number;
  searchHeight?: number;
  playerRadius?: number;
  playerHeight?: number;
  stepSize?: number;
}

interface SafeSpawnResult {
  position: [number, number, number];
  isSafe: boolean;
  attempts: number;
}

export const useSafeSpawn = (options: SafeSpawnOptions = {}) => {
  const {
    maxAttempts = 50,
    searchRadius = 20,
    searchHeight = 10,
    playerRadius = 0.8,
    playerHeight = 0.6,
    stepSize = 1,
  } = options;

  // Reusable objects to avoid garbage collection
  const tempVector = useRef(new THREE.Vector3());
  const testPosition = useRef(new THREE.Vector3());
  const fallbackPosition = useRef(new THREE.Vector3());
  const currentPosition = useRef(new THREE.Vector3());

  const { world } = useRapier();
  const { camera } = useThree();
  const lastCheckedPosition = useRef<THREE.Vector3 | null>(null);

  // Check if a position is safe (no collisions)
  const isPositionSafe = useCallback((position: THREE.Vector3): boolean => {
    if (!world) return false;

    try {
      // Use Rapier's collision detection
      const collisionWorld = world.raw();
      
      // Create a temporary rigid body for collision testing
      const tempBody = collisionWorld.createRigidBody(
        new (window as any).Rapier.RigidBodyDesc(
          (window as any).Rapier.RigidBodyType.Dynamic
        )
          .setTranslation(position.x, position.y, position.z)
      );

      const tempCollider = collisionWorld.createCollider(
        new (window as any).Rapier.CapsuleCollider(
          playerHeight / 2,
          playerRadius
        ),
        tempBody
      );

      // Check for intersections
      const intersections = collisionWorld.intersectionsWith(tempCollider);
      
      // Clean up temporary objects
      collisionWorld.removeRigidBody(tempBody);

      // Position is safe if no intersections found
      return intersections.length === 0;
    } catch (error) {
      console.warn('useSafeSpawn: Error checking position safety:', error);
      // Fallback: assume position is safe if we can't check
      return true;
    }
  }, [world, playerRadius, playerHeight]);

  // Find a safe spawn position using spiral search pattern
  const findSafeSpawnPosition = useCallback((
    centerPosition: [number, number, number] = [0, 0, 0]
  ): SafeSpawnResult => {
    if (!world) {
      return {
        position: centerPosition,
        isSafe: false,
        attempts: 0,
      };
    }

    tempVector.current.set(...centerPosition);
    const center = tempVector.current;
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
          testPosition.current.set(x, center.y + heightOffset, z);
          
          if (isPositionSafe(testPosition.current)) {
            const distance = center.distanceTo(testPosition.current);
            if (distance < bestDistance) {
              bestPosition = testPosition.current.clone();
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
      testPosition.current.set(center.x, y, center.z);
      if (isPositionSafe(testPosition.current)) {
        return {
          position: [testPosition.current.x, testPosition.current.y, testPosition.current.z] as [number, number, number],
          isSafe: true,
          attempts: attempts + 1,
        };
      }
    }

    // Last resort: spawn above the center
    fallbackPosition.current.set(
      center.x,
      center.y + searchHeight + playerHeight,
      center.z
    );

    return {
      position: [fallbackPosition.current.x, fallbackPosition.current.y, fallbackPosition.current.z] as [number, number, number],
      isSafe: false,
      attempts,
    };
  }, [world, isPositionSafe, maxAttempts, searchRadius, searchHeight, stepSize, playerHeight]);

  // Check if current position is safe and move if needed
  const ensureSafePosition = useCallback((
    currentPosition: [number, number, number],
    forceCheck: boolean = false
  ): SafeSpawnResult => {
    currentPosition.current.set(...currentPosition);
    const current = currentPosition.current;
    
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
