/* eslint-disable react-refresh/only-export-components -- this module exports
   nothing on purpose: importing it registers the room kinds. */
import { useMemo } from "react";

import { quadrantSpots, type Vec3 } from "../dungeon/layout";
import { secretFlavour } from "../dungeon/secret";
import type { Room } from "../dungeon/types";
import { offeredAt, priceOn, RELIC_IDS, RELICS, type RelicId } from "../relics/catalog";
import { createRng, shuffle } from "../rng";
import { bus } from "../events";
import { InteractTrigger } from "../interact/InteractTrigger";
import { SATCHEL_SLOTS, type ItemId } from "../items/catalog";
import type { Charges } from "../items/charge";
import { alarmFloorFor, canSpend, tollNow, useRun } from "../state/run";
import {
  BOMB_PRICE,
  CLOSE_REACH,
  GEMS_PER_LIFE,
  LANTERN_OIL_FULL,
  OIL_MEASURES,
  OIL_PRICE,
} from "../world";

/** What the shopkeeper charges to put a name to something. */
const NAMING_PRICE = 1;
/**
 * What the shopkeeper charges to lift something a step: cursed to plain,
 * plain to blessed.
 *
 * Two, against one for a name. A name is knowledge and this is a change to
 * the dungeon, and it is the only thing in the game that undoes a curse -
 * so it is the second most expensive thing on the counter and still
 * cheaper than any relic, because what it buys is one kind of item rather
 * than a rule of the run.
 */
const BLESSING_PRICE = 2;
import { Dressing } from "./Dressing";
import { libraryLectern, shopAnchors, shopOffers, shrineAnchor, type ShopOfferId } from "./anchors";
import { offered, pledgeCost } from "../heat/pledge";
import { registerRoomKind, type RoomKindProps } from "./kinds";
// Room layouts that ship with the game register themselves.
import "./shipped";

/**
 * What each room kind puts inside the shell.
 *
 * Importing this module registers every kind. Kinds whose content is a
 * puzzle (memory, challenge) register from the puzzles module instead, so
 * the room shell never depends on puzzle code.
 */

/** The counter on near[2], and a relic pedestal on each of two far anchors. */

function Dressed({ room }: RoomKindProps) {
  const seed = useRun((s) => s.dungeon?.seed ?? 0);
  return <Dressing room={room} seed={seed} />;
}

/**
 * The shop: the only place a gem buys something other than a door.
 *
 * It sells one life and two relics, and the relics are the point. A life
 * puts a run back where it was; a relic changes what the rest of the run
 * is, so the decision at the counter is whether to spend the gems that
 * were going to be your score on getting more of them.
 *
 * What is on offer is fixed by the floor and the run's seed, so a shop is
 * the same shop every time you walk back into it.
 */
