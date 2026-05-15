import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  RigidBody,
  useSphericalJoint,
  useFixedJoint,
  useRevoluteJoint,
} from "@react-three/rapier";
import * as THREE from "three";

// RagdollJoints component to handle joint creation with proper timing
const RagdollJoints: React.FC<{
  headRef: React.RefObject<any>;
  spineRef: React.RefObject<any>;
  pelvisRef: React.RefObject<any>;
  leftArmRef: React.RefObject<any>;
  rightArmRef: React.RefObject<any>;
  leftLegRef: React.RefObject<any>;
  rightLegRef: React.RefObject<any>;
}> = ({
  headRef,
  spineRef,
  pelvisRef,
  leftArmRef,
  rightArmRef,
  leftLegRef,
  rightLegRef,
}) => {
  // Create joints using hooks
  useSphericalJoint(headRef, spineRef, [
    [0, -0.2, 0], // anchor1
    [0, 0, 0, 1], // rotation1 (quaternion)
    [0, 0.4, 0], // anchor2
    [0, 0, 0, 1], // rotation2 (quaternion)
  ]);

  useSphericalJoint(spineRef, pelvisRef, [
    [0, -0.4, 0], // anchor1
    [0, 0, 0, 1], // rotation1
    [0, 0.1, 0], // anchor2
    [0, 0, 0, 1], // rotation2
  ]);

  useSphericalJoint(spineRef, leftArmRef, [
    [-0.2, 0.1, 0], // anchor1
    [0, 0, 0, 1], // rotation1
    [0, 0.3, 0], // anchor2
    [0, 0, 0, 1], // rotation2
  ]);

  useSphericalJoint(spineRef, rightArmRef, [
    [0.2, 0.1, 0], // anchor1
    [0, 0, 0, 1], // rotation1
    [0, 0.3, 0], // anchor2
    [0, 0, 0, 1], // rotation2
  ]);

  useSphericalJoint(pelvisRef, leftLegRef, [
    [-0.1, -0.1, 0], // anchor1
    [0, 0, 0, 1], // rotation1
    [0, 0.4, 0], // anchor2
    [0, 0, 0, 1], // rotation2
  ]);

  useSphericalJoint(pelvisRef, rightLegRef, [
    [0.1, -0.1, 0], // anchor1
    [0, 0, 0, 1], // rotation1
    [0, 0.4, 0], // anchor2
    [0, 0, 0, 1], // rotation2
  ]);

  return null; // Joints are created by hooks, no JSX needed
};

