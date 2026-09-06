/**
 * Every number the world is built from, in one place.
 *
 * The old tree had five separate opinions about where the floor was
 * (roomHeight, GROUND_LEVEL, a 1.1x room scale, spawn y = 0.5, a 1.5 guessed
 * against a floor "typically at -0.5") and every bug fixed in its last week
 * was two of them disagreeing. A fact lives here or it does not exist.
 */

// --- Geometry --------------------------------------------------------------

/** The one ground plane. Every floor's top surface is here. */
export const GROUND_Y = 0;
/** Floors are solid slabs; a plane lets a fast body tunnel through. */
export const FLOOR_THICKNESS = 1;
export const WALL_HEIGHT = 5;
export const WALL_THICKNESS = 0.4;
/** Width of the gap cut in a wall for a doorway. */
export const DOOR_WIDTH = 3;
export const DOOR_HEIGHT = 3.4;

/** Player capsule: cylinder half-height and cap radius. */
export const PLAYER_CAPSULE_HALF_HEIGHT = 0.8;
export const PLAYER_CAPSULE_RADIUS = 0.3;
/** Body centre when standing on the ground. */
export const PLAYER_REST_Y =
  GROUND_Y + PLAYER_CAPSULE_HALF_HEIGHT + PLAYER_CAPSULE_RADIUS;
/** Spawn a hair above rest so the player settles down, not up out of the floor. */
export const PLAYER_SPAWN_Y = PLAYER_REST_Y + 0.05;
/** Camera height above the body centre. */
export const EYE_OFFSET = 0.5;

/** How close the player must stand for a door, counter or lectern to offer itself. */
export const INTERACT_RADIUS = 3;
/**
 * How close the player must stand for something small to offer itself.
 *
 * Tighter than `INTERACT_RADIUS`, which is what a door, a shop counter or a
 * lectern uses: a chest, a crystal on its pedestal and a key on the floor
 * stand near other things of their own kind, and a generous reach turns the
 * arbitration between them into a coin toss. It was the same literal in
 * three components and nothing that reasons about reach could read it - so
 * the check that asks whether a room's own content can be walked up to had
 * no number to ask with.
 */
export const CLOSE_REACH = 2.2;

/**
 * How far inside the room the player lands after travelling. Clear of the
 * interact radius of the door they came through, so the new room does not
 * greet them with an offer to go straight back.
 */
export const entranceDepth = (halfSize: number): number =>
  Math.min(INTERACT_RADIUS + 0.5, halfSize * 0.6);

/**
 * The longest a single frame is allowed to count for.
 *
 * A frame delta is how much time passed, and everything that reads one is
 * being asked to believe that whatever it saw at the end of the frame was
 * true for all of it. Over sixteen milliseconds that is close enough. Over
 * nine hundred - a collection, a room mounting, a window coming back to
 * the front - it is a fiction, and every place in this game that believed
 * it did so in the player's disfavour: the Warden crossed four metres in
 * one step, and the Sentry charged a player nine hundred milliseconds of
 * standing in a light the beam had swept past.
 *
 * The physics has said this since the beginning, in Scene.tsx, where the
 * timestep is fixed rather than variable so a hitch cannot integrate a
 * whole second of gravity and tunnel the player through the floor. This is
 * the same rule for everything that is not physics. A twentieth of a
 * second is longer than a frame on anything the game is meant to run on,
 * so it never binds in play; below that the game is charging the player
 * for time it did not watch, and it stops.
 *
 * A cap is not always the right shape for it, and the Sentry is where that
 * was learned. Capping each frame's worth of light stopped a hitch
 * convicting a player the instant the beam touched them, and it also
 * capped the counting: below about twelve frames a second a motionless
 * player was never called out at all, which is half the room's promise
 * quietly switched off. It measures a span now instead - the clock read
 * when the light arrives, and how long ago that was - which has neither
 * problem and needs no constant. Where a thing is being *moved* by a
 * delta, cap it; where a thing is being *timed*, read the clock twice.
 */
export const MAX_FRAME_S = 1 / 20;

