import React, { useState, useEffect } from "react";
import { RigidBody } from "@react-three/rapier";
// import { loadTextureFromImage } from "../../../../utils/textureUtils";

export interface PillarProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  height?: number;
  radius?: number;
  hasCap?: boolean;
  capColor?: string;
}

const Pillar: React.FC<PillarProps> = ({
  position = [0, 0, 0],
  color = "#8B4513",
  scale = 1,
  height = 3,
  radius = 0.3,
  hasCap = true,
  capColor = "#654321",
}) => {
  // Load stone texture for pillar
  // const [stoneTexture, setStoneTexture] = useState(null);

  // useEffect(() => {
  //   loadTextureFromImage("cobblestone")
  //     .then(setStoneTexture)
  //     .catch((error) =>
  //       console.error("Failed to load cobblestone texture:", error)
  //     );
  // }, []);

  return (
    <RigidBody position={position} scale={scale} type="fixed" colliders="hull">
      <group>
        {/* Main pillar body */}
        <mesh position={[0, height / 2, 0]}>
          <cylinderGeometry args={[radius, radius, height, 12]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Pillar cap */}
        {hasCap && (
          <mesh position={[0, height + 0.1, 0]}>
            <cylinderGeometry args={[radius * 1.2, radius * 1.2, 0.2, 12]} />
            <meshLambertMaterial color={capColor} />
          </mesh>
        )}

        {/* Decorative rings */}
        <mesh position={[0, height * 0.2, 0]}>
          <cylinderGeometry args={[radius * 1.05, radius * 1.05, 0.1, 12]} />
          <meshLambertMaterial color={capColor} />
        </mesh>
        <mesh position={[0, height * 0.8, 0]}>
          <cylinderGeometry args={[radius * 1.05, radius * 1.05, 0.1, 12]} />
          <meshLambertMaterial color={capColor} />
        </mesh>
      </group>
    </RigidBody>
  );
};

export default Pillar;
