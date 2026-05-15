import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useBreaking, type BreakingOptions } from "../hooks";

interface BreakableMeshProps {
  children: React.ReactNode;
  breakingOptions?: BreakingOptions;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  disabled?: boolean;
}

const BreakableMesh: React.FC<BreakableMeshProps> = ({
  children,
  breakingOptions = {},
  onBreak,
  onFragmentClick,
  disabled = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  const { fragments, isBroken, breakObject, reset } = useBreaking({
    ...breakingOptions,
    onFragmentCreated: (fragments) => {
      breakingOptions.onFragmentCreated?.(fragments);
    },
  });

  const handleClick = (event: React.MouseEvent) => {
    if (disabled || isBroken) return;

    event.stopPropagation();

    const impactPoint = event.point;
    const impactNormal = new THREE.Vector3()
      .subVectors(impactPoint, event.object.position)
      .normalize();

    breakObject(event.object as THREE.Mesh, impactPoint, impactNormal);
    onBreak?.(impactPoint);
  };

  const handleFragmentClick = (fragmentId: string) => {
    onFragmentClick?.(fragmentId);
  };

  // Reset when disabled changes
  React.useEffect(() => {
    if (disabled) {
      reset();
    }
  }, [disabled, reset]);

  return (
    <group ref={groupRef}>
      {/* Original object - hidden when broken */}
      {!isBroken && (
        <group
          onClick={handleClick}
          onPointerOver={() => setIsHovered(true)}
          onPointerOut={() => setIsHovered(false)}
        >
          {children}
        </group>
      )}

      {/* Render fragments */}
      {fragments.map((fragment) => (
        <primitive
          key={fragment.id}
          object={fragment.mesh}
          onClick={(event: any) => {
            event.stopPropagation();
            handleFragmentClick(fragment.id);
          }}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        />
      ))}
    </group>
  );
};

export default BreakableMesh;
