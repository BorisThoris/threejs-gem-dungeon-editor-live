import React from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls, Environment } from "@react-three/drei";
import Skeleton from "./primitives/objects/Skeleton";

const SkeletonTest: React.FC = () => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
        <Environment preset="sunset" />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        <Physics gravity={[0, -9.81, 0]}>
          {/* Ground */}
          <RigidBody type="fixed" position={[0, -1, 0]}>
            <mesh>
              <boxGeometry args={[20, 0.5, 20]} />
              <meshLambertMaterial color="#8B4513" />
            </mesh>
          </RigidBody>

          {/* Test both skeleton types */}
          <Skeleton
            position={[-2, 2, 0]}
            color="#F5F5DC"
            isRagdoll={false}
            isAnimated={true}
          />

          <Skeleton position={[2, 2, 0]} color="#FF6B6B" isRagdoll={true} />

          {/* Test objects to interact with */}
          <RigidBody position={[0, 1, 0]} type="dynamic">
            <mesh>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshLambertMaterial color="#4ECDC4" />
            </mesh>
          </RigidBody>
        </Physics>

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
};

export default SkeletonTest;
