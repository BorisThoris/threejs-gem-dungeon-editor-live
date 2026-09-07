import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, type Group, type InstancedMesh, type MeshBasicMaterial, type PointLight } from "three";

import { bus } from "../events";
import { useRun } from "../state/run";
import { GROUND_Y, MAX_FRAME_S, TAKEN_LIGHT, TAKEN_LIGHT_S, TAKEN_MOTES, TAKEN_MOTE_S } from "../world";

/**
 * What taking something looks like.
 *
 * The gem is the reason to walk into a room, and for its whole life it
 * left in a single frame: the shape stopped being drawn and the light it
 * cast went out in the same instant, which reads as the renderer dropping
 * a mesh rather than as a delver pocketing a jewel. A relic went the same
 * way, and an item went from a chest to a word in a slot without ever
 * being a thing on the floor.
 *
 * This is the other half of run 21's argument. The blast is the worst
 * thing that happens to a player and it has a body; the pickup is the
 * best thing and had none. So it gets one, built the same way and for the
 * same reasons: one light, one instanced mesh, mounted once, invisible
 * between pickups, paced on rendered frames so a slow machine sees all of
 * it rather than the first frame and none of the rest, and frozen with
 * everything else while the game is paused.
 *
 * Smaller than a blast in every dimension - fourteen motes against forty,
 * half the light, two thirds the time - because the two must never be
 * mistaken for each other in the corner of an eye. And the motes go the
 * other way: a blast throws its embers out and lets them fall, and this
 * draws its motes up and inward, towards the delver who now has the
 * thing.
 *
 * The colour says what was taken - a gem's cold blue, a relic's gold, an
 * item's paler gold - so the flourish is also the answer to "what did I
 * just pick up" without a line of text.
 */

/** What each kind of pickup looks like. The one place that decides. */
const KINDS = {
  gem: { colour: "#7fe3ff", light: TAKEN_LIGHT },
  relic: { colour: "#ffd479", light: TAKEN_LIGHT * 1.1 },
  item: { colour: "#e8d8a8", light: TAKEN_LIGHT * 0.7 },
} as const;

type TakenKind = keyof typeof KINDS;

export function Taken() {
  const group = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const motes = useRef<InstancedMesh>(null);
  const state = useRef<{ active: boolean; t: number; x: number; z: number; kind: TakenKind }>({
    active: false,
    t: 0,
    x: 0,
    z: 0,
    kind: "gem",
  });
  // Where each mote starts, on a ring, and how high it climbs. Written
  // once per pickup into an array that lives for the life of the room.
  const spread = useMemo(() => new Float32Array(TAKEN_MOTES * 3), []);
  const dummy = useMemo(() => new Object3D(), []);

  useEffect(() => {
    /**
     * Where the flourish plays.
     *
     * At the thing when the thing had a place, and at the player when it
     * did not: a puzzle's reward is granted rather than lying anywhere,
     * and playing that at the origin of the room would put a light in a
     * corner for no reason. `playerAt` is not imported here because the
     * camera is where the player is as far as anything drawn is
     * concerned, and the group is placed against it in the frame loop.
     */
    const start = (kind: TakenKind, x: number | undefined, z: number | undefined) => {
      const s = state.current;
      s.active = true;
      s.t = 0;
      s.kind = kind;
      // NaN rather than zero for "nowhere given": zero is the middle of
      // the room and a real place, and a flourish at the middle of the
      // room for a puzzle solved at its lectern is worse than none.
      s.x = x ?? NaN;
      s.z = z ?? NaN;
      for (let i = 0; i < TAKEN_MOTES; i++) {
        const a = (i / TAKEN_MOTES) * Math.PI * 2 + Math.random() * 0.4;
        const r = 0.35 + Math.random() * 0.5;
        spread[i * 3] = Math.cos(a) * r;
        spread[i * 3 + 1] = 0.9 + Math.random() * 0.8;
        spread[i * 3 + 2] = Math.sin(a) * r;
      }
    };
    const offs = [
      // Only a pickup in the room the player is in is seen. Nothing else
      // takes anything anywhere else, but the rule is the blast's and
      // costs one comparison.
      bus.on("gemCollected", ({ roomId, x, z }) => {
        if (useRun.getState().currentRoomId !== roomId) return;
        start("gem", x, z);
      }),
      bus.on("relicTaken", ({ x, z }) => start("relic", x, z)),
      bus.on("itemTaken", ({ x, z }) => start("item", x, z)),
    ];
    return () => offs.forEach((off) => off());
  }, [spread]);

  useFrame((frame, delta) => {
    const g = group.current;
    if (!g) return;
    const s = state.current;
    if (!s.active) {
      probe(false, 0, 0, null);
      return;
    }
    if (!useRun.getState().paused) s.t += Math.min(delta, MAX_FRAME_S);
    const t = s.t;
    if (t > TAKEN_MOTE_S) {
      s.active = false;
      g.visible = false;
      if (light.current) light.current.intensity = 0;
      probe(false, 0, 0, null);
      return;
    }
    const kind = KINDS[s.kind];
    g.visible = true;
    // Placed once, at the start, and then held: a flourish that followed
    // the camera would smear across the room as the player turns.
    if (t < 0.001) {
      const cam = frame.camera.position;
      g.position.set(
        Number.isNaN(s.x) ? cam.x : s.x,
        GROUND_Y,
        Number.isNaN(s.z) ? cam.z : s.z
      );
    }
    const l = light.current;
    // Rises over the first fifth of its life and falls over the rest, so
    // it reads as a thing lifting rather than a lamp switching off.
    const k = t / TAKEN_LIGHT_S;
    const glow = (k < 0.2 ? k / 0.2 : Math.max(0, 1 - (k - 0.2) / 0.8)) * kind.light;
    if (l) {
      l.intensity = glow;
      l.color.set(kind.colour);
    }
    const m = motes.current;
    let up = 0;
    if (m) {
      const life = t / TAKEN_MOTE_S;
      // Out a little, then in and up: the opposite arc to a blast's.
      const inward = 1 - life * life;
      for (let i = 0; i < TAKEN_MOTES; i++) {
        dummy.position.set(
          spread[i * 3] * inward,
          0.25 + spread[i * 3 + 1] * life,
          spread[i * 3 + 2] * inward
        );
        dummy.scale.setScalar(0.055 * (1 - life));
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        up++;
      }
      m.instanceMatrix.needsUpdate = true;
      (m.material as MeshBasicMaterial).color.set(kind.colour);
    }
    probe(true, glow, up, s.kind);
  });

  return (
    <group ref={group} visible={false}>
      <pointLight ref={light} position={[0, 0.9, 0]} color={KINDS.gem.colour} intensity={0} distance={6} decay={1.5} />
      <instancedMesh ref={motes} args={[undefined, undefined, TAKEN_MOTES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={KINDS.gem.colour} />
      </instancedMesh>
    </group>
  );
}

/** For the checks: whether a pickup is playing, how bright, how many motes, and of what. */
function probe(active: boolean, light: number, motes: number, kind: TakenKind | null) {
  if (!import.meta.env.DEV) return;
  const w = window as unknown as {
    __taken?: { active: boolean; light: number; motes: number; kind: TakenKind | null };
  };
  const t = (w.__taken ??= { active: false, light: 0, motes: 0, kind: null });
  t.active = active;
  t.light = light;
  t.motes = motes;
  t.kind = kind;
}
