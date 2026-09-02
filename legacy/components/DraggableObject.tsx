import React, {
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
} from "react";
import * as THREE from "three";
import {
  RigidBody,
  CuboidCollider,
  type RigidBodyTypeString,
} from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";

export interface DraggableObjectRef {
  getObject: () => THREE.Object3D | null;
  setPosition: (position: THREE.Vector3) => void;
  getPosition: () => THREE.Vector3;
  setEnabled: (enabled: boolean) => void;
  isEnabled: () => boolean;
  releaseWithPhysics: (position: THREE.Vector3) => void;
  releaseWithVelocity: (
    position: THREE.Vector3,
    velocity: THREE.Vector3
  ) => void;
  getVelocity: () => THREE.Vector3;
}

export interface DraggableObjectProps {
  children: React.ReactNode;
  onGrab?: () => void;
  onRelease?: () => void;
  onMove?: (newPosition: [number, number, number]) => void;
  enabled?: boolean;
  position?: [number, number, number];
  type?: RigidBodyTypeString;
  colliders?: boolean;
  colliderArgs?: [number, number, number];
  userData?: any;
}

const DraggableObject = forwardRef<DraggableObjectRef, DraggableObjectProps>(
  (
    {
      children,
      onGrab,
      onRelease,
      onMove,
      enabled = true,
      position = [0, 0, 0],
      type = "dynamic",
      colliders = false,
      colliderArgs = [0.1, 0.3, 0.1],
      userData = {},
    },
    ref
  ) => {
    const groupRef = useRef<THREE.Group>(null);
    const rigidBodyRef = useRef<any>(null);
    const isGrabbedRef = useRef(false);
    const lastPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const velocityRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const dragResistanceRef = useRef<number>(1); // Higher = harder to drag
    const pendingPhysicsOps = useRef<{
      type: "release" | "releaseWithVelocity";
      position: THREE.Vector3;
      velocity?: THREE.Vector3;
    } | null>(null);
    const [currentPosition, setCurrentPosition] = useState<
      [number, number, number]
    >([
      isNaN(position[0]) ? 0 : position[0],
      isNaN(position[1]) ? 0 : position[1],
      isNaN(position[2]) ? 0 : position[2],
    ]);

    // Update position when prop changes
    useEffect(() => {
      const validPosition: [number, number, number] = [
        isNaN(position[0]) ? 0 : position[0],
        isNaN(position[1]) ? 0 : position[1],
        isNaN(position[2]) ? 0 : position[2],
      ];
      setCurrentPosition(validPosition);
      console.log("🎯 DraggableObject: Position updated to:", validPosition);
    }, [position]);

    // Calculate drag resistance based on weight
    useEffect(() => {
      const weight = userData?.weight || 1;
      // Higher weight = more resistance (harder to drag)
      dragResistanceRef.current = Math.max(0.1, weight * 0.8);
      console.log(
        "🎯 DraggableObject: Weight:",
        weight,
        "Drag resistance:",
        dragResistanceRef.current
      );
    }, [userData?.weight]);

    // Track velocity for momentum and process pending physics operations
    useFrame(() => {
      // Process pending physics operations
      if (pendingPhysicsOps.current && rigidBodyRef?.current) {
        const op = pendingPhysicsOps.current;
        try {
          if (op.type === "release") {
            rigidBodyRef.current.setTranslation(op.position, true);
            rigidBodyRef.current.setEnabled(true);
          } else if (op.type === "releaseWithVelocity" && op.velocity) {
            rigidBodyRef.current.setTranslation(op.position, true);
            rigidBodyRef.current.setLinvel(op.velocity, true);
            rigidBodyRef.current.setEnabled(true);
          }
        } catch (error) {
          console.error(
            "🎯 DraggableObject: Error processing pending physics op:",
            error
          );
        }
        pendingPhysicsOps.current = null;
      }

      // Track velocity for momentum
      if (groupRef.current && isGrabbedRef.current) {
        const currentPos = groupRef.current.position.clone();
        const deltaTime = 1 / 60; // Assuming 60fps

        // Calculate velocity
        velocityRef.current
          .subVectors(currentPos, lastPositionRef.current)
          .divideScalar(deltaTime);

        // Store current position for next frame
        lastPositionRef.current.copy(currentPos);
      }
    });

    // Debug when component mounts
    useEffect(() => {
      console.log("🎯 DraggableObject: Component mounted");
      console.log("🎯 DraggableObject: Initial position:", position);
      console.log("🎯 DraggableObject: Enabled:", enabled);
      console.log("🎯 DraggableObject: Type:", type);
      console.log("🎯 DraggableObject: Colliders:", colliders);
    }, [position, enabled, type, colliders]);

    useImperativeHandle(ref, () => ({
      getObject: () => groupRef.current,
      setPosition: (worldPosition: THREE.Vector3) => {
        if (groupRef.current) {
          // Convert world position to local position relative to current parent
          const localPosition = new THREE.Vector3();
          groupRef.current.parent?.worldToLocal(
            localPosition.copy(worldPosition)
          );

          // Set group position to local coordinates
          groupRef.current.position.copy(localPosition);

          // Sync physics body with world position (physics uses world coordinates)
          if (rigidBodyRef?.current) {
            rigidBodyRef.current.setTranslation(worldPosition, true);
          }
        }
      },
      getPosition: () => {
        return groupRef.current
          ? groupRef.current.position.clone()
          : new THREE.Vector3();
      },
      setEnabled: (enabled: boolean) => {
        if (rigidBodyRef?.current) {
          rigidBodyRef.current.setEnabled(enabled);
          console.log("🎯 DraggableObject: Physics body enabled:", enabled);
        }
      },
      isEnabled: () => {
        return rigidBodyRef?.current ? rigidBodyRef.current.isEnabled() : true;
      },
      // New method to release object with physics
      releaseWithPhysics: (worldPosition: THREE.Vector3) => {
        if (groupRef.current) {
          // Convert world position to local position relative to current parent
          const localPosition = new THREE.Vector3();
          groupRef.current.parent?.worldToLocal(
            localPosition.copy(worldPosition)
          );

          // Set group position to local coordinates
          groupRef.current.position.copy(localPosition);

          // Sync physics body with world position and enable physics
          if (rigidBodyRef?.current) {
            rigidBodyRef.current.setTranslation(worldPosition, true);
            rigidBodyRef.current.setEnabled(true);
          }

          // Notify parent of new position
          if (onMove) {
            onMove([localPosition.x, localPosition.y, localPosition.z]);
          }
        }
      },
      releaseWithVelocity: (
        worldPosition: THREE.Vector3,
        velocity: THREE.Vector3
      ) => {
        if (groupRef.current) {
          // Convert world position to local position relative to current parent
          const localPosition = new THREE.Vector3();
          groupRef.current.parent?.worldToLocal(
            localPosition.copy(worldPosition)
          );

          // Set group position to local coordinates
          groupRef.current.position.copy(localPosition);

          // Sync physics body with world position, velocity, and enable physics
          if (rigidBodyRef?.current) {
            rigidBodyRef.current.setTranslation(worldPosition, true);
            rigidBodyRef.current.setLinvel(velocity, true);
            rigidBodyRef.current.setEnabled(true);
          }

          // Notify parent of new position
          if (onMove) {
            onMove([localPosition.x, localPosition.y, localPosition.z]);
          }
        }
      },
      getVelocity: () => {
        return velocityRef.current.clone();
      },
    }));

    // Create a ref object that we can pass to userData
    const draggableRefObject = {
      current: {
        getObject: () => groupRef.current,
        setPosition: (worldPosition: THREE.Vector3) => {
          if (groupRef.current) {
            // Convert world position to local position relative to current parent
            const localPosition = new THREE.Vector3();
            groupRef.current.parent?.worldToLocal(
              localPosition.copy(worldPosition)
            );

            // Set group position to local coordinates
            groupRef.current.position.copy(localPosition);

            // Sync physics body with world position (physics uses world coordinates)
            if (rigidBodyRef?.current) {
              rigidBodyRef.current.setTranslation(worldPosition, true);
            }
          }
        },
        getPosition: () => {
          return groupRef.current
            ? groupRef.current.position.clone()
            : new THREE.Vector3();
        },
        setEnabled: (enabled: boolean) => {
          if (rigidBodyRef?.current) {
            rigidBodyRef.current.setEnabled(enabled);
            console.log("🎯 DraggableObject: Physics body enabled:", enabled);
          }
        },
        isEnabled: () => {
          return rigidBodyRef?.current
            ? rigidBodyRef.current.isEnabled()
            : true;
        },
        releaseWithPhysics: (worldPosition: THREE.Vector3) => {
          if (groupRef.current && rigidBodyRef?.current) {
            try {
              // Convert world position to local position relative to current parent
              const localPosition = new THREE.Vector3();
              groupRef.current.parent?.worldToLocal(
                localPosition.copy(worldPosition)
              );

              // Set group position to local coordinates
              groupRef.current.position.copy(localPosition);

              // Queue physics operation for next frame
              pendingPhysicsOps.current = {
                type: "release",
                position: worldPosition.clone(),
              };

              // Notify parent of new position
              if (onMove) {
                onMove([localPosition.x, localPosition.y, localPosition.z]);
              }
            } catch (error) {
              console.error(
                "🎯 DraggableObject: Error in releaseWithPhysics:",
                error
              );
            }
          }
        },
        releaseWithVelocity: (
          worldPosition: THREE.Vector3,
          velocity: THREE.Vector3
        ) => {
          if (groupRef.current && rigidBodyRef?.current) {
            try {
              // Convert world position to local position relative to current parent
              const localPosition = new THREE.Vector3();
              groupRef.current.parent?.worldToLocal(
                localPosition.copy(worldPosition)
              );

              // Set group position to local coordinates
              groupRef.current.position.copy(localPosition);

              // Queue physics operation for next frame
              pendingPhysicsOps.current = {
                type: "releaseWithVelocity",
                position: worldPosition.clone(),
                velocity: velocity.clone(),
              };

              // Notify parent of new position
              if (onMove) {
                onMove([localPosition.x, localPosition.y, localPosition.z]);
              }
            } catch (error) {
              console.error(
                "🎯 DraggableObject: Error in releaseWithVelocity:",
                error
              );
            }
          }
        },
        getVelocity: () => {
          return velocityRef.current.clone();
        },
        getDragResistance: () => {
          return dragResistanceRef.current;
        },
      },
    };

    const handleGrab = () => {
      console.log("🎯 DraggableObject: handleGrab called");
      console.log("🎯 DraggableObject: enabled:", enabled);
      console.log("🎯 DraggableObject: groupRef.current:", groupRef.current);
      console.log(
        "🎯 DraggableObject: rigidBodyRef.current:",
        rigidBodyRef.current
      );

      if (!enabled) {
        console.log("🎯 DraggableObject: Grab blocked - not enabled");
        return;
      }

      // Prevent multiple grabs
      if (isGrabbedRef.current) {
        console.log("🎯 DraggableObject: Already grabbed, ignoring");
        return;
      }

      isGrabbedRef.current = true;

      // Disable physics for smooth manipulation
      if (rigidBodyRef?.current) {
        console.log("🎯 DraggableObject: Disabling physics body");
        rigidBodyRef.current.setEnabled(false);
      }

      console.log("🎯 DraggableObject: Calling onGrab callback");
      onGrab?.();
    };

    const handleRelease = () => {
      if (!enabled) {
        return;
      }

      // Prevent multiple releases
      if (!isGrabbedRef.current) {
        console.log("🎯 DraggableObject: Not grabbed, ignoring release");
        return;
      }

      isGrabbedRef.current = false;
      onRelease?.();
    };

    return (
      <RigidBody
        ref={rigidBodyRef}
        position={currentPosition}
        type={type}
        colliders={colliders ? "cuboid" : false}
        userData={userData}
      >
        {colliders && <CuboidCollider args={colliderArgs} />}
        <group
          ref={groupRef}
          userData={{
            draggable: true,
            draggableRef: draggableRefObject,
            onGrab: handleGrab,
            onRelease: handleRelease,
            physicsBodyRef: rigidBodyRef,
            dragResistance: dragResistanceRef.current,
            weight: userData?.weight || 1,
          }}
        >
          {children}
        </group>
      </RigidBody>
    );
  }
);

DraggableObject.displayName = "DraggableObject";

export default DraggableObject;