/**
 * How long a passing line stays on screen, on the run's clock.
 *
 * The run's clock and not the wall's, because a player who opens the pause
 * menu to read a line the game has just given them should not come back to
 * find it gone.
 */
export const NOTICE_HOLD_S = 6.5;

// --- Movement --------------------------------------------------------------

export const WALK_SPEED = 5;
export const DASH_SPEED = 8;
/** Terminal velocity: keeps every physics step inside the floor's thickness. */
export const MAX_FALL_SPEED = 25;
/**
 * The player cannot jump and the world is flat, so upward motion is only
 * ever the solver pushing the capsule out of something. Capped low enough
 * that it never reads as a launch, but not zero: de-penetration is how the
 * player gets out of geometry they end up inside.
 */
export const MAX_RISE_SPEED = 2;
export const GRAVITY_SCALE = 2;
export const MOUSE_SENSITIVITY = 0.0016;
export const GAMEPAD_LOOK_SPEED = 2.4;
export const CAMERA_FOV = 90;

// --- Room sizes -------------------------------------------------------------

export const ROOM_SIZE_DEFAULT = 16;
export const ROOM_SIZE_SMALL = 14;
export const ROOM_SIZE_LARGE = 24;
export const ROOM_SIZE_HUGE = 30;
/**
 * Every size a room may be, in two-metre steps; the editor offers exactly
 * these and `yarn test:layout` sweeps all of them.
 *
 * There were three, and each kind was pinned to exactly one of them, so
 * two thirds of every room in the game was the same sixteen-metre box -
 * measured over 13,996 rooms: 14m 17.1%, 16m 65.7%, 24m 17.1%, and not one
 * kind that could be built at more than a single size. A room's size is
 * rolled from its kind's range now (`SIZE_RANGE` in dungeon/generate.ts),
 * so two treasure rooms on the same floor are not the same room.
 *
 * The step is two metres rather than one because `shapeFits` changes
 * answer on that scale and the checks sweep every entry: a diamond needs
 * twenty metres to hold its own outer ring of props, a triangle
 * twenty-eight. Both were declared in the shape table and neither had ever
 * been built, because nothing was ever big enough.
 */
export const ROOM_SIZES = [14, 16, 18, 20, 22, 24, 26, 28, 30] as const;

// --- Run rules --------------------------------------------------------------

export const STARTING_LIVES = 3;
/**
 * What the exit charges on the first floor, and how much more it charges on
 * each floor after. The shallowest floor holds about ten gems, so a toll of
 * three was something you tripped over: you took the first three and left,
 * and the rest of the floor may as well not have existed. Rising to seven by
 * the last floor means the deeper floors have to be worked, and the gems you
 * hold over the toll are the ones you get to keep.
 */
export const TOLL_BASE = 3;
export const TOLL_STEP = 2;
/** What the exit charges on a floor, before relics. */
export const tollForFloor = (floor: number): number =>
  TOLL_BASE + TOLL_STEP * (floor - 1);
/**
 * Floors in a run. One floor's shortest path is twenty seconds of walking;
 * three floors, each a fresh dungeon with its toll, is a demo's worth. Lives
 * and gems carry down; the rooms do not.
 */
export const FLOORS = 3;
/**
 * What the shopkeeper charges for a life. A third of the exit toll, so a
 * careless run keeps paying for itself and a careful one gets out sooner.
 */
export const GEMS_PER_LIFE = 1;
/** Seconds of invulnerability after a hit, so one trap cannot chain. */
export const DAMAGE_COOLDOWN_S = 1.5;

// --- The Warden -------------------------------------------------------------

/**
 * One presence walks each floor. It is not fought: it is heard, avoided and
 * outrun. Everything about it scales with the floor's alarm, and alarm is
 * raised by taking gems - so the floor gets more dangerous exactly as far as
 * you have chosen to rob it.
 *
 * What it promises the player is one line, and systems/pace.ts holds it
 * to that line across every relic, potion and alarm level: a sprint always
 * gets away, a walk does not. There is always an answer to the Warden and
 * it costs you the noise of making it - the sprint that outpaces it is the
 * sprint it hears. It wins by cornering, by surprise, and by being between
 * you and the door.
 *
 * The comment here used to say its chase speed stays under WALK_SPEED at
 * every level, so a player who keeps moving is never simply caught. That
 * was true of the two numbers below and false of the game: a potion could
 * halve the walk it was measured against.
 */
