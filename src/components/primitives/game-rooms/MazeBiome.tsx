import React, { useMemo } from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import useGameStore from "../../../store/gameStore";
import { getMazeDimensions } from "../../../utils/biomeScaling";
import MazeReward from "../objects/MazeReward";

interface MazeBiomeProps {
  size?: number;
  onNavigate?: () => void;
}

interface MazeCell {
  x: number;
  z: number;
  walls: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
  visited: boolean;
}

// Recursive backtracking maze generation algorithm with 4 entrances
function generateMaze(gridWidth: number, gridHeight: number): MazeCell[][] {
  const maze: MazeCell[][] = [];

  // Initialize maze grid
  for (let z = 0; z < gridHeight; z++) {
    maze[z] = [];
    for (let x = 0; x < gridWidth; x++) {
      maze[z][x] = {
        x,
        z,
        walls: { north: true, south: true, east: true, west: true },
        visited: false,
      };
    }
  }

  const stack: MazeCell[] = [];
  const startCell = maze[Math.floor(gridHeight / 2)][Math.floor(gridWidth / 2)];
  startCell.visited = true;
  stack.push(startCell);

  const directions = [
    { dx: 0, dz: -1, wall: "north" as const, opposite: "south" as const },
    { dx: 0, dz: 1, wall: "south" as const, opposite: "north" as const },
    { dx: 1, dz: 0, wall: "east" as const, opposite: "west" as const },
    { dx: -1, dz: 0, wall: "west" as const, opposite: "east" as const },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];

    // Find unvisited neighbors
    const unvisitedNeighbors: Array<{
      cell: MazeCell;
      dir: (typeof directions)[0];
    }> = [];

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const nz = current.z + dir.dz;

      if (nx >= 0 && nx < gridWidth && nz >= 0 && nz < gridHeight) {
        const neighbor = maze[nz][nx];
        if (!neighbor.visited) {
          unvisitedNeighbors.push({ cell: neighbor, dir });
        }
      }
    }

    if (unvisitedNeighbors.length > 0) {
      // Choose random unvisited neighbor
      const chosen =
        unvisitedNeighbors[
          Math.floor(Math.random() * unvisitedNeighbors.length)
        ];

      // Remove walls between current and chosen
      current.walls[chosen.dir.wall] = false;
      chosen.cell.walls[chosen.dir.opposite] = false;

      // Mark chosen as visited and push to stack
      chosen.cell.visited = true;
      stack.push(chosen.cell);
    } else {
      // Backtrack
      stack.pop();
    }
  }

  // Create 4 entrances (one on each side at midpoint)
  const midX = Math.floor(gridWidth / 2);
  const midZ = Math.floor(gridHeight / 2);

  // North entrance
  if (gridHeight > 0) {
    maze[0][midX].walls.north = false;
  }

  // South entrance
  if (gridHeight > 0) {
    maze[gridHeight - 1][midX].walls.south = false;
  }

  // East entrance
  if (gridWidth > 0) {
    maze[midZ][gridWidth - 1].walls.east = false;
  }

  // West entrance
  if (gridWidth > 0) {
    maze[midZ][0].walls.west = false;
  }

  return maze;
}