export interface SkeletonProps {
  position?: [number, number, number];
  color?: string;
  scale?: number;
  isAnimated?: boolean;
  health?: number;
  onDeath?: () => void;
  isRagdoll?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  position = [0, 0, 0],
  color = "#F5F5DC",
  scale = 1,
  isAnimated = true,
  health = 50,
  onDeath,
  isRagdoll = false,
}) => {
  const skeletonRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  // Ragdoll body part refs
  const headBodyRef = useRef<any>(null);
  const spineBodyRef = useRef<any>(null);
  const pelvisBodyRef = useRef<any>(null);
  const leftArmBodyRef = useRef<any>(null);
  const rightArmBodyRef = useRef<any>(null);
  const leftLegBodyRef = useRef<any>(null);
  const rightLegBodyRef = useRef<any>(null);

  useFrame((state) => {
    if (isAnimated && skeletonRef.current && !isRagdoll) {
      // Gentle swaying animation
      const sway = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      skeletonRef.current.rotation.z = sway;

      // Head bobbing
      if (headRef.current) {
        const bob = Math.sin(state.clock.elapsedTime * 2) * 0.05;
        headRef.current.position.y = bob;
      }
    }
  });

  // Ragdoll version with individual rigid bodies
  if (isRagdoll) {
    return (
      <group ref={skeletonRef} position={position} scale={scale}>
        {/* Head */}
        <RigidBody
          ref={headBodyRef}
          position={[0, 1.8, 0]}
          type="dynamic"
          colliders="hull"
          mass={2}
        >
          <group ref={headRef}>
            <mesh>
              <sphereGeometry args={[0.2, 8, 6]} />
              <meshLambertMaterial color={color} />
            </mesh>
            {/* Eye sockets */}
            <mesh position={[-0.08, 0.05, 0.15]}>
              <sphereGeometry args={[0.03, 8, 6]} />
              <meshLambertMaterial color="#000000" />
            </mesh>
            <mesh position={[0.08, 0.05, 0.15]}>
              <sphereGeometry args={[0.03, 8, 6]} />
              <meshLambertMaterial color="#000000" />
            </mesh>
          </group>
        </RigidBody>

        {/* Spine */}
        <RigidBody
          ref={spineBodyRef}
          position={[0, 1.2, 0]}
          type="dynamic"
          colliders="hull"
          mass={3}
        >
          <mesh>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
            <meshLambertMaterial color={color} />
          </mesh>
          {/* Ribs */}
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.4, 0.1, 0.2]} />
            <meshLambertMaterial color={color} />
          </mesh>
          <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[0.4, 0.1, 0.2]} />
            <meshLambertMaterial color={color} />
          </mesh>
        </RigidBody>

        {/* Pelvis */}
        <RigidBody
          ref={pelvisBodyRef}
          position={[0, 0.7, 0]}
          type="dynamic"
          colliders="hull"
          mass={4}
        >
          <mesh>
            <boxGeometry args={[0.3, 0.2, 0.15]} />
            <meshLambertMaterial color={color} />
          </mesh>
        </RigidBody>

        {/* Left Arm */}
        <RigidBody
          ref={leftArmBodyRef}
          position={[-0.3, 1.3, 0]}
          type="dynamic"
          colliders="hull"
          mass={1.5}
        >
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
            <meshLambertMaterial color={color} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.3, 0]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshLambertMaterial color={color} />
          </mesh>
        </RigidBody>

        {/* Right Arm */}
        <RigidBody
          ref={rightArmBodyRef}
          position={[0.3, 1.3, 0]}
          type="dynamic"
          colliders="hull"
          mass={1.5}
        >
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
            <meshLambertMaterial color={color} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.3, 0]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshLambertMaterial color={color} />
          </mesh>
        </RigidBody>

        {/* Left Leg */}
        <RigidBody
          ref={leftLegBodyRef}
          position={[-0.1, 0.2, 0]}
          type="dynamic"
          colliders="hull"
          mass={2.5}
        >
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
            <meshLambertMaterial color={color} />
          </mesh>
          {/* Foot */}
          <mesh position={[0, -0.4, 0.1]}>
            <boxGeometry args={[0.1, 0.1, 0.2]} />
            <meshLambertMaterial color={color} />
          </mesh>
        </RigidBody>

        {/* Right Leg */}
        <RigidBody
          ref={rightLegBodyRef}
          position={[0.1, 0.2, 0]}
          type="dynamic"
          colliders="hull"
          mass={2.5}
        >
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
            <meshLambertMaterial color={color} />
          </mesh>
          {/* Foot */}
          <mesh position={[0, -0.4, 0.1]}>
            <boxGeometry args={[0.1, 0.1, 0.2]} />
            <meshLambertMaterial color={color} />
          </mesh>
        </RigidBody>

        {/* Joints connecting body parts - using useEffect to ensure refs are available */}
        <RagdollJoints
          headRef={headBodyRef}
          spineRef={spineBodyRef}
          pelvisRef={pelvisBodyRef}
          leftArmRef={leftArmBodyRef}
          rightArmRef={rightArmBodyRef}
          leftLegRef={leftLegBodyRef}
          rightLegRef={rightLegBodyRef}
        />

        {/* Health indicator */}
        {health < 50 && (
          <mesh position={[0, 2.2, 0]}>
            <boxGeometry args={[0.4, 0.05, 0.05]} />
            <meshLambertMaterial color="#FF0000" />
          </mesh>
        )}
      </group>
    );
  }

  // Regular skeleton version with fixed head position
  return (
    <RigidBody
      position={position}
      scale={scale}
      type="dynamic"
      colliders="hull"
    >
      <group ref={skeletonRef} rotation={[0, 0, 0]}>
        {/* Skeleton head - FIXED POSITION */}
        <group ref={headRef} position={[0, 1.8, 0]}>
          <mesh>
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshLambertMaterial color={color} />
          </mesh>

          {/* Eye sockets */}
          <mesh position={[-0.08, 0.05, 0.15]}>
            <sphereGeometry args={[0.03, 8, 6]} />
            <meshLambertMaterial color="#000000" />
          </mesh>
          <mesh position={[0.08, 0.05, 0.15]}>
            <sphereGeometry args={[0.03, 8, 6]} />
            <meshLambertMaterial color="#000000" />
          </mesh>
        </group>

        {/* Spine */}
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Ribs */}
        <mesh position={[0, 1.3, 0]}>
          <boxGeometry args={[0.4, 0.1, 0.2]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[0.4, 0.1, 0.2]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Arms */}
        <mesh position={[-0.3, 1.3, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <mesh position={[0.3, 1.3, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Hands */}
        <mesh position={[-0.3, 1, 0]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <mesh position={[0.3, 1, 0]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Pelvis */}
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[0.3, 0.2, 0.15]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Legs */}
        <mesh position={[-0.1, 0.2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <mesh position={[0.1, 0.2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Feet */}
        <mesh position={[-0.1, -0.2, 0.1]}>
          <boxGeometry args={[0.1, 0.1, 0.2]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <mesh position={[0.1, -0.2, 0.1]}>
          <boxGeometry args={[0.1, 0.1, 0.2]} />
          <meshLambertMaterial color={color} />
        </mesh>

        {/* Health indicator */}
        {health < 50 && (
          <mesh position={[0, 2.2, 0]}>
            <boxGeometry args={[0.4, 0.05, 0.05]} />
            <meshLambertMaterial color="#FF0000" />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
};

export default Skeleton;