export const ALARM_PER_GEM = 1;
/** Alarm at which it stops wandering and starts walking towards you. */
export const ALARM_HUNTS_AT = 3;
/** Seconds between room-to-room moves, from calm to fully roused. */
export const WARDEN_STEP_CALM_S = 9;
export const WARDEN_STEP_ROUSED_S = 4;
/** How fast it crosses a room, from calm to fully roused. */
export const WARDEN_SPEED_CALM = 2.2;
export const WARDEN_SPEED_ROUSED = 4.4;
/** Alarm at which the scaling has topped out. */
export const ALARM_MAX = 6;
/** How close it has to be to take a life. */
export const WARDEN_TOUCH_RADIUS = 1.05;
/**
 * The furthest it may cross in a single frame, however long that frame was.
 *
 * It walks by adding `speed * delta` to its position, and nothing bounded
 * the delta. A frame that takes half a second - a room mounting, a
 * collection, a window coming back to the front - moved it two and a half
 * metres in one instant, and a frame that takes eight moved it the length
 * of the dungeon. Measured on the software rasteriser here: a steady 4.4
 * m/s with occasional single frames at twenty-three and thirty-seven. Its
 * own step is already clamped so it lands just inside touching range
 * rather than past the player, so the lunge did not overshoot - it
 * arrived, and struck.
 *
 * The lesson had already been learned across the room, in Scene.tsx: the
 * physics timestep is fixed rather than variable precisely because handing
 * Rapier a whole hitch tunnels the player through the floor. The player is
 * held to a fixed step and the thing chasing them was not, so a hitch moved
 * the threat and not the target - which is the one direction that is never
 * fair, in a game whose only verb against it is running.
 *
 * A quarter of the reach it strikes from, so the player always gets frames
 * between seeing it close and being touched. At 4.4 m/s this only binds
 * below about seventeen frames a second; above that it is inert.
 *
 * That sentence was written when the cap was, and never checked. It is two
 * constants held apart by a third that is not mentioned in either of them,
 * and the failure it hides is silent: a cap that binds in play does not
 * look like a bug, it looks like a Warden that is easy to walk away from.
 * `MAX_FRAME_S` above already says what the slowest frame the game reckons
 * with is, so `yarn test:layout` now asserts that the fastest Warden's step
 * over that frame still fits under the cap - 0.22 against 0.2625, which is
 * a fifth of margin and a real tripwire rather than a comfortable one.
 *
 * Below that frame rate the cap does bind and the Warden slows: measured on
 * the software rasteriser this project tests on, four frames a second gives
 * it 0.94 m/s against a nominal 4.4, which is a quarter of a walking
 * player. That is the correct behaviour - it is the rule that the game does
 * not charge the player for time nobody rendered - but it means the chase
 * cannot be played out on such a machine, and no measurement of it taken
 * there is a measurement of the chase.
 */
export const WARDEN_MAX_STEP = WARDEN_TOUCH_RADIUS / 4;

/**
 * How long after walking into the room it will not strike.
 *
 * `WARDEN_MAX_STEP` guarantees frames between seeing it close and being
 * touched, and it guards the walk. It does not guard the arrival: the
 * Warden enters at the doorway it came through, and a player standing in
 * that doorway - which is where a player who has just walked in, or is
 * about to walk out, is standing - had it appear on top of them and take a
 * life in the same frame. Measured: gap on arrival 0.00, struck, three
 * lives to two, with nothing on screen beforehand. The promise that it can
 * never appear on top of you was true of one route in and false of the
 * other.
 *
 * Half a second, on the run's clock. A sprint pulls away from a fully
 * roused Warden at 3.6 m/s, so half a second is the reach it strikes from
 * and change - enough that running works and standing still does not,
 * which is the same bargain the rest of the floor makes.
 */
