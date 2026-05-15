import React from "react";
import { RigidBody } from "@react-three/rapier";
import { Wall, Ceiling, Tile, Floor } from "../elements";

type ShapeType =
  | "square"
  | "circle"
  | "triangle"
  | "hexagon"
  | "octagon"
  | "diamond";

interface ShapedShellProps {
  size: number;
  shape?: ShapeType;
  colorFloor?: string;
  colorWall?: string;
}

const ShapedShell: React.FC<ShapedShellProps> = ({
  size,
  shape = "square",
  colorFloor = "#4a4a4a",
  colorWall = "#8B4513",
}) => {
  if (shape === "circle") {
    return (
      <group>
        {/* Floor using new Floor component */}
        <Floor
          position={[0, -0.5, 0]}
          size={size}
          height={1}
          shape="circle"
          color={colorFloor}
          material="stone"
          pattern="smooth"
          isCollidable={true}
          receiveShadow={true}
        />
        {/* Ring wall */}
        <mesh position={[0, 2, 0]} castShadow>
          <torusGeometry args={[size * 0.48, 0.4, 12, 96]} />
          <meshStandardMaterial color={colorWall} />
        </mesh>
      </group>
    );
  }

  // Polygonal shells approximated via segmented walls
  if (
    shape === "hexagon" ||
    shape === "octagon" ||
    shape === "diamond" ||
    shape === "triangle"
  ) {
    const sides =
      shape === "hexagon"
        ? 6
        : shape === "octagon"
        ? 8
        : shape === "triangle"
        ? 3
        : 4;
    const radius = size * 0.5;
    const wallLen = ((2 * Math.PI * radius) / sides) * 0.9;

    return (
      <group>
        {/* Floor using new Floor component */}
        <Floor
          position={[0, -0.5, 0]}
          size={size}
          height={1}
          shape={shape as any}
          color={colorFloor}
          material="stone"
          pattern="smooth"
          isCollidable={true}
          receiveShadow={true}
        />

        {/* Segmented walls */}
        <RigidBody type="fixed" colliders="cuboid">
          {Array.from({ length: sides }).map((_, i) => {
            const angle = (i / sides) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const rotY = angle + Math.PI / 2;
            return (
              <mesh
                key={i}
                position={[x, 2, z]}
                rotation={[0, rotY, 0]}
                receiveShadow
              >
                <boxGeometry args={[wallLen, 4, 0.5]} />
                <meshLambertMaterial color={colorWall} />
              </mesh>
            );
          })}
        </RigidBody>
      </group>
    );
  }

  // Default: square room
  return (
    <group>
      {/* Floor using new Floor component */}
      <Floor
        position={[0, -0.5, 0]}
        size={size}
        height={1}
        shape="square"
        color={colorFloor}
        material="stone"
        pattern="smooth"
        isCollidable={true}
        receiveShadow={true}
      />

      {/* Walls using Wall component */}
      <Wall
        position={[0, 2, -size / 2]}
        width={size}
        height={4}
        depth={0.5}
        material="stone"
        color={colorWall}
        isCollidable={true}
      />
      <Wall
        position={[0, 2, size / 2]}
        width={size}
        height={4}
        depth={0.5}
        material="stone"
        color={colorWall}
        isCollidable={true}
      />
      <Wall
        position={[size / 2, 2, 0]}
        width={0.5}
        height={4}
        depth={size}
        material="stone"
        color={colorWall}
        isCollidable={true}
      />
      <Wall
        position={[-size / 2, 2, 0]}
        width={0.5}
        height={4}
        depth={size}
        material="stone"
        color={colorWall}
        isCollidable={true}
      />
    </group>
  );
};

export default ShapedShell;
