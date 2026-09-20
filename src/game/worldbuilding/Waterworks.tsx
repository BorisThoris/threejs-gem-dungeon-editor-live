import { geo } from "../props/shared";
import { ChannelBed } from "./ChannelBed";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, NearestFilter, PlaneGeometry, type Group, MeshStandardMaterial } from "three";
import type { Room } from "../dungeon/types";
import { DIR_YAW } from "../dungeon/types";
import { InteractTrigger } from "../interact/InteractTrigger";
import { canControl, runClock, useRun } from "../state/run";
import { ambience } from "../systems/audio";
import { sideOf } from "../systems/bearing";
import { playerAt } from "../player/where";
import { Blocks } from "../rooms/CorridorDetails";
import type { CorridorBlock } from "../rooms/corridorPattern";
import { GROUND_Y } from "../world";
import { floorHeightAt } from "./elevation";
import { watercourseBlocks, waterLevel, waterTravel, waterFlowUV, waterStation, WATERWAY_NAMES, WATER_CACHE_GEMS } from "./watercourse";

const FLOW_ARROWS: CorridorBlock[] = [2, 4].flatMap(z => [-1, 1].map(sign => ({
  position: [sign * 0.22, GROUND_Y + 0.052, -z] as [number, number, number],
  size: [0.08, 0.016, 0.65] as [number, number, number], rotationY: sign * Math.PI / 4,
})));

function Inscription({ lines }: { lines: string[] }) {
  const words = lines.join("\n");
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 192;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#242923"; ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = "#aa9364"; ctx.lineWidth = 5; ctx.strokeRect(8, 8, 496, 176);
    ctx.fillStyle = "#d0bb87"; ctx.textAlign = "center"; ctx.font = "bold 24px monospace";
    words.split("\n").forEach((line, i) => ctx.fillText(line, 256, 48 + i * 43));
    const map = new CanvasTexture(canvas); map.magFilter = NearestFilter;
    return map;
  }, [words]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0, 2.55, 0.06]} scale={[1.5, 0.57, 1]} geometry={geo("plane", 1, 1)}>
    <meshBasicMaterial map={texture} />
  </mesh>;
}

/** Low cut-stone channels, bronze flow marks and a wall mechanism. Geometry
 * remains below capsule height or flush to the wall, so the shared footprint
 * remains the complete collision and navigation model. */