const MazeBiome: React.FC<MazeBiomeProps> = ({ size = 20, onNavigate }) => {
  const playerDimensions = useGameStore(
    (state) => state.playerStats.dimensions
  );

  const mazeDims = getMazeDimensions(size, playerDimensions);

  // Calculate grid dimensions based on size and path width
  const cellSize = mazeDims.pathWidth + mazeDims.wallThickness;
  const gridWidth = Math.max(3, Math.floor(size / cellSize));
  const gridHeight = Math.max(3, Math.floor(size / cellSize));

  const wallThickness = mazeDims.wallThickness;
  const wallHeight = mazeDims.wallHeight;
  const pathWidth = mazeDims.pathWidth;

  // Generate maze using memoization to avoid regenerating on every render
  const maze = useMemo(
    () => generateMaze(gridWidth, gridHeight),
    [gridWidth, gridHeight]
  );

  // Calculate maze bounds for centering
  const mazeWidth = gridWidth * cellSize;
  const mazeDepth = gridHeight * cellSize;
  const offsetX = -mazeWidth / 2 + cellSize / 2;
  const offsetZ = -mazeDepth / 2 + cellSize / 2;

  return (
    <group>
      {/* Generate maze walls from the maze grid */}
      {maze.map((row, z) =>
        row.map((cell, x) => {
          const cellX = offsetX + x * cellSize;
          const cellZ = offsetZ + z * cellSize;

          return (
            <group key={`${x}-${z}`}>
              {/* North wall */}
              {cell.walls.north && (
                <RigidBody
                  type="fixed"
                  position={[
                    cellX,
                    wallHeight / 2,
                    cellZ - pathWidth / 2 - wallThickness / 2,
                  ]}
                >
                  <mesh castShadow>
                    <boxGeometry
                      args={[
                        pathWidth + wallThickness * 2,
                        wallHeight,
                        wallThickness,
                      ]}
                    />
                    <meshStandardMaterial color="#8D6E63" />
                  </mesh>
                </RigidBody>
              )}

              {/* South wall */}
              {cell.walls.south && (
                <RigidBody
                  type="fixed"
                  position={[
                    cellX,
                    wallHeight / 2,
                    cellZ + pathWidth / 2 + wallThickness / 2,
                  ]}
                >
                  <mesh castShadow>
                    <boxGeometry
                      args={[
                        pathWidth + wallThickness * 2,
                        wallHeight,
                        wallThickness,
                      ]}
                    />
                    <meshStandardMaterial color="#8D6E63" />
                  </mesh>
                </RigidBody>
              )}

              {/* East wall */}
              {cell.walls.east && (
                <RigidBody
                  type="fixed"
                  position={[
                    cellX + pathWidth / 2 + wallThickness / 2,
                    wallHeight / 2,
                    cellZ,
                  ]}
                >
                  <mesh castShadow>
                    <boxGeometry
                      args={[
                        wallThickness,
                        wallHeight,
                        pathWidth + wallThickness * 2,
                      ]}
                    />
                    <meshStandardMaterial color="#8D6E63" />
                  </mesh>
                </RigidBody>
              )}

              {/* West wall */}
              {cell.walls.west && (
                <RigidBody
                  type="fixed"
                  position={[
                    cellX - pathWidth / 2 - wallThickness / 2,
                    wallHeight / 2,
                    cellZ,
                  ]}
                >
                  <mesh castShadow>
                    <boxGeometry
                      args={[
                        wallThickness,
                        wallHeight,
                        pathWidth + wallThickness * 2,
                      ]}
                    />
                    <meshStandardMaterial color="#8D6E63" />
                  </mesh>
                </RigidBody>
              )}

              {/* Corner pillars for visual consistency */}
              <RigidBody
                type="fixed"
                position={[
                  cellX - pathWidth / 2 - wallThickness / 2,
                  wallHeight / 2,
                  cellZ - pathWidth / 2 - wallThickness / 2,
                ]}
              >
                <mesh castShadow>
                  <boxGeometry
                    args={[wallThickness, wallHeight, wallThickness]}
                  />
                  <meshStandardMaterial color="#A1887F" />
                </mesh>
              </RigidBody>
            </group>
          );
        })
      )}

      {/* Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[size, 1, size]} />
          <meshStandardMaterial color="#5D4037" />
        </mesh>
      </RigidBody>

      {/* Entrance markers on all 4 sides */}
      {/* North entrance */}
      <mesh
        position={[
          offsetX + Math.floor(gridWidth / 2) * cellSize,
          0.1,
          offsetZ - cellSize / 2,
        ]}
      >
        <cylinderGeometry args={[0.3, 0.3, 0.2]} />
        <meshStandardMaterial
          color="#4CAF50"
          emissive="#4CAF50"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* South entrance */}
      <mesh
        position={[
          offsetX + Math.floor(gridWidth / 2) * cellSize,
          0.1,
          offsetZ + (gridHeight - 1) * cellSize + cellSize / 2,
        ]}
      >
        <cylinderGeometry args={[0.3, 0.3, 0.2]} />
        <meshStandardMaterial
          color="#4CAF50"
          emissive="#4CAF50"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* East entrance */}
      <mesh
        position={[
          offsetX + (gridWidth - 1) * cellSize + cellSize / 2,
          0.1,
          offsetZ + Math.floor(gridHeight / 2) * cellSize,
        ]}
      >
        <cylinderGeometry args={[0.3, 0.3, 0.2]} />
        <meshStandardMaterial
          color="#4CAF50"
          emissive="#4CAF50"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* West entrance */}
      <mesh
        position={[
          offsetX - cellSize / 2,
          0.1,
          offsetZ + Math.floor(gridHeight / 2) * cellSize,
        ]}
      >
        <cylinderGeometry args={[0.3, 0.3, 0.2]} />
        <meshStandardMaterial
          color="#4CAF50"
          emissive="#4CAF50"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Central Reward */}
      <MazeReward
        position={[0, 0, 0]}
        rewardType="treasure"
        onClaim={() => {
          console.log("Maze reward claimed!");
          onNavigate?.();
        }}
      />

      {/* Maze Title */}
      <Text
        position={[0, wallHeight + 1, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        🌀 MAZE BIOME 🌀
      </Text>

      {/* Instructions */}
      <Text
        position={[0, wallHeight + 0.3, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        Navigate from green to red marker
      </Text>

      {/* Maze Info */}
      <Text
        position={[0, wallHeight - 0.3, 0]}
        fontSize={0.3}
        color="#00ff00"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {`${gridWidth}x${gridHeight} Maze`}
      </Text>
    </group>
  );
};

export default MazeBiome;
