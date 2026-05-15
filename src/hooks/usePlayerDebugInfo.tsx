import { Text } from "@react-three/drei";

interface UsePlayerDebugInfoProps {
  showDebugInfo: boolean;
  spawnInfo: {
    isSafe: boolean;
    attempts: number;
    position: [number, number, number];
  } | null;
  spawnPosition: [number, number, number];
}

export const usePlayerDebugInfo = ({
  showDebugInfo,
  spawnInfo,
  spawnPosition,
}: UsePlayerDebugInfoProps) => {
  if (!showDebugInfo || !spawnInfo) return null;

  return (
    <group position={[0, 3, 0]}>
      <Text
        position={[0, 0, 0]}
        fontSize={0.3}
        color={spawnInfo.isSafe ? "#00ff00" : "#ff0000"}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        Initial Spawn: {spawnInfo.isSafe ? "SAFE" : "UNSAFE"}
      </Text>
      <Text
        position={[0, -0.4, 0]}
        fontSize={0.2}
        color="#cccccc"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        Search Attempts: {spawnInfo.attempts}
      </Text>
      <Text
        position={[0, -0.7, 0]}
        fontSize={0.2}
        color="#cccccc"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        Spawn Pos: {spawnInfo.position.map((p) => p.toFixed(1)).join(", ")}
      </Text>
      <Text
        position={[0, -1.0, 0]}
        fontSize={0.2}
        color="#ffff00"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        Physics Body: {spawnPosition.map((p) => p.toFixed(1)).join(", ")}
      </Text>
    </group>
  );
};