function Shop({ room }: RoomKindProps) {
  const gems = useRun((s) => s.gems);
  const lives = useRun((s) => s.lives);
  const maxLives = useRun((s) => s.maxLives);
  const floor = useRun((s) => s.floor);
  const seed = useRun((s) => s.dungeon?.seed ?? 0);
  const held = useRun((s) => s.relics);
  const toll = useRun(tollNow);
  const [counter, ...shelves] = shopAnchors(room);
  /**
   * Where each of the five things the trader offers actually stands.
   *
   * Read from the one owner rather than written as offsets here, because
   * two of those offsets used to be the same offset and nothing outside
   * this file could see it.
   */
  const at = useMemo(() => {
    const table = {} as Record<ShopOfferId, { position: [number, number, number]; radius?: number }>;
    for (const o of shopOffers(room)) table[o.id] = { position: [o.x, 0, o.z], radius: o.reach };
    return table;
  }, [room]);
  const satchel = useRun((s) => s.satchel);
  const identified = useRun((s) => s.identified);
  const appearances = useRun((s) => s.appearances);

  /**
   * Two relics the player does not already hold, the same two every visit -
   * or three, for as long as they carry the Cutter's Cant.
   *
   * The Cant promises "the third offer the shop was not going to show you"
   * and for its whole existence the shop sliced to two whatever the player
   * held: four gems for nothing, and the Courier paid two satchel slots
   * for it at the character screen. `thirdOffer` is the one owner of the
   * count, so the relic's sentence and the shop's behaviour cannot drift
   * again.
   *
   * The shuffle is seeded and the slice grows from its front, so buying
   * the Cant mid-run ADDS a third stand rather than rearranging the two
   * already standing there.
   */
  // Read from the one owner rather than shuffled here. `held` is a
  // dependency now because a third stand appearing when the Cant is bought
  // is the whole point - and `offeredAt` grows its slice from the front,
  // so the two already standing there do not move.
  const offer = useMemo(
    () => offeredAt(seed, room.id, floor, held),
    [seed, room.id, floor, held]
  );

  const needsLife = lives < maxLives;
  const canAffordLife = gems >= GEMS_PER_LIFE;
  // Gems never respawn and the exit is the only way off a floor, so a life
  // sold from under the toll is a run the player cannot finish and is not
  // told why. The shop declines rather than let that happen.
  // Selected as the answer rather than computed from parts, so the counter
  // re-renders when what it may sell changes and not on every gem.
  const canBuyLife = useRun((s) => canSpend(s, GEMS_PER_LIFE));
  const canBuyName = useRun((s) => canSpend(s, NAMING_PRICE));

  // The first thing in the satchel nobody has put a name to yet.
  const bombBought = useRun((s) => s.bombBought);
  const canBuyBomb = useRun((s) => canSpend(s, BOMB_PRICE));
  const satchelFull = satchel.length >= SATCHEL_SLOTS;
  const puzzling = satchel.findIndex((id) => !identified.includes(id));
  const canAffordName = gems >= NAMING_PRICE;
  const charges = useRun((s) => s.charges);
  const canBless = useRun((s) => canSpend(s, BLESSING_PRICE));
  const oilFull = useRun((s) => s.oil >= LANTERN_OIL_FULL);
  const canBuyOil = useRun((s) => canSpend(s, OIL_PRICE));
  const canAffordBlessing = gems >= BLESSING_PRICE;
  const liftable = worstSlot(satchel, charges);

  return (
    <>
      <Dressed room={room} />
      {/* The counter itself, at the trigger. */}
      <mesh position={[counter[0], 0.5, counter[2]]} castShadow>
        <boxGeometry args={[2.4, 1, 0.9]} />
        <meshStandardMaterial color="#5a3d26" roughness={0.85} />
      </mesh>
      <InteractTrigger
        {...at.life}
        label={`Buy a life (${GEMS_PER_LIFE} gem)`}
        enabled={needsLife && canBuyLife}
        blockedReason={
          !needsLife
            ? "Already at full health"
            : !canAffordLife
              ? `Needs ${GEMS_PER_LIFE} gem (${gems}/${GEMS_PER_LIFE})`
              : `That would leave you short of the ${toll} the exit wants`
        }
        onInteract={() => {
          const run = useRun.getState();
          if (run.lives >= run.maxLives) return;
          if (run.gems - GEMS_PER_LIFE < tollNow(run)) return;
          if (run.spendGems(GEMS_PER_LIFE)) run.gainLife();
        }}
      />
      {/* A bomb, one a floor. The shop is not a bomb dispenser; a player who
          wants more finds them in chests. Paid for only once there is
          somewhere to put it, so a full satchel is refused before the gems
          go rather than after. */}
      <InteractTrigger
        {...at.bomb}
        label={bombBought ? "The shop's bomb is sold" : `Buy a bomb (${BOMB_PRICE} gems)`}
        enabled={!bombBought && canBuyBomb && !satchelFull}
        blockedReason={
          bombBought
            ? "One a floor, and it is sold"
            : satchelFull
              ? "Nowhere to put it: the satchel is full"
              : gems < BOMB_PRICE
                ? `Needs ${BOMB_PRICE} gems (${gems}/${BOMB_PRICE})`
                : `That would leave you short of the ${toll} the exit wants`
        }
        onInteract={() => {
          const run = useRun.getState();
          if (run.bombBought || run.satchel.length >= SATCHEL_SLOTS || !canSpend(run, BOMB_PRICE)) return;
          if (run.spendGems(BOMB_PRICE)) {
            run.takeItem("bomb", "shop");
            run.markBombBought();
          }
        }}
      />
      {/**
       * Oil, which used to be free at every brazier.
       *
       * The refill failed the anti-grinding test outright - low risk, a
       * lot of time, some reward, so "it encourages players to bore
       * themselves, and even worse, it may be optimal to do so" - and it
       * was: the correct play was always to walk back to a fire, which is
       * another way of saying it was not a decision.
       *
       * So light joins the things gems buy, which is exactly where the
       * meta layer's rules say it belongs: gems buy RUN-SCOPED things -
       * bombs, oil, a key, passage - and nothing permanent. And it puts
       * the lantern's cost in the same currency as the exit, which is what
       * makes carrying light mean carrying less treasure home.
       */}
      <InteractTrigger
        {...at.oil}
        label={oilFull ? "The flask is full" : `Buy oil (${OIL_PRICE} gem)`}
        enabled={!oilFull && canBuyOil}
        blockedReason={
          oilFull
            ? "The flask will not take any more"
            : gems < OIL_PRICE
              ? `Needs ${OIL_PRICE} gem (${gems}/${OIL_PRICE})`
              : `That would leave you short of the ${toll} the exit wants`
        }
        onInteract={() => {
          const run = useRun.getState();
          if (run.oil >= LANTERN_OIL_FULL || !canSpend(run, OIL_PRICE)) return;
          if (run.spendGems(OIL_PRICE)) run.buyOil(OIL_MEASURES);
        }}
      />
      {/* Knowing is worth buying: a second copy of anything is rare enough
          that using one to identify it usually teaches you nothing in time
          to matter. */}
      <InteractTrigger
        {...at.naming}
        label={
          puzzling >= 0
            ? `Ask about ${appearances[satchel[puzzling]].unknown} (${NAMING_PRICE} gem)`
            : "Ask about your satchel"
        }
        enabled={puzzling >= 0 && canBuyName}
        blockedReason={
          puzzling < 0
            ? "You know what everything you carry is"
            : !canAffordName
              ? `Needs ${NAMING_PRICE} gem (${gems}/${NAMING_PRICE})`
              : `That would leave you short of the ${toll} the exit wants`
        }
        onInteract={() => {
          const run = useRun.getState();
          const slot = run.satchel.findIndex((id) => !run.identified.includes(id));
          if (slot < 0) return;
          if (!canSpend(run, NAMING_PRICE)) return;
          if (run.spendGems(NAMING_PRICE)) run.identifySlot(slot);
        }}
      />
      {/* Lifting a curse. A cursed kind is a real cost the player has been
          carrying all run - every one of them they find is worse - and
          this is the only thing that answers it. */}
      <InteractTrigger
        {...at.blessing}
        label={
          liftable >= 0
            ? `Have ${appearances[satchel[liftable]].unknown} blessed (${BLESSING_PRICE} gems)`
            : "Have something blessed"
        }
        enabled={liftable >= 0 && canBless}
        blockedReason={
          liftable < 0
            ? "Nothing you carry could be better than it is"
            : !canAffordBlessing
              ? `Needs ${BLESSING_PRICE} gems (${gems}/${BLESSING_PRICE})`
              : `That would leave you short of the ${toll} the exit wants`
        }
        onInteract={() => {
          const run = useRun.getState();
          // Cursed first: it is the one a player is actually carrying a
          // cost for, and spending two gems to make a plain thing blessed
          // while a cursed thing sits in the next slot is not what anyone
          // meant by pressing this.
          const slot = worstSlot(run.satchel, run.charges);
          if (slot < 0 || !canSpend(run, BLESSING_PRICE)) return;
          if (run.spendGems(BLESSING_PRICE)) run.blessSlot(slot);
        }}
      />
      {offer.map((id, i) => (
        <RelicStand key={id} id={id} position={shelves[i]} floor={floor} />
      ))}
    </>
  );
}