export const WARDEN_ARRIVAL_GRACE_S = 0.5;
/**
 * The floor's own spikes do not care which of you stands on them.
 *
 * The Warden could not be fought, and that was the whole design: the only
 * answer to it was to leave, and every relic, potion and scroll that
 * touched it bought distance rather than a fight. That reading held right
 * up until a player walked backwards into a trap room and watched it come
 * straight through three patches of spikes without breaking stride, and
 * what it says there is not "it cannot be fought" but "the room is not
 * real". A dungeon whose hazards apply to one of the two things in it is
 * a stage set.
 *
 * So the spikes bite it, and the design pillar survives intact, because a
 * wound is not a fight: it is thrown back and slowed, never killed. What
 * the player gains is a reason to fight on chosen ground - to walk to the
 * trap room rather than away from it, and to put a patch between
 * themselves and the thing coming - and what they pay is that the trap
 * room's spikes are still spikes, and standing where the line crosses one
 * means standing very near it.
 *
 * It learns, which is what stops this becoming the answer to the floor
 * rather than an answer on it. Two wounds rout it; after that it walks
 * round what hurt it for the rest of the floor, and the player is back to
 * running. Two, not one, because one is an accident and the second is the
 * player proving they meant it.
 */
export const WARDEN_STAGGER_S = 3.5;
export const WARDEN_WOUNDS_TO_ROUT = 2;
/** How much a rout takes off the floor's alarm. Never below its baseline. */
export const WARDEN_ROUT_CALM = 1;
/**
 * How wide a berth a wary Warden gives a patch it has been bitten by.
 *
 * The patch's own reach plus the room it needs to turn: steering at the
 * edge of the reach means clipping it on the frame the turn begins, which
 * reads as the avoidance not working rather than as a near miss.
 */
export const WARDEN_HAZARD_BERTH = 0.9;

/** Doorways it is thrown back when it lands a hit. */
export const WARDEN_BANISH_DISTANCE = 3;

/**
 * The bomb: set down, a fuse, a blast.
 *
 * No combat, but leverage. Long enough to walk out of and short enough to
 * matter; wide enough to reach the wall it is set against at arm's length
 * and never as wide as half the smallest room, or every bomb would be a
 * skeleton key that opens the room's own doorways from its middle.
 */
export const BOMB_FUSE_S = 3;
export const BOMB_RADIUS = 3.2;
/**
 * How long a sprint keeps the Warden pointed at you after you stop.
 *
 * A dash is half again a walk and used to cost nothing, so the whole game
 * was played holding shift and the speed was not a choice. It is loud
 * instead: while you run, and for a few seconds after, the Warden knows
 * which room you are in and walks towards it whatever the alarm says.
 * Walking is quiet. Long enough that crossing a room at a run is a
 * commitment; short enough that stopping is a real answer.
 */
export const NOISE_HOLD_S = 4;

// How long a floor is left alone before it wakes scales with depth, and so
// lives with the rest of the descent in `floorRules` below.

// --- The Sentry -------------------------------------------------------------

/**
 * A watcher on a post, turning a beam around an otherwise ordinary room.
 *
 * The Warden roams and this does not, which is the point of having both:
 * one makes you leave, the other makes you time your crossing. It never
 * takes a life - being seen rouses the floor and tells the Warden where you
 * are, which is worse than a life and is felt later rather than at once.
 *
 * How many of a floor's plain rooms get one is a per-floor matter and lives
 * in `floorRules` below; the first floor gets none, because that is where a
 * player learns the dungeon and a room that punishes walking through it is
 * not the place to do that.
 *
 * What these four numbers mean together is `sentry/beam.ts`, and
 * `yarn test:layout` holds them to one line: standing still in the light is
 * always seen, and walking out of it never is. The margin on the second is
 * thinner than it looks - 0.84 seconds to leave against 0.9 before it
 * calls, at the far edge of the beam's reach - which is the room working as
 * intended and is now written down instead of being a coincidence.
 */
