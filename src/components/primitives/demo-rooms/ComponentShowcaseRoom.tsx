import React from "react";
import {
  BreakableTile,
  BreakablePlank,
  BreakableWall,
  BreakableCeiling,
  BreakableStair,
  BreakableHandrail,
  Plank,
  Tile,
  Wall,
  Ceiling,
  Stair,
  Handrail,
} from "../elements";

interface ComponentShowcaseRoomProps {
  roomSize?: number;
}

const ComponentShowcaseRoom: React.FC<ComponentShowcaseRoomProps> = ({
  roomSize = 12,
}) => {
  return (
    <group>
      {/* Floor with different tile patterns */}
      <group>
        {/* Stone tiles in the center */}
        {Array.from({ length: 4 }).map((_, x) =>
          Array.from({ length: 4 }).map((_, z) => (
            <BreakableTile
              key={`stone-${x}-${z}`}
              position={[x - 1.5, -0.5, z - 1.5]}
              size={1}
              height={0.1}
              material="stone"
              pattern="tiled"
              color="#A0A0A0"
              enabled={false}
            />
          ))
        )}

        {/* Wood planks around the edges */}
        {Array.from({ length: 8 }).map((_, i) => (
          <Plank
            key={`plank-${i}`}
            position={[i - 3.5, -0.45, -2]}
            length={1.5}
            width={0.2}
            height={0.05}
            woodType="oak"
            finish="smooth"
            hasGrain={true}
            hasNails={true}
          />
        ))}

        {/* Marble tiles for luxury area */}
        <Tile
          position={[3, -0.4, 3]}
          size={2}
          height={0.15}
          material="marble"
          pattern="polished"
          color="#F5F5F5"
        />
      </group>

      {/* Walls with different materials */}
      <Wall
        position={[0, 2, -roomSize / 2]}
        width={roomSize}
        height={4}
        depth={0.5}
        material="stone"
        texture="weathered"
        color="#8B7355"
        hasWindows={true}
        windowCount={2}
      />

      <Wall
        position={[0, 2, roomSize / 2]}
        width={roomSize}
        height={4}
        depth={0.5}
        material="brick"
        texture="weathered"
        color="#8B4513"
        hasDoors={true}
        doorWidth={2}
      />

      <Wall
        position={[roomSize / 2, 2, 0]}
        width={0.5}
        height={4}
        depth={roomSize}
        material="wood"
        texture="rough"
        color="#D2B48C"
      />

      <Wall
        position={[-roomSize / 2, 2, 0]}
        width={0.5}
        height={4}
        depth={roomSize}
        material="metal"
        texture="smooth"
        color="#C0C0C0"
      />

      {/* Ceiling with different styles */}
      <Ceiling
        position={[0, 4.5, 0]}
        width={roomSize}
        height={0.3}
        depth={roomSize}
        material="wood"
        style="beamed"
        color="#D2B48C"
        hasLighting={true}
        lightCount={4}
      />

      {/* Stairs showcase */}
      <group position={[4, 0, 0]}>
        {/* Stone stairs */}
        {Array.from({ length: 5 }).map((_, i) => (
          <Stair
            key={`stone-stair-${i}`}
            position={[0, i * 0.2, i * 0.3]}
            width={1.5}
            height={0.2}
            depth={0.5}
            material="stone"
            style="solid"
            hasRailing={true}
            hasTreads={true}
          />
        ))}

        {/* Handrail for stairs */}
        <Handrail
          position={[0.8, 0.5, 0.6]}
          length={2}
          height={0.8}
          material="wood"
          style="simple"
          hasPosts={true}
          postCount={3}
        />
      </group>

      {/* Wooden stairs */}
      <group position={[-4, 0, 0]}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Stair
            key={`wood-stair-${i}`}
            position={[0, i * 0.25, i * 0.4]}
            width={1.2}
            height={0.25}
            depth={0.6}
            material="wood"
            style="open"
            hasRailing={false}
            hasTreads={true}
          />
        ))}
      </group>

      {/* Spiral stairs */}
      <group position={[0, 0, 4]}>
        <Stair
          position={[0, 0, 0]}
          width={2}
          height={2}
          depth={2}
          material="marble"
          style="spiral"
          hasRailing={true}
        />
      </group>

      {/* Different plank arrangements */}
      <group position={[0, 0, -4]}>
        {/* Horizontal planks */}
        {Array.from({ length: 6 }).map((_, i) => (
          <Plank
            key={`horizontal-plank-${i}`}
            position={[i - 2.5, 0.1, 0]}
            length={1}
            width={0.15}
            height={0.05}
            woodType="pine"
            finish="rough"
            hasGrain={true}
          />
        ))}

        {/* Vertical planks */}
        {Array.from({ length: 4 }).map((_, i) => (
          <Plank
            key={`vertical-plank-${i}`}
            position={[0, 0.1, i - 1.5]}
            length={0.15}
            width={1}
            height={0.05}
            woodType="mahogany"
            finish="polished"
            hasGrain={true}
            hasNails={true}
          />
        ))}
      </group>

      {/* Decorative handrails */}
      <Handrail
        position={[0, 1, -2]}
        length={6}
        height={0.6}
        material="wrought_iron"
        style="ornate"
        hasPosts={true}
        postCount={4}
        hasDecorative={true}
      />

      {/* Different tile materials showcase */}
      <group position={[2, 0.1, 0]}>
        <Tile
          position={[0, 0, 0]}
          size={0.8}
          height={0.05}
          material="brick"
          pattern="tiled"
          color="#CD5C5C"
        />
        <Tile
          position={[1, 0, 0]}
          size={0.8}
          height={0.05}
          material="metal"
          pattern="smooth"
          color="#C0C0C0"
        />
        <Tile
          position={[2, 0, 0]}
          size={0.8}
          height={0.05}
          material="carpet"
          pattern="smooth"
          color="#8B4513"
        />
        <Tile
          position={[0, 0, 1]}
          size={0.8}
          height={0.05}
          material="concrete"
          pattern="rough"
          color="#D3D3D3"
        />
      </group>
    </group>
  );
};

export default ComponentShowcaseRoom;