/**
 * The slot most worth lifting: the first cursed thing, or failing that the
 * first plain one.
 *
 * One owner for that ordering, because the prompt and the press both have
 * to agree about which slot the two gems are going to. They did not have
 * to before - naming takes the first unidentified slot and there is only
 * one way to be unidentified - and the moment there were two grades of
 * "could be better", the button and its label could name different things.
 */
function worstSlot(satchel: readonly ItemId[], charges: Charges): number {
  const cursed = satchel.findIndex((id) => charges[id] === "cursed");
  if (cursed >= 0) return cursed;
  return satchel.findIndex((id) => charges[id] === "plain");
}

/** One relic on a pedestal, with its price and what it does in the prompt. */
function RelicStand({
  id,
  position,
  floor,
  price: fixed,
}: {
  id: RelicId;
  position: Vec3;
  floor: number;
  /** A price the floor set rather than the catalogue: the reliquary's is nothing. */
  price?: number;
}) {
  const gems = useRun((s) => s.gems);
  const taken = useRun((s) => s.relics.includes(id));
  const relic = RELICS[id];
  const price = fixed ?? priceOn(relic, floor);
  const affordable = useRun((s) => canSpend(s, price));
  const toll = useRun(tollNow);

  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.42, 0.9, 10]} />
        <meshStandardMaterial color="#4c4a52" roughness={0.9} />
      </mesh>
      {!taken && (
        <>
          <mesh position={[0, 1.15, 0]} castShadow>
            <icosahedronGeometry args={[0.24, 0]} />
            <meshStandardMaterial
              color="#e6c76a"
              emissive="#8a6a12"
              emissiveIntensity={0.8}
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>
          <pointLight position={[0, 1.3, 0]} color="#ffd479" intensity={3} distance={4} />
        </>
      )}
      <InteractTrigger
        position={[0, 0, 0]}
        label={`${relic.name}, ${price === 0 ? "free" : `${price} gems`} - ${relic.blurb}`}
        enabled={!taken && affordable}
        blockedReason={
          taken
            ? "Already yours"
            : gems < price
              ? `Needs ${price} gems (${gems}/${price})`
              : `That would leave you short of the ${toll} the exit wants`
        }
        onInteract={() => {
          const run = useRun.getState();
          if (run.relics.includes(id)) return;
          if (!canSpend(run, price)) return;
          if (run.spendGems(price)) run.addRelic(id, [position[0], position[2]]);
        }}
      />
    </group>
  );
}

