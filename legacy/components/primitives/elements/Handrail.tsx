import React from "react";
import { RigidBody } from "@react-three/rapier";
import { Box, Cylinder } from "@react-three/drei";
import * as THREE from "three";
import withOptionalBreaking from "../../withOptionalBreaking";

export interface HandrailProps {
  position: [number, number, number];
  length?: number;
  height?: number;
  material?: "wood" | "metal" | "stone" | "wrought_iron";
  style?: "simple" | "ornate" | "modern" | "rustic";
  color?: string;
  rotation?: [number, number, number];
  isCollidable?: boolean;
  hasPosts?: boolean;
  postCount?: number;
  postSpacing?: number;
  hasDecorative?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  // Prototype props
  prototypeId?: string;
  onPrototypeAction?: (action: string, data?: any) => void;
  // Breaking props
  enabled?: boolean;
  breakingOptions?: any;
  onBreak?: (impactPoint: THREE.Vector3) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}

const Handrail: React.FC<HandrailProps> = ({
  position,
  length = 4,
  height = 0.8,
  material = "wood",
  style = "simple",
  color,
  rotation = [0, 0, 0],
  isCollidable = true,
  hasPosts = true,
  postCount,
  postSpacing = 1,
  hasDecorative = false,
  onClick,
  onPointerOver,
  onPointerOut,
  prototypeId,
  onPrototypeAction,
}) => {
  // Material color configurations
  const getMaterialColor = () => {
    if (color) return color;

    switch (material) {
      case "wood":
        return style === "rustic" ? "#8B7355" : "#D2B48C";
      case "metal":
        return "#C0C0C0";
      case "stone":
        return "#A0A0A0";
      case "wrought_iron":
        return "#2F2F2F";
      default:
        return "#D2B48C";
    }
  };

  // Material properties
  const getMaterialProps = () => {
    const baseColor = getMaterialColor();

    return {
      color: baseColor,
      roughness: material === "metal" ? 0.2 : 0.6,
      metalness:
        material === "metal" || material === "wrought_iron" ? 0.8 : 0.1,
    };
  };

  // Calculate post positions
  const getPostPositions = () => {
    if (!hasPosts) return [];

    const count =
      postCount || Math.max(2, Math.floor(length / postSpacing) + 1);
    const positions = [];

    for (let i = 0; i < count; i++) {
      const x = (i / (count - 1)) * length - length / 2;
      positions.push(x);
    }

    return positions;
  };

  const handrailContent = (
    <group position={position} rotation={rotation}>
      {/* Main handrail */}
      <Box args={[length, 0.08, 0.08]}>
        <meshStandardMaterial {...getMaterialProps()} />
      </Box>

      {/* Posts */}
      {hasPosts &&
        getPostPositions().map((x, i) => (
          <group key={`post-${i}`}>
            {/* Post */}
            <Cylinder args={[0.03, 0.03, height]} position={[x, height / 2, 0]}>
              <meshStandardMaterial {...getMaterialProps()} />
            </Cylinder>

            {/* Post base */}
            <Cylinder args={[0.05, 0.05, 0.1]} position={[x, 0.05, 0]}>
              <meshStandardMaterial {...getMaterialProps()} />
            </Cylinder>

            {/* Post cap */}
            <Cylinder
              args={[0.04, 0.04, 0.05]}
              position={[x, height + 0.025, 0]}
            >
              <meshStandardMaterial {...getMaterialProps()} />
            </Cylinder>
          </group>
        ))}

      {/* Style-specific decorations */}
      {style === "ornate" && (
        <group>
          {/* Decorative elements along the rail */}
          {Array.from({ length: Math.floor(length * 2) }).map((_, i) => (
            <Box
              key={`ornament-${i}`}
              args={[0.05, 0.05, 0.05]}
              position={[
                (i / (Math.floor(length * 2) - 1)) * length - length / 2,
                0.04,
                0,
              ]}
            >
              <meshStandardMaterial
                color={material === "wrought_iron" ? "#FFD700" : "#8B4513"}
              />
            </Box>
          ))}
        </group>
      )}

      {style === "modern" && (
        <group>
          {/* Clean lines and minimal design */}
          <Box args={[length, 0.02, 0.02]} position={[0, -0.03, 0]}>
            <meshStandardMaterial {...getMaterialProps()} />
          </Box>
          <Box args={[length, 0.02, 0.02]} position={[0, 0.03, 0]}>
            <meshStandardMaterial {...getMaterialProps()} />
          </Box>
        </group>
      )}

      {style === "rustic" && material === "wood" && (
        <group>
          {/* Wood knots and natural imperfections */}
          {Array.from({ length: 3 }).map((_, i) => (
            <Box
              key={`knot-${i}`}
              args={[0.02, 0.02, 0.02]}
              position={[(Math.random() - 0.5) * length * 0.8, 0, 0]}
            >
              <meshStandardMaterial color="#654321" />
            </Box>
          ))}
        </group>
      )}

      {/* Decorative elements */}
      {hasDecorative && (
        <group>
          {/* Scrollwork for wrought iron */}
          {material === "wrought_iron" && (
            <group>
              {Array.from({ length: Math.floor(length) }).map((_, i) => (
                <Box
                  key={`scroll-${i}`}
                  args={[0.02, 0.15, 0.02]}
                  position={[
                    (i / (Math.floor(length) - 1)) * length - length / 2,
                    -0.075,
                    0,
                  ]}
                  rotation={[0, 0, Math.PI / 4]}
                >
                  <meshStandardMaterial color="#FFD700" />
                </Box>
              ))}
            </group>
          )}

          {/* Carved details for wood */}
          {material === "wood" && (
            <group>
              {Array.from({ length: Math.floor(length) }).map((_, i) => (
                <Box
                  key={`carving-${i}`}
                  args={[0.01, 0.03, 0.01]}
                  position={[
                    (i / (Math.floor(length) - 1)) * length - length / 2,
                    -0.015,
                    0,
                  ]}
                >
                  <meshStandardMaterial color="#8B4513" />
                </Box>
              ))}
            </group>
          )}
        </group>
      )}

      {/* Support brackets for long handrails */}
      {length > 3 && (
        <group>
          {Array.from({ length: Math.floor(length / 2) }).map((_, i) => (
            <Box
              key={`bracket-${i}`}
              args={[0.02, 0.1, 0.02]}
              position={[(i + 0.5) * 2 - length / 2, height / 2 - 0.05, 0]}
            >
              <meshStandardMaterial {...getMaterialProps()} />
            </Box>
          ))}
        </group>
      )}
    </group>
  );

  if (isCollidable) {
    return (
      <RigidBody type="fixed" position={position}>
        <mesh
          rotation={rotation}
          onClick={onClick}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        >
          {handrailContent}
        </mesh>
      </RigidBody>
    );
  }

  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {handrailContent}
    </mesh>
  );
};

// Create breakable version using HOC
const BreakableHandrail = withOptionalBreaking(Handrail, {
  breakingOptions: {
    fragmentCount: 3,
    fractureImpulse: 0.4,
    minSizeForFracture: 0.2,
    maxSizeForFracture: 0.6,
  },
});

export default BreakableHandrail;
