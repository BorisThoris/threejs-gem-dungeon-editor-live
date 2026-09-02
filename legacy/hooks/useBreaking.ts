import { useState, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ConvexObjectBreaker } from 'three/examples/jsm/misc/ConvexObjectBreaker.js';

// Global ConvexObjectBreaker instance
const convexBreaker = new ConvexObjectBreaker();

export interface Fragment {
  id: string;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  lifetime: number;
}

export interface BreakingOptions {
  fragmentCount?: number;
  fractureImpulse?: number;
  minSizeForFracture?: number;
  maxSizeForFracture?: number;
  onFragmentCreated?: (fragments: Fragment[]) => void;
  onFragmentDestroyed?: (fragmentId: string) => void;
}

export const useBreaking = (options: BreakingOptions = {}) => {
  const {
    fragmentCount = 4,
    fractureImpulse = 1.5,
    minSizeForFracture = 1,
    maxSizeForFracture = 2,
    onFragmentCreated,
    onFragmentDestroyed
  } = options;

  // External state snapshot for UI only; updated sparsely
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [isBroken, setIsBroken] = useState(false);
  const fragmentCounter = useRef(0);
  const fragmentsRef = useRef<Fragment[]>([]);
  const lastUiSyncMsRef = useRef(0);

  // Physics simulation for fragments (no React setState per frame)
  useFrame((state, delta) => {
    if (fragmentsRef.current.length === 0) return;

    const current = fragmentsRef.current;

    for (let i = current.length - 1; i >= 0; i--) {
      const fragment = current[i];
      // Apply gravity
      fragment.velocity.y -= 9.81 * delta;

      // Update position
      fragment.mesh.position.add(
        fragment.velocity.clone().multiplyScalar(delta)
      );

      // Update rotation
      fragment.mesh.rotation.x += fragment.angularVelocity.x * delta;
      fragment.mesh.rotation.y += fragment.angularVelocity.y * delta;
      fragment.mesh.rotation.z += fragment.angularVelocity.z * delta;

      // Update lifetime
      fragment.lifetime -= delta * 1000;

      // Remove expired fragments
      if (fragment.lifetime <= 0 || fragment.mesh.position.y < -10) {
        onFragmentDestroyed?.(fragment.id);
        current.splice(i, 1);
      }
    }

    // Throttle UI sync to ~10 Hz
    const nowMs = state.clock.elapsedTime * 1000;
    if (nowMs - lastUiSyncMsRef.current > 100) {
      lastUiSyncMsRef.current = nowMs;
      // Shallow copy for state consumers
      setFragments([...fragmentsRef.current]);
    }
  });

  const breakObject = useCallback((
    mesh: THREE.Mesh,
    impactPoint: THREE.Vector3,
    impactNormal: THREE.Vector3
  ) => {
    if (isBroken) return;

    try {
      // Prepare the mesh for breaking
      convexBreaker.prepareBreakableObject(
        mesh,
        1, // mass
        new THREE.Vector3(), // velocity
        new THREE.Vector3(), // angularVelocity
        true // enable breaking
      );

      // Create fragments using ConvexObjectBreaker
      const debris = convexBreaker.subdivideByImpact(
        mesh,
        impactPoint,
        impactNormal,
        minSizeForFracture,
        maxSizeForFracture
      );

      if (debris.length > 0) {
        // Get the original object's world position
        const originalPosition = new THREE.Vector3();
        mesh.getWorldPosition(originalPosition);
        
        // Convert debris to fragments with physics
        const newFragments: Fragment[] = debris.map((debrisMesh, index) => {
          // Position the fragment at the original object's location with slight random offset
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
          );
          debrisMesh.position.copy(originalPosition).add(offset);
          
          const fragment: Fragment = {
            id: `fragment_${fragmentCounter.current++}`,
            mesh: debrisMesh as THREE.Mesh,
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 10,
              Math.random() * 5 + 2,
              (Math.random() - 0.5) * 10
            ),
            angularVelocity: new THREE.Vector3(
              (Math.random() - 0.5) * 10,
              (Math.random() - 0.5) * 10,
              (Math.random() - 0.5) * 10
            ),
            lifetime: 8000 + Math.random() * 4000 // 8-12 seconds
          };

          return fragment;
        });

        // Update ref immediately; UI will sync on next throttle
        fragmentsRef.current = [...fragmentsRef.current, ...newFragments];
        // Also push a one-time state update so consumers can react to spawn
        setFragments(fragmentsRef.current.slice());
        setIsBroken(true);
        
        onFragmentCreated?.(newFragments);
        
        console.log(`Created ${newFragments.length} fragments`);
      }
    } catch (error) {
      console.error('Error breaking object:', error);
    }
  }, [isBroken, minSizeForFracture, maxSizeForFracture, onFragmentCreated]);

  const reset = useCallback(() => {
    fragmentsRef.current = [];
    setFragments([]);
    setIsBroken(false);
  }, []);

  return {
    fragments,
    isBroken,
    breakObject,
    reset
  };
};