/** The library: a lectern that opens the number puzzle. Solving it clears the room. */
function Library({ room }: RoomKindProps) {
  const cleared = useRun((s) => s.cleared.includes(room.id));
  const lectern = libraryLectern(room);
  return (
    <>
      <Dressed room={room} />
      <mesh position={[lectern[0], 0.55, lectern[2]]} castShadow>
        <boxGeometry args={[0.7, 1.1, 0.5]} />
        <meshStandardMaterial color="#4a3320" roughness={0.9} />
      </mesh>
      <mesh position={[lectern[0], 1.12, lectern[2]]} rotation={[-0.4, 0, 0]}>
        <boxGeometry args={[0.6, 0.08, 0.45]} />
        <meshStandardMaterial color="#8a3b3b" />
      </mesh>
      <InteractTrigger
        position={[lectern[0], 0, lectern[2]]}
        label="Study the tome"
        enabled={!cleared}
        blockedReason="You have read this one"
        onInteract={() =>
          bus.emit("puzzleOpen", { kind: "number", difficulty: "medium", roomId: room.id })
        }
      />
    </>
  );
}

/**
 * The shrine: a font that buys the floor's attention back for one gem.
 *
 * The one thing in the game that spends a spare gem on something other
 * than the exit. It says which of the two reasons it cannot be used before
 * the press, rather than doing nothing and dropping a hint after it - the
 * rule every trigger that can refuse is held to.
 */
function Shrine({ room }: RoomKindProps) {
  const at = shrineAnchor(room);
  const used = useRun((s) => s.cleared.includes(room.id));
  const gems = useRun((s) => s.gems);
  const alarm = useRun((s) => s.alarm);
  // The same floor the store clamps to, delver bonus included, so the
  // prompt cannot offer what the press would refuse.
  const baseline = useRun(alarmFloorFor);
  const quiet = alarm <= baseline;
  const why = used
    ? "The font is dry. It gave what it had."
    : gems < 1
      ? "The font wants a gem, and you have none."
      : "Nothing down here is looking for you yet.";
  return (
    <>
      <Dressed room={room} />
      {/* A low basin on a stepped plinth. */}
      <mesh position={[at[0], 0.18, at[2]]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.36, 1.9]} />
        <meshStandardMaterial color="#5b5750" roughness={0.95} />
      </mesh>
      <mesh position={[at[0], 0.62, at[2]]} castShadow>
        <cylinderGeometry args={[0.62, 0.72, 0.52, 16]} />
        <meshStandardMaterial color="#6d6860" roughness={0.9} />
      </mesh>
      {/* The water, which goes flat and dark once the font has been used. */}
      <mesh position={[at[0], 0.88, at[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.58, 24]} />
        <meshStandardMaterial
          color={used ? "#2b2f31" : "#5fb0c4"}
          emissive={used ? "#000000" : "#1d5c68"}
          roughness={0.25}
        />
      </mesh>
      <InteractTrigger
        position={[at[0], 0, at[2]]}
        label="Kneel at the shrine - a gem, and the floor forgets you"
        enabled={!used && gems >= 1 && !quiet}
        blockedReason={why}
        radius={CLOSE_REACH}
        onInteract={() => useRun.getState().kneelAtShrine(room.id)}
      />
      {/**
        * And the other thing a font is for: a promise about this floor.
        *
        * The one place in the game where the player ASKS for pressure. It
        * stands a stride off the basin so it is a second thing to walk to
        * rather than a second reading of the same press, on the same
        * arbitration the shop's counter uses.
        */}
      <Vow room={room} at={at} />
    </>
  );
}