/** Radians a second, and how wide the beam is either side of centre. */
export const SENTRY_SPIN = 0.55;
export const SENTRY_HALF_ANGLE = 0.42;
export const SENTRY_RANGE = 11;
/** Seconds held in the light before it calls out. */
export const SENTRY_PATIENCE = 0.9;
/** How much being seen rouses the floor, and how long before it can again. */
export const SENTRY_ALARM = 1;
export const SENTRY_COOLDOWN_S = 6;

// --- Barring a doorway ------------------------------------------------------

/**
 * The one thing the player can do to the dungeon itself.
 *
 * Everything else in the run is done to the player's own state - what they
 * carry, how fast they move, how much light they show. A bar is done to
 * the floor: a doorway goes out of the Warden's map, and it has to walk
 * round. That is a different kind of answer from running, and it is the
 * only one that is about the shape of the place rather than about speed.
 *
 * It is loud, which is the price and also the joke - you are hammering a
 * plank across a doorway in a dungeon whose only threat hunts by sound, so
 * the thing you just made take the long way round now knows exactly which
 * way you went. A bar buys distance and spends surprise.
 *
 * One at a time. Two would let a player wall themselves into a corner of
 * the floor and wait, which is not a decision, it is a hiding place - and
 * the Warden's whole job is that there is nowhere to wait.
 *
 * The Warden can break one, and will when there is no way round: a bar
 * must never make a room it cannot reach, or a player could shut it out of
 * the half of the floor they are working. Breaking costs it a step and is
 * heard across the floor, so the player always learns the bar has gone.
 */
export const BAR_S = 45;
/**
 * How long the hammering keeps the player placed, over the four seconds a
 * sprint does.
 *
 * Longer, because it is a louder noise made in one spot for several
 * seconds rather than footsteps passing through. It is the largest single
 * "here I am" in the game, and it should be: what it buys is the biggest.
 */
export const BAR_NOISE_S = 8;
/** Steps it loses breaking through one, when there is no way round. */
export const BAR_BREAK_STEPS = 1;

// --- The lantern ------------------------------------------------------------

/**
 * The light you carry, and the second bargain in the game.
 *
 * The first is the sprint: fast, or unnoticed. It is the best thing in the
 * run and for a long time it was the only one - every other decision was
 * about gems, and every moment-to-moment decision was that same one
 * question asked again. The lantern is its twin, asked once a room instead
 * of once a corridor: *seeing, or unseen*.
 *
 * It starts down, and that matters. Raised was the obvious default - it
 * is the light, why would you not have it - and it made every run open
 * with the Warden already walking towards the player and every watcher
 * twice as quick, from the first second, with nothing done to deserve it.
 * Three checks that had held for months failed at once and were right to.
 * Down is the game as it was; up is a thing the player chooses and pays
 * for, which is the only way a bargain is one.
 *
 * Raised, you see the room: a wide, warm light that reaches most of the
 * way across an ordinary one. It also puts you on a dark floor holding the
 * only bright thing on it - the Warden walks straight for the room you are
 * in, exactly as it does while you are running, and a watcher's beam needs
 * half as long to be sure of you.
 *
 * Lowered, you have a hand's worth of glow and the floor's own braziers,
 * and nothing knows where you are.
 *
 * It burns only while raised, which is what makes it a decision rather
 * than a countdown: a player who keeps it down never runs out, and the oil
 * is spent on the rooms they chose to actually look at. It is filled from
 * the braziers, which are the brightest thing in any room and therefore
 * the worst place to stand - the same trade, one more time, in the way you
 * fix it.
 *
 * The deeper floors are darker, and that is the point: this is worth the
 * most exactly where being seen costs the most.
 */
export const LANTERN_FULL_S = 150;
/**
 * How long the Warden keeps walking towards you after the light goes down.
 *
 * The sprint's is four seconds and this is three, and the difference is
 * the argument: a sound is over the moment it stops, while a light was a
 * thing it was looking at. Shorter than the sprint's only because putting
 * a lantern down is instant and stopping a run is not.
 */
