import React from "react";
import { Box } from "@react-three/drei";

interface OptionalBreakingDemoProps {
  size?: number;
}

const OptionalBreakingDemo: React.FC<OptionalBreakingDemoProps> = ({
  size = 10,
}) => {
  return (
    <group>
      <Box args={[size, size, size]} position={[0, 0, 0]}>
        <meshStandardMaterial color="orange" />
      </Box>
    </group>
  );
};

export default OptionalBreakingDemo;
