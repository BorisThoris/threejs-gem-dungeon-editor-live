import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";

import type { Dir, Room as RoomData, RoomTemplate } from "../game/dungeon/types";
import { Room } from "../game/rooms/Room";
import { registerTemplate } from "../game/rooms/templates";
// The kinds must be registered for the preview to show their content.
import "../game/rooms/content";
import "../game/puzzles/register";

interface PreviewProps {
  template: RoomTemplate;
  /** Which walls get doorways in the preview. */
  doors: Dir[];
}

/**
 * The room exactly as the game will draw it.
 *
 * The old builder rendered its own box with its own walls and no doorways,
 * so what the designer saw was not what the player got. This mounts the
 * real Room shell - floor, walls, doorways, lights, dressing, the kind's
 * own content - with physics paused and an orbit camera.
 */
export function Preview({ template, doors }: PreviewProps) {
  const room = useMemo<RoomData>(() => {
    // Registered synchronously: Dressing looks the template up while the
    // Room subtree renders, which happens before any effect would run.
    registerTemplate(template);
    return {
      id: "preview",
      kind: template.kind,
      grid: { x: 0, z: 0 },
      size: template.size,
      shape: template.shape,
      links: Object.fromEntries(doors.map((d) => [d, "preview-neighbour"])),
      template: template.id,
    };
  }, [template, doors]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ fov: 50, near: 0.1, far: 200, position: [template.size * 0.9, template.size * 0.8, template.size * 0.9] }}
      style={{ background: "#0a0c12", borderRadius: 6 }}
    >
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#9fb4d8", "#3a3126", 0.5]} />
      <Physics paused timeStep={1 / 60}>
        {/* Keyed so a change of size or shape is a fresh mount, as in the game. */}
        <Room key={`${template.id}:${template.size}:${template.shape}:${doors.join()}`} room={room} seed={1} />
      </Physics>
      <OrbitControls target={[0, 1, 0]} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  );
}
