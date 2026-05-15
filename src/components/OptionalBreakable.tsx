import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useBreaking } from "../hooks/useBreaking";
import type { BreakingOptions } from "../hooks/useBreaking";

interface OptionalBreakableProps {
  children: React.ReactNode;
  enabled?: boolean;
  breakingOptions?: BreakingOptions;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  disabled?: boolean;
  // Optional props for visual feedback
  showHoverEffect?: boolean;
  hoverColor?: string;
  originalColor?: string;
}

const OptionalBreakable: React.FC<OptionalBreakableProps> = ({
  children,
  enabled = false, // Disabled by default
  breakingOptions = {},
  onBreak,
  onFragmentClick,
  disabled = false,
  showHoverEffect = true,
  hoverColor = "#ff6b6b",
  originalColor = "#ffffff",
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [originalMaterials, setOriginalMaterials] = useState<THREE.Material[]>(
    []
  );

  const { fragments, isBroken, breakObject, reset } = useBreaking({
    ...breakingOptions,
    onFragmentCreated: (fragments) => {
      breakingOptions.onFragmentCreated?.(fragments);
    },
  });

  // Store original materials when component mounts
  React.useEffect(() => {
    if (groupRef.current && enabled) {
      const materials: THREE.Material[] = [];
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          materials.push(child.material);
        }
      });
      setOriginalMaterials(materials);
    }
  }, [enabled]);

  const handleClick = (event: React.MouseEvent) => {
    if (!enabled || disabled || isBroken) return;

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

  // Apply hover effect
  React.useEffect(() => {
    if (!enabled || !showHoverEffect || !groupRef.current) return;

    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        materials.forEach((material, index) => {
          if (material && "color" in material && material.color) {
            const materialKey = `material_${index}`;

            if (isHovered) {
              // Store original color if not already stored
              if (!child.userData[`originalColor_${materialKey}`]) {
                child.userData[`originalColor_${materialKey}`] =
                  material.color.getHexString();
              }
              material.color.setHex(parseInt(hoverColor.replace("#", ""), 16));
            } else {
              // Restore original color
              if (child.userData[`originalColor_${materialKey}`]) {
                material.color.setHex(
                  parseInt(child.userData[`originalColor_${materialKey}`], 16)
                );
              }
            }
          }
        });
      }
    });
  }, [isHovered, enabled, showHoverEffect, hoverColor]);

  // If breaking is not enabled, just render children normally
  if (!enabled) {
    return <>{children}</>;
  }

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
          position={[
            fragment.mesh.position.x,
            fragment.mesh.position.y,
            fragment.mesh.position.z,
          ]}
          rotation={[
            fragment.mesh.rotation.x,
            fragment.mesh.rotation.y,
            fragment.mesh.rotation.z,
          ]}
          onClick={(event: any) => {
            event.stopPropagation();
            handleFragmentClick(fragment.id);
          }}
          onPointerOver={() => {
            if (enabled) {
              document.body.style.cursor = "pointer";
            }
          }}
          onPointerOut={() => {
            document.body.style.cursor = "default";
          }}
        />
      ))}
    </group>
  );
};

export default OptionalBreakable;
