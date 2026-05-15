import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { OrbitControls, Environment } from "@react-three/drei";
import Skeleton from "./primitives/objects/Skeleton";

const SkeletonDemo: React.FC = () => {
  const [showRagdoll, setShowRagdoll] = useState(false);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 1000 }}>
        <button
          onClick={() => setShowRagdoll(!showRagdoll)}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: showRagdoll ? "#ff6b6b" : "#4ecdc4",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          {showRagdoll
            ? "Switch to Regular Skeleton"
            : "Switch to Ragdoll Skeleton"}
        </button>
        <div style={{ marginTop: "10px", color: "white", fontSize: "14px" }}>
          {showRagdoll
            ? "Ragdoll Mode - Individual body parts with physics"
            : "Regular Mode - Fixed head position"}
        </div>
      </div>

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

          {/* Regular Skeleton */}
          {!showRagdoll && (
            <Skeleton
              position={[0, 0, 0]}
              color="#F5F5DC"
              isAnimated={true}
              health={50}
            />
          )}

          {/* Ragdoll Skeleton */}
          {showRagdoll && (
            <Skeleton
              position={[0, 2, 0]}
              color="#FF6B6B"
              isRagdoll={true}
              health={50}
            />
          )}

          {/* Test objects to interact with */}
          <RigidBody position={[3, 1, 0]} type="dynamic">
            <mesh>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshLambertMaterial color="#4ECDC4" />
            </mesh>
          </RigidBody>

          <RigidBody position={[-3, 1, 0]} type="dynamic">
            <mesh>
              <sphereGeometry args={[0.3]} />
              <meshLambertMaterial color="#45B7D1" />
            </mesh>
          </RigidBody>
        </Physics>

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
};

export default SkeletonDemo;
