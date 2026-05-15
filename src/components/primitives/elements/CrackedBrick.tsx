import React, { useMemo, useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
import { loadTextureFromImage } from "../../../utils/textureUtils";
import withOptionalBreaking from "../../withOptionalBreaking";

export interface CrackedBrickProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  crackIntensity?: "light" | "medium" | "heavy";
  size?: [number, number, number];
  // Breaking props
  enabled?: boolean;
  breakingOptions?: any;
  onBreak?: (impactPoint: any) => void;
  onFragmentClick?: (fragmentId: string) => void;
  showHoverEffect?: boolean;
  hoverColor?: string;
}

const CrackedBrick: React.FC<CrackedBrickProps> = ({
  position = [0, 0, 0],
  color = "#8B4513",
  scale = 1,
  crackIntensity = "medium",
  size = [1, 0.5, 0.5],
  enabled = false,
  breakingOptions,
  onBreak,
  onFragmentClick,
  showHoverEffect = true,
  hoverColor = "#ff6b6b",
}) => {
  const getCrackDetails = () => {
    switch (crackIntensity) {
      case "light":
        return {
          color: "#A0522D",
          roughness: 0.7,
          crackCount: 2,
          crackWidth: 0.01,
          description: "Lightly cracked brick with minor damage",
        };
      case "heavy":
        return {
          color: "#654321",
          roughness: 0.9,
          crackCount: 6,
          crackWidth: 0.02,
          description: "Heavily cracked brick with severe damage",
        };
      default: // medium
        return {
          color: "#8B4513",
          roughness: 0.8,
          crackCount: 4,
          crackWidth: 0.015,
          description: "Moderately cracked brick with visible damage",
        };
    }
  };

  const details = getCrackDetails();

  // Load brick texture from image file
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    loadTextureFromImage("brick")
      .then(setTexture)
      .catch((error) => console.error("Failed to load brick texture:", error));
  }, []);

  // Generate crack positions
  const crackPositions = useMemo(() => {
    const cracks = [];
    for (let i = 0; i < details.crackCount; i++) {
      // Random crack direction and position
      const isVertical = Math.random() > 0.5;
      const crackLength = 0.3 + Math.random() * 0.4; // 30-70% of brick size
      const startX = (Math.random() - 0.5) * size[0] * 0.8;
      const startY = (Math.random() - 0.5) * size[1] * 0.8;
      const startZ = (Math.random() - 0.5) * size[2] * 0.8;

      cracks.push({
        id: `crack-${i}`,
        isVertical,
        length: crackLength,
        position: [startX, startY, startZ] as [number, number, number],
        rotation: Math.random() * Math.PI * 0.5, // Random rotation
      });
    }
    return cracks;
  }, [details.crackCount, size]);

  return (
    <RigidBody
      position={position}
      scale={scale}
      type="dynamic"
      colliders="hull"
    >
      <group>
        {/* Main brick body */}
        <mesh position={[0, size[1] / 2, 0]}>
          <boxGeometry args={size} />
          <meshLambertMaterial
            color={details.color}
            roughness={details.roughness}
            map={texture}
          />
        </mesh>

        {/* Crack lines */}
        {crackPositions.map((crack) => (
          <mesh
            key={crack.id}
            position={[
              crack.position[0],
              crack.position[1] + size[1] / 2,
              crack.position[2] + size[2] / 2 + 0.01,
            ]}
            rotation={[0, 0, crack.rotation]}
          >
            <boxGeometry
              args={[
                crack.isVertical ? details.crackWidth : crack.length,
                crack.isVertical ? crack.length : details.crackWidth,
                0.01,
              ]}
            />
            <meshLambertMaterial color="#2F2F2F" transparent opacity={0.8} />
          </mesh>
        ))}

        {/* Additional weathering effects for heavy cracks */}
        {crackIntensity === "heavy" && (
          <>
            {/* Chipped edges */}
            <mesh position={[size[0] / 2 - 0.05, size[1] / 2, 0]}>
              <boxGeometry args={[0.05, size[1] * 0.3, size[2] * 0.8]} />
              <meshLambertMaterial color="#654321" roughness={0.9} />
            </mesh>
            <mesh position={[-size[0] / 2 + 0.05, size[1] / 2, 0]}>
              <boxGeometry args={[0.05, size[1] * 0.4, size[2] * 0.7]} />
              <meshLambertMaterial color="#654321" roughness={0.9} />
            </mesh>

            {/* Moss patches in cracks */}
            {crackPositions.slice(0, 2).map((crack, i) => (
              <mesh
                key={`moss-${i}`}
                position={[
                  crack.position[0] + (Math.random() - 0.5) * 0.1,
                  crack.position[1] + size[1] / 2 + (Math.random() - 0.5) * 0.1,
                  crack.position[2] + size[2] / 2 + 0.02,
                ]}
              >
                <boxGeometry args={[0.03, 0.03, 0.01]} />
                <meshLambertMaterial color="#228B22" roughness={0.8} />
              </mesh>
            ))}
          </>
        )}

        {/* Dust particles for medium and heavy cracks */}
        {(crackIntensity === "medium" || crackIntensity === "heavy") && (
          <>
            {Array.from({ length: crackIntensity === "heavy" ? 8 : 4 }).map(
              (_, i) => (
                <mesh
                  key={`dust-${i}`}
                  position={[
                    (Math.random() - 0.5) * size[0] * 0.9,
                    (Math.random() - 0.5) * size[1] * 0.9 + size[1] / 2,
                    (Math.random() - 0.5) * size[2] * 0.9 + size[2] / 2 + 0.01,
                  ]}
                >
                  <sphereGeometry args={[0.01, 4, 4]} />
                  <meshLambertMaterial
                    color="#D2B48C"
                    transparent
                    opacity={0.6}
                  />
                </mesh>
              )
            )}
          </>
        )}
      </group>
    </RigidBody>
  );
};

// Create breakable version using HOC
const BreakableCrackedBrick = withOptionalBreaking(CrackedBrick, {
  breakingOptions: {
    fragmentCount: 8,
    fractureImpulse: 0.8, // Easier to break than regular brick
    minSizeForFracture: 0.3,
    maxSizeForFracture: 0.8,
  },
});

export default BreakableCrackedBrick;

