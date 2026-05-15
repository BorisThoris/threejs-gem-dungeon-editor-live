import { useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';

interface DisposableObject {
  dispose?: () => void;
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
  texture?: THREE.Texture;
}

export const useThreeDisposal = () => {
  const disposables = useRef<Set<DisposableObject>>(new Set());

  const addDisposable = (obj: DisposableObject) => {
    disposables.current.add(obj);
  };

  const removeDisposable = (obj: DisposableObject) => {
    disposables.current.delete(obj);
  };

  const disposeObject = useCallback((obj: DisposableObject) => {
    try {
      // Dispose geometry
      if (obj.geometry) {
        obj.geometry.dispose();
      }

      // Dispose material(s)
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(mat => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }

      // Dispose texture
      if (obj.texture) {
        obj.texture.dispose();
      }

      // Call custom dispose method
      if (obj.dispose) {
        obj.dispose();
      }
    } catch (error) {
      console.warn('Error disposing Three.js object:', error);
    }
  }, []);

  // Cleanup all disposables on unmount
  useEffect(() => {
    const currentDisposables = disposables.current;
    return () => {
      currentDisposables.forEach(disposeObject);
      currentDisposables.clear();
    };
  }, [disposeObject]);

  return {
    addDisposable,
    removeDisposable,
    disposeObject,
  };
};

// Hook for automatic disposal of Three.js objects
export const useAutoDisposal = <T extends DisposableObject>(
  factory: () => T,
  deps: React.DependencyList = []
): T => {
  const { addDisposable, removeDisposable } = useThreeDisposal();
  const objectRef = useRef<T | null>(null);
  const factoryRef = useRef(factory);

  // Update factory ref when deps change
  useEffect(() => {
    factoryRef.current = factory;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    // Dispose previous object
    if (objectRef.current) {
      removeDisposable(objectRef.current);
    }

    // Create new object
    const newObject = factoryRef.current();
    objectRef.current = newObject;
    addDisposable(newObject);

    return () => {
      if (objectRef.current) {
        removeDisposable(objectRef.current);
      }
    };
  }, [addDisposable, removeDisposable]);

  return objectRef.current!;
};