export const LANTERN_SEEN_HOLD_S = 3;
/** Reach and candela, raised and lowered. */
export const LANTERN_RANGE_UP = 15;
export const LANTERN_RANGE_DOWN = 5;
export const LANTERN_INTENSITY_UP = 24;
export const LANTERN_INTENSITY_DOWN = 4;
/**
 * What a raised lantern does to a watcher's patience, as a multiplier.
 *
 * Half. The beam takes 0.9 seconds to be sure of someone in it, and
 * `yarn test:layout` holds that number against the margin a player has to
 * walk out - 0.84 seconds at the far edge of its reach, which is thin on
 * purpose. Halving it means a lit player in a watched room is called out
 * before they can cross it, and that is the whole reason to put the
 * lantern down in a room with a post in it.
 */
export const LANTERN_SEEN_FACTOR = 0.5;
/**
 * How close a brazier has to be to fill from.
 *
 * Small, and it took a failing check to say how small. A room's own
 * content - a crystal on its pedestal, a lectern, an idol - is offered
 * within `CLOSE_REACH`, and the one interaction verb picks the nearest
 * thing that can be used. At 2.4 a corner brazier reached far enough to
 * win that arbitration from the memory trial's crystals, so pressing E at
 * a crystal filled the lantern and the trial could not be played at all:
 * the prompt list read "Choose this crystal, Fill your lantern, Watch".
 * Under `CLOSE_REACH` means a brazier never beats a thing a room put
 * there on purpose, and `yarn test:layout` holds it to that against the
 * clearance the dressing already keeps around a brazier.
 */
export const LANTERN_FILL_REACH = 1.5;

// --- The Cutpurse ------------------------------------------------------------

/**
 * The third thing in the dungeon, and the first one that wants something.
 *
 * The Warden makes you leave a floor and the Sentry makes you time your
 * crossing of a room. Both of them are answered by moving well, which
 * means the whole game was one verb played at two tempos. This one is
 * answered by *reacting*: it comes for what you are carrying, and the
 * moment it has it the question is no longer where to walk but whether
 * your hand got to shift in time.
 *
 * It cannot hurt you and it never will. What it takes is gems, which is
 * the only currency in the run, and it does not destroy them - it carries
 * them to a nest somewhere on the floor, and the nest is on the map from
 * the moment it robs you. So a theft is not a loss, it is a detour, priced
 * in exactly the thing the whole game is about: how much further into a
 * roused floor is this worth walking?
 *
 * It arrives on floor two. Floor one is where the dungeon is learned and
 * a thing that takes your gems while you are learning what a gem is for
 * is not the place to start.
 */
export const CUTPURSE_FROM_FLOOR = 2;
/**
 * How fast it moves coming in, and going out with your gem.
 *
 * Six against a walk of five and a sprint of eight: a walk never closes on
 * it and a sprint closes at two metres a second, which over the second and
 * a half it takes to reach a doorway is a metre and a half of ground - so
 * catching it is holding shift the instant you hear it, and not otherwise.
 * `systems/pace.ts` holds those three numbers to that sentence, over every
 * relic and potion in the game, and writes down the two places where the
 * sentence stops being true: Soft Boots make a walk enough, and a Potion
 * of Mire makes a sprint not enough. Both are the item doing its job, and
 * both are checked rather than discovered.
 */
export const CUTPURSE_SPEED = 6;
/** How close it has to get to take something, and to be caught. */
export const CUTPURSE_TOUCH_RADIUS = 1.1;
/**
 * Seconds it waits in the dark before trying again, after a theft and
 * after being caught.
 *
 * Longer after being caught: it has been hurt, and a player who reacted in
 * time should get more than four seconds of peace for it. Not so long that
 * a floor only ever sees it once - the nest is worth walking to, and one
 * gem is rarely worth the walk.
 */
export const CUTPURSE_REST_S = 22;
export const CUTPURSE_SHY_S = 40;
/** Rooms entered on a floor before it takes an interest. */
export const CUTPURSE_GRACE_ROOMS = 2;

