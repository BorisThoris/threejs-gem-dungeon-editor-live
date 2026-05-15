import React from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls, Environment, Text } from "@react-three/drei";
import Skeleton from "./primitives/objects/Skeleton";

const SkeletonDebug: React.FC = () => {
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

          {/* Debug skeleton with labels */}
          <group position={[0, 2, 0]}>
            <Skeleton
              position={[0, 0, 0]}
              color="#F5F5DC"
              isRagdoll={false}
              isAnimated={true}
            />

            {/* Debug labels */}
            <Text position={[0, 2.2, 0]} fontSize={0.2} color="red">
              HEAD
            </Text>
            <Text position={[0, 1.6, 0]} fontSize={0.15} color="blue">
              SPINE
            </Text>
            <Text position={[0, 0.8, 0]} fontSize={0.15} color="green">
              PELVIS
            </Text>
            <Text position={[0, 0.4, 0]} fontSize={0.15} color="yellow">
              LEGS
            </Text>
            <Text position={[0, -0.2, 0]} fontSize={0.15} color="orange">
              FEET
            </Text>
          </group>

          {/* Ragdoll skeleton */}
          <group position={[3, 2, 0]}>
            <Skeleton position={[0, 0, 0]} color="#FF6B6B" isRagdoll={true} />

            {/* Debug labels for ragdoll */}
            <Text position={[0, 2.2, 0]} fontSize={0.2} color="red">
              RAGDOLL HEAD
            </Text>
          </group>
        </Physics>

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
};

export default SkeletonDebug;
