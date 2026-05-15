import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { Physics as RapierPhysics, RigidBody } from "@react-three/rapier";
import PlayerHand from "./PlayerHand";

const HandDemo: React.FC = () => {
  const [gesture, setGesture] = useState<
    "idle" | "pointing" | "grabbing" | "waving"
  >("idle");
  const [showHand, setShowHand] = useState(true);
  const [followMouse, setFollowMouse] = useState(true);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Controls */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 10,
          background: "rgba(0,0,0,0.8)",
          padding: "20px",
          borderRadius: "10px",
          color: "white",
        }}
      >
        <h3>3D Hand Demo</h3>
        <div style={{ marginBottom: "10px" }}>
          <label>
            <input
              type="checkbox"
              checked={showHand}
              onChange={(e) => setShowHand(e.target.checked)}
            />
            Show Hand
          </label>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>
            <input
              type="checkbox"
              checked={followMouse}
              onChange={(e) => setFollowMouse(e.target.checked)}
            />
            Follow Mouse (Black & White style)
          </label>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Gesture: </label>
          <select
            value={gesture}
            onChange={(e) => setGesture(e.target.value as any)}
          >
            <option value="idle">Idle</option>
            <option value="pointing">Pointing</option>
            <option value="grabbing">Grabbing</option>
            <option value="waving">Waving</option>
          </select>
        </div>
      </div>

      {/* 3D Scene */}
      <Canvas camera={{ position: [2, 2, 2], fov: 60 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <Environment preset="sunset" />

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />

        <RapierPhysics>
          {/* Ground plane */}
          <RigidBody type="fixed">
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -1, 0]}
              receiveShadow
            >
              <planeGeometry args={[10, 10]} />
              <meshLambertMaterial color="#666666" />
            </mesh>
          </RigidBody>

          {/* Demo objects with physics */}
          <RigidBody position={[1, 0, 0]} type="dynamic" mass={1}>
            <mesh castShadow userData={{ collidable: true }}>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshLambertMaterial color="#ff6b6b" />
            </mesh>
          </RigidBody>

          <RigidBody position={[-1, 0, 0]} type="dynamic" mass={1}>
            <mesh castShadow userData={{ collidable: true }}>
              <sphereGeometry args={[0.3, 32, 32]} />
              <meshLambertMaterial color="#4ecdc4" />
            </mesh>
          </RigidBody>

          <RigidBody position={[0, 0, 1]} type="dynamic" mass={1}>
            <mesh castShadow userData={{ collidable: true }}>
              <cylinderGeometry args={[0.3, 0.3, 0.6, 32]} />
              <meshLambertMaterial color="#45b7d1" />
            </mesh>
          </RigidBody>

          {/* Additional interactive objects */}
          <RigidBody position={[2, 1, 0]} type="dynamic" mass={0.5}>
            <mesh castShadow userData={{ collidable: true }}>
              <coneGeometry args={[0.2, 0.4, 8]} />
              <meshLambertMaterial color="#f39c12" />
            </mesh>
          </RigidBody>

          <RigidBody position={[-2, 0.5, 0]} type="dynamic" mass={2}>
            <mesh castShadow userData={{ collidable: true }}>
              <octahedronGeometry args={[0.3]} />
              <meshLambertMaterial color="#9b59b6" />
            </mesh>
          </RigidBody>

          {/* Wall obstacles to test collision */}
          <RigidBody position={[0, 0, -2]} type="fixed">
            <mesh castShadow receiveShadow userData={{ collidable: true }}>
              <boxGeometry args={[4, 2, 0.2]} />
              <meshLambertMaterial color="#95a5a6" />
            </mesh>
          </RigidBody>

          <RigidBody position={[3, 0, 0]} type="fixed">
            <mesh castShadow receiveShadow userData={{ collidable: true }}>
              <boxGeometry args={[0.2, 2, 4]} />
              <meshLambertMaterial color="#95a5a6" />
            </mesh>
          </RigidBody>

          {/* The floating hand */}
          {showHand && (
            <PlayerHand
              position={[0, 1, 0]}
              rotation={[0, 0, 0]}
              scale={[1, 1, 1]}
              visible={true}
              gesture={gesture}
              animationSpeed={1.0}
              followMouse={followMouse}
              followDistance={4}
            />
          )}
        </RapierPhysics>
      </Canvas>
    </div>
  );
};

export default HandDemo;