// --- The descent ------------------------------------------------------------

/**
 * What changes on the way down.
 *
 * The floors used to differ only in what the exit charged, which made the
 * descent an arithmetic problem rather than a journey: the third floor was
 * the first floor with a bigger bill. This is the one table that says how a
 * floor is worse than the one above it, and everything that scales with
 * depth reads it - the generator, the Warden's grace, the alarm a floor
 * starts at, and how many rooms are watched.
 *
 * The arc is deliberate. Floor one is small, unwatched, slow to wake and lit
 * like somewhere people still work: it is where the dungeon is learned.
 * Floor two is bigger, colder, has watchers, and is already stirring when
 * you arrive. Floor three is the bottom of something - large enough to get
 * lost in, watched almost everywhere, one gem away from being hunted the
 * moment you step off the stair, and dark enough that the braziers are the
 * only reason a corner has anything in it.
 */
export interface FloorRules {
  /** Rooms the floor is generated with, including start and end. */
  minRooms: number;
  maxRooms: number;
  /** Rooms entered before the Warden wakes on this floor. */
  wardenGrace: number;
  /** How roused the floor already is when you arrive. */
  startingAlarm: number;
  /** Share of the floor's plain rooms that get a Sentry. */
  sentryChance: number;
  /**
   * The one line the player is shown on arriving. It says what the row above
   * it does, in words, so the numbers and what the player is told cannot
   * drift apart.
   */
  blurb: string;
  /**
   * How the floor is lit. Difficulty a player has to infer from being
   * caught; light they read the moment they arrive, which is why it belongs
   * in this row and not in a theme file of its own. Deeper means dimmer and
   * colder-cast, so the braziers stop being decoration and start being the
   * only reason a corner is visible.
   */
  light: {
    /** Ambient and hemisphere intensity for the whole scene. */
    ambient: number;
    /** The colour the hemisphere light casts from above. */
    sky: string;
    /** The room's overhead fill, in colour and candela. */
    fill: string;
    fillIntensity: number;
    /** How far down a room you can see before the dark takes it. */
    fogFar: number;
  };
}

const DESCENT: readonly FloorRules[] = [
  {
    minRooms: 8,
    maxRooms: 10,
    wardenGrace: 3,
    startingAlarm: 0,
    sentryChance: 0,
    blurb: "The upper vaults. Quiet, unwatched, and slow to notice you.",
    light: { ambient: 0.7, sky: "#9fb4d8", fill: "#ffd9a8", fillIntensity: 18, fogFar: 46 },
  },
  {
    minRooms: 10,
    maxRooms: 13,
    wardenGrace: 2,
    startingAlarm: 1,
    sentryChance: 0.45,
    blurb: "Deeper. The halls are wider, watchers stand in them, and something is already stirring.",
    light: { ambient: 0.5, sky: "#7f96bd", fill: "#cfe0dc", fillIntensity: 14, fogFar: 41 },
  },
  {
    /**
     * Thirteen, not twelve, and the reason is the toll rather than the size.
     *
     * A floor's guaranteed gems - the ones not behind the locked vault and
     * not a reward for solving a puzzle or surviving the arena - have to
     * cover the exit and leave at least one, or paying it means taking
     * literally every gem on the floor: which is exactly what wakes the
     * Warden, on the floor that already starts at alarm 2, and leaves no
     * margin for a gem the player judges not worth the risk. At twelve the
     * worst seed in four hundred was exactly break-even; at thirteen the
     * worst leaves two.
     */
    minRooms: 13,
    maxRooms: 16,
    wardenGrace: 1,
    startingAlarm: 2,
    sentryChance: 0.65,
    blurb: "The bottom. Watched almost everywhere, and one gem from being hunted. Take what you can and climb.",
    light: { ambient: 0.34, sky: "#9c6a72", fill: "#ffae96", fillIntensity: 11, fogFar: 36 },
  },
];

/**
 * The rules for a floor, 1-based. Floors past the last described one keep
 * the last row, so adding a floor to FLOORS is playable before it is tuned.
 */
