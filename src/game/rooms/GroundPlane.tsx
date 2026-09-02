import { CuboidCollider, RigidBody } from "@react-three/rapier";

import { FLOOR_THICKNESS, GROUND_Y } from "../world";

/**
 * The floor of last resort, level with every room's floor.
 *
 * The player spawns before the first room's colliders mount, and a room's
 * subtree unmounts during a transition. Both are moments with nothing under
 * the player unless this exists. It is invisible - rooms draw the floor you
 * see - and wide enough to cover an edge spawn in the largest room.
 *
 * Declared as colliders, not invisible meshes: `colliders="cuboid"` derives
 * shapes by walking child meshes and skips one with visible={false}, which is
 * how the old tree's two "safety" floors came to have no collider at all.
 */
export function GroundPlane() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider
        args={[200, FLOOR_THICKNESS / 2, 200]}
        position={[0, GROUND_Y - FLOOR_THICKNESS / 2, 0]}
      />
      {/* The backstop under the backstop. */}
      <CuboidCollider args={[1000, 1, 1000]} position={[0, GROUND_Y - 12, 0]} />
    </RigidBody>
  );
}
