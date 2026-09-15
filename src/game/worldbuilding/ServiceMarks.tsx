import type { Room } from "../dungeon/types";
import { DIR_YAW } from "../dungeon/types";
import { doorReach } from "../dungeon/footprint";
import { useRun } from "../state/run";
import { InteractTrigger } from "../interact/InteractTrigger";
import { serviceCatch, trailDirection } from "./serviceTrail";

/** Copper repair marks belong to the masonry even before their meaning is
 * learned. Reading the rubbing enables the catch, not the visible geography. */
export function ServiceMarks({ room }: { room: Room }) {
  const dungeon = useRun(s => s.dungeon);
  const learned = useRun(s => s.waterCacheTaken);
  if (!dungeon) return null;
  const dir = trailDirection(dungeon, room);
  if (!dir) return null;
  const final = dungeon.serviceTrail?.hostId === room.id;
  const opened = final && !!room.links[dir];
  const reach = doorReach(room, dir);
  const at = final ? serviceCatch(room) : null;
  return <group>
    <group rotation={[0, DIR_YAW[dir], 0]}>
      {[2.2, Math.max(3.4, reach - 2)].map((distance, index) => <group key={index} position={[0, 0.065, -distance]}>
        {[-0.2, 0, 0.2].map(x => <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.085, 0.025, 0.38]} /><meshStandardMaterial color="#b58558" roughness={0.85} />
        </mesh>)}
        <mesh position={[0, 0, -0.29]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[0.13, 0.025, 0.13]} /><meshStandardMaterial color="#c69b63" />
        </mesh>
      </group>)}
      {final && !opened && <group position={[0, 1.3, -reach + 0.23]}>
        <mesh><boxGeometry args={[0.64, 0.5, 0.08]} /><meshStandardMaterial color="#5e5541" roughness={0.95} /></mesh>
        {[-0.18, 0, 0.18].map(x => <mesh key={x} position={[x, 0, 0.05]}>
          <boxGeometry args={[0.055, 0.27, 0.04]} /><meshStandardMaterial color="#bf9862" /></mesh>)}
      </group>}
    </group>
    {at && !opened && <InteractTrigger position={at} radius={1.5} enabled={learned}
      label="Press the three-notch service catch" blockedReason="Three worn notches · their meaning is lost"
      onInteract={() => useRun.getState().openServiceCatch()} />}
  </group>;
}