export function floorRules(floor: number): FloorRules {
  const i = Math.max(0, Math.min(DESCENT.length - 1, Math.round(floor) - 1));
  return DESCENT[i];
}

// --- The arena --------------------------------------------------------------

/**
 * The arena's gem sits on a plinth in the middle, and lifting it bars the
 * doors and starts the arms turning.
 *
 * Three arms of spikes sweep the whole floor, so there is no corner to wait
 * in: the only safe ground is the turning gap between two arms, and staying
 * in it means walking a circle for as long as it lasts. The maths of that
 * is the design, and `yarn test:layout` reads it off the numbers here
 * rather than off this paragraph, which had drifted. The tightest circle a
 * player can hold needs 0.90 units a second against the slowest walk in the
 * game, which is a mired 3.25; out at the wall it needs 8.77 against a
 * sprint of 8, so the outside cannot be held at all without a potion. So
 * the room teaches you to run its inside line, a Potion of Swiftness is
 * worth drinking here - with the boots it is the only way to hold the wall
 * - and a Potion of Mire costs you the outer half of the room.
 *
 * The rings run out to the corners of the room's box, not to the edge of
 * the floor it draws. A shaped arena still has square walls, so a player
 * can stand where the polygon does not reach - and with the rings stopping
 * at the polygon, those four corners were the safest ground in a room whose
 * whole promise is that there is nowhere safe to stand.
 *
 * Which ground the arms actually cover is `arena/sweep.ts`, and it is
 * checked rather than reasoned about: the corners were not the only place
 * this room had got wrong.
 */
export const ARENA_WIND_UP_S = 2;
export const ARENA_DURATION_S = 14;
export const ARENA_ARMS = 3;
/**
 * Innermost ring, and the gap between rings. Rings run out to the corners.
 *
 * The innermost was 2.4, and a patch reaches 1.2, so no arm ever came
 * within 1.2 of the middle. A player stands 0.8 from the plinth's axis,
 * which put the spot they take the gem from inside that hole: taking it and
 * not moving was the safest play in the room. See `arena/sweep.ts`.
 */
export const ARENA_INNER_RADIUS = 1.8;
export const ARENA_RING_GAP = 2;
/** Radians a second. One turn takes about eight seconds. */
export const ARENA_SPIN = 0.75;
/** If a room never reports itself mounted, hand control back anyway. */
export const TRANSITION_FALLBACK_MS = 1500;

/**
 * The floor's patience, and what wakes when it runs out.
 *
 * Every floor puts up with the player for FLOOR_PATIENCE_S on the run's
 * clock and then the Reaper is on it: a ghost body - through walls, spikes,
 * wards and furniture - that has no room, no alarm and no lure, does not
 * leave, and follows through every doorway the player takes. It is faster
 * than a walk and slower than a dash, so lingering cannot be walked away
 * from and the exit can still be run for; and a dash is the loud thing
 * the Warden hears. Spelunky's ghost and Barony's minotaur, and the shape
 * a run was missing: a reason not to open the last chest.
 *
 * REAPER_WARNING_S before the end the HUD starts counting and the score's
 * heartbeat comes in, so it is never a surprise. A blast holds it for
 * REAPER_STALL_S - longer than a fuse, so a bomb set under it is worth the
 * walk. Between two strikes it waits REAPER_STRIKE_GRACE_S, over and above
 * the damage cooldown, so being caught costs a life and a chance, not a
 * run. It is stepped no further than REAPER_MAX_STEP in one frame for the
 * same reason the Warden is not: a slow frame must not put it on top of
 * you from across the room.
 */
export const FLOOR_PATIENCE_S = 300;
export const REAPER_WARNING_S = 45;
export const REAPER_SPEED = 6.5;
export const REAPER_TOUCH_RADIUS = WARDEN_TOUCH_RADIUS;
export const REAPER_MAX_STEP = REAPER_TOUCH_RADIUS / 2;
export const REAPER_STALL_S = 6;
export const REAPER_STRIKE_GRACE_S = 1.5;
