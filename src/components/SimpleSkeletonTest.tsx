import React from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls, Environment, Text } from "@react-three/drei";

const SimpleSkeletonTest: React.FC = () => {
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

          {/* Simple skeleton structure for debugging */}
          <group position={[0, 2, 0]}>
            {/* Head - should be at the top */}
            <mesh position={[0, 1.8, 0]}>
              <sphereGeometry args={[0.2, 8, 6]} />
              <meshLambertMaterial color="#FF0000" />
            </mesh>
            <Text position={[0, 2.2, 0]} fontSize={0.2} color="red">
              HEAD
            </Text>

            {/* Spine */}
            <mesh position={[0, 1.2, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
              <meshLambertMaterial color="#00FF00" />
            </mesh>
            <Text position={[0, 1.6, 0]} fontSize={0.15} color="green">
              SPINE
            </Text>

            {/* Pelvis */}
            <mesh position={[0, 0.7, 0]}>
              <boxGeometry args={[0.3, 0.2, 0.15]} />
              <meshLambertMaterial color="#0000FF" />
            </mesh>
            <Text position={[0, 0.8, 0]} fontSize={0.15} color="blue">
              PELVIS
            </Text>

            {/* Legs */}
            <mesh position={[-0.1, 0.2, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
              <meshLambertMaterial color="#FFFF00" />
            </mesh>
            <mesh position={[0.1, 0.2, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
              <meshLambertMaterial color="#FFFF00" />
            </mesh>
            <Text position={[0, 0.4, 0]} fontSize={0.15} color="yellow">
              LEGS
            </Text>

            {/* Feet */}
            <mesh position={[-0.1, -0.2, 0.1]}>
              <boxGeometry args={[0.1, 0.1, 0.2]} />
              <meshLambertMaterial color="#FF00FF" />
            </mesh>
            <mesh position={[0.1, -0.2, 0.1]}>
              <boxGeometry args={[0.1, 0.1, 0.2]} />
              <meshLambertMaterial color="#FF00FF" />
            </mesh>
            <Text position={[0, -0.1, 0]} fontSize={0.15} color="magenta">
              FEET
            </Text>
          </group>
        </Physics>

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
};

export default SimpleSkeletonTest;