/**
 * The vow stone: promise the floor something, for heat now and gems at the
 * stair.
 *
 * One promise a floor, and the price rises with every one this run has
 * KEPT - which is what the research means by the target rising as the
 * player clears it. A pledge that stayed the same price would be a
 * difficulty setting with extra words.
 */
function Vow({ room, at }: { room: Room; at: readonly [number, number, number] }) {
  const pledge = useRun((s) => s.pledge);
  const kept = useRun((s) => s.pledgesKept);
  const choices = offered(pledge);
  const cost = pledgeCost(kept);
  const spot: [number, number, number] = [at[0] + VOW_OFF, 0, at[2] + VOW_OFF];
  return (
    <>
      {/* A leaning marker stone, so there is something to walk up to. */}
      <mesh position={[spot[0], 0.62, spot[2]]} rotation={[0, 0.4, 0.06]} castShadow>
        <boxGeometry args={[0.5, 1.24, 0.22]} />
        <meshStandardMaterial color={pledge ? "#7b6a4a" : "#575249"} roughness={0.95} />
      </mesh>
      {choices.map((p, i) => (
        <InteractTrigger
          key={p.id}
          position={[spot[0] + (i - 1) * VOW_SPREAD, 0, spot[2]]}
          label={`Swear ${p.name} - ${p.vow}. ${cost} alarm now, ${p.pays} gems at the stair`}
          enabled
          radius={CLOSE_REACH}
          onInteract={() => useRun.getState().takePledge(p.id)}
        />
      ))}
      {pledge && (
        <InteractTrigger
          position={spot}
          label="You have sworn on this floor already"
          enabled={false}
          blockedReason="One promise a floor. Keep this one first."
          radius={CLOSE_REACH}
          onInteract={() => undefined}
        />
      )}
    </>
  );
}

/** How far off the basin the vow stone stands, and how far apart its three. */
const VOW_OFF = 2.4;
const VOW_SPREAD = 1.4;

registerRoomKind("shrine", Shrine);

/**
 * The room behind the cracked wall, worth the bomb every time: a hoard
 * dressed as a vault, a reliquary with one relic for nothing, or a shrine
 * for a floor that had none. Which one is the seed's, from one owner.
 */
function Secret({ room }: RoomKindProps) {
  const flavour = useRun((s) => (s.dungeon ? secretFlavour(s.dungeon) : null));
  const seed = useRun((s) => s.dungeon?.seed ?? 0);
  const floor = useRun((s) => s.floor);
  // Chosen once, from what the player did not hold when the room was
  // first drawn: taking it must not roll the stand a second relic.
  const relic = useMemo(() => {
    const held = useRun.getState().relics;
    const rng = createRng(`${seed}:${room.id}:reliquary`);
    return shuffle(rng, RELIC_IDS.filter((id) => !held.includes(id)))[0] ?? null;
  }, [seed, room.id]);
  if (flavour === "shrine") return <Shrine room={room} />;
  if (flavour === "reliquary") {
    return (
      <>
        <Dressed room={room} />
        {relic && <RelicStand id={relic} position={quadrantSpots(room, "far")[0]} floor={floor} price={0} />}
      </>
    );
  }
  return <Dressing room={room} seed={seed} hoard />;
}

registerRoomKind("secret", Secret);
registerRoomKind("start", Dressed);
registerRoomKind("end", Dressed);
registerRoomKind("normal", Dressed);
registerRoomKind("treasure", Dressed);
registerRoomKind("trap", Dressed);
registerRoomKind("shop", Shop);
registerRoomKind("library", Library);