export function Watercourse({ room }: { room: Room }) {
  const openedAt = useRun(s => s.waterOpenedAt);
  const taken = useRun(s => s.waterCacheTaken);
  const hasRubbing = useRun(s => !!s.dungeon?.serviceTrail);
  const [drained, setDrained] = useState(false);
  const wheel = useRef<Group>(null);
  const flowTime = useRef({ value: 0 });
  const water = useMemo(() => {
    const material = new MeshStandardMaterial({ color: "#507a78", transparent: true, depthWrite: false,
      roughness: 0.35, emissive: "#254e50", emissiveIntensity: 0.22 });
    material.name = "directed-channel-water";
    material.userData.travel = flowTime.current;
    material.customProgramCacheKey = () => "directed-channel-water-v2";
    material.onBeforeCompile = shader => {
      shader.uniforms.flowTime = flowTime.current;
      shader.vertexShader = "varying vec2 flowUV;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <uv_vertex>", "#include <uv_vertex>\nflowUV = uv;");
      shader.fragmentShader = "uniform float flowTime; varying vec2 flowUV;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>",
        "#include <color_fragment>\nfloat lane = floor(flowUV.y * 8.0); float bands = step(0.78, fract((flowUV.x - floor(flowTime * 5.0) * 0.08) * 1.6 + mod(lane, 3.0) * 0.12)); diffuseColor.rgb *= 0.9 + bands * 0.32;");
    };
    return material;
  }, []);
  useEffect(() => () => water.dispose(), [water]);
  const blocks = useMemo(() => watercourseBlocks(room), [room]);
  useEffect(() => () => ambience.stopCurrent(), []);
  const surfaces = useMemo(() => blocks.map((b, segment) => {
    const geometry = new PlaneGeometry(b.size[0], b.size[2]);
    const positions = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const coords = waterFlowUV(room, segment, b.position[0] + positions.getX(i), b.position[2] - positions.getY(i));
      uv.setXY(i, ...coords);
    }
    return geometry;
  }), [blocks, room]);
  useEffect(() => () => surfaces.forEach(geometry => geometry.dispose()), [surfaces]);
  const station = useMemo(() => room.waterway?.role !== "channel" ? waterStation(room) : null, [room]);
  useFrame(() => {
    const s = useRun.getState(), now = runClock(s), level = waterLevel(openedAt, now);
    // The nearest point on the actual wet strips supplies distance and side;
    // a broad room is not equally loud everywhere. Reuse the held voice.
    let nearest = { x: 0, z: 0, distance: Infinity };
    for (const b of blocks) {
      const x = Math.max(b.position[0] - b.size[0] / 2, Math.min(b.position[0] + b.size[0] / 2, playerAt.x));
      const z = Math.max(b.position[2] - b.size[2] / 2, Math.min(b.position[2] + b.size[2] / 2, playerAt.z));
      const distance = Math.hypot(x - playerAt.x, z - playerAt.z);
      if (distance < nearest.distance) nearest = { x, z, distance };
    }
    if (canControl(s) && s.currentRoomId === room.id && level > 0)
      ambience.setCurrent(level / (1 + nearest.distance * 0.35), sideOf(nearest.x - playerAt.x, nearest.z - playerAt.z));
    else ambience.stopCurrent();
    flowTime.current.value = waterTravel(openedAt, now);
    water.opacity = level * 0.9; water.visible = level > 0;
    if (wheel.current) wheel.current.rotation.z = (1 - level) * Math.PI * 1.5;
    if ((level === 0) !== drained) setDrained(level === 0);
  });
  if (!room.waterway) return null;
  const role = room.waterway.role;
  return <group>
    <Blocks blocks={blocks.map(b => ({ ...b, position: [b.position[0], GROUND_Y + 0.032, b.position[2]],
      size: [b.size[0] === 0.8 ? 1.02 : b.size[0], 0.008, b.size[2] === 0.8 ? 1.02 : b.size[2]] }))} color="#806a47" />
    <ChannelBed room={room} blocks={blocks} />
    <group>
      {blocks.map((b, i) => {
        return <mesh key={i} name="directed-channel-surface" position={[b.position[0], GROUND_Y + 0.044, b.position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={surfaces[i]} attach="geometry" />
        {/* One material instance shared by the channel segments. */}
        <primitive object={water} attach="material" />
      </mesh>;
      })}
    </group>
    {room.waterway.downstream && <group rotation={[0, DIR_YAW[room.waterway.downstream], 0]}>
      <Blocks blocks={FLOW_ARROWS} color="#d8b873" emissive="#695027" roughness={1} />
    </group>}
    {station && <>
      <group position={[station.x, floorHeightAt(room, station.x, station.z), station.z]} rotation={[0, station.yaw, 0]}>
        <mesh position={[0, 1.45, -0.1]} scale={[1.5, 1.9, 0.12]} geometry={geo("box", 1, 1, 1)}><meshStandardMaterial color="#4d5a4b" /></mesh>
        <Inscription lines={role === "sluice" ? ["OLD WATERWORKS", "TURN TO DRAIN", "FOLLOW BRONZE ARROWS"] : taken && hasRubbing ? ["MAINTENANCE RUBBING", "FOLLOW THREE NOTCHES", "PRESS THE FINAL CATCH"] : ["DROWNED RELIQUARY", "DRAIN AT THE SLUICE", "THEN LIFT THE SEAL"]} />
        {role === "sluice" ? <group ref={wheel} position={[0, 1.45, 0]}>
          <mesh geometry={geo("torus", 0.52, 0.065, 4, 8)}><meshStandardMaterial color="#bc8c45" metalness={0.4} roughness={0.7} /></mesh>
          {[0, Math.PI / 2].map(angle => <mesh key={angle} rotation={[0, 0, angle]} scale={[1, 0.09, 0.09]} geometry={geo("box", 1, 1, 1)}>
            <meshStandardMaterial color="#a4814d" />
          </mesh>)}
          <mesh scale={[0.19, 0.19, 0.17]} geometry={geo("box", 1, 1, 1)}><meshStandardMaterial color="#d1b879" /></mesh>
        </group> : <group position={[0, 1.45, 0]}>
          <mesh position={[0, 0, 0.07]} scale={[1.15, 1.2, 1]} geometry={geo("plane", 1, 1)}><primitive object={water} attach="material" /></mesh>
          {(!drained || taken) ? [-0.45, -0.15, 0.15, 0.45].map(x => <mesh key={x} position={[x, 0, 0]} scale={[0.08, 1.05, 0.1]} geometry={geo("box", 1, 1, 1)}>
            <meshStandardMaterial color={taken ? "#596052" : "#567f79"} />
          </mesh>) : [-0.25, 0.25].map(x => <mesh key={x} position={[x, 0, 0.02]} geometry={geo("octahedron", 0.21, 0)}>
            <meshStandardMaterial color="#9ddbc8" emissive="#3d9f8e" emissiveIntensity={0.7} />
          </mesh>)}
        </group>}
        <pointLight position={[0, 2.1, 0.3]} color={drained ? "#d9bc75" : "#6eafa7"} intensity={2} distance={5} />
      </group>
      <InteractTrigger position={[station.approach.x, floorHeightAt(room, station.approach.x, station.approach.z) + 1.2, station.approach.z]} radius={2}
        label={role === "sluice" ? "Turn the sluice wheel · drains the watercourse" : `Lift the dry reliquary seal · ${WATER_CACHE_GEMS} gems`}
        enabled={role === "sluice" ? openedAt === null : drained && !taken}
        blockedReason={role === "sluice" ? "Sluice open · follow the bronze arrows downstream" : taken ? "Reliquary emptied" : "Underwater seal · find the sluice upstream"}
        onInteract={() => useRun.getState().operateWaterway()} />
    </>}
    {import.meta.env.DEV && <WaterProbe room={room} drained={drained} />}
  </group>;
}

function WaterProbe({ room, drained }: { room: Room; drained: boolean }) {
  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;
    win.__watercourse = { roomId: room.id, role: room.waterway?.role, name: WATERWAY_NAMES[room.waterway!.role], drained, station: waterStation(room) };
    return () => { delete win.__watercourse; };
  }, [room, drained]);
  return null;
}
