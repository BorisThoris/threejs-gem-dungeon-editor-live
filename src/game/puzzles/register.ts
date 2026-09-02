import { registerRoomKind } from "../rooms/kinds";
import { ChallengeRoom } from "./ChallengeRoom";
import { MemoryRoom } from "./MemoryRoom";

/**
 * The two room kinds whose content is a puzzle. Registered from here so the
 * room shell never imports puzzle code; importing this module is enough.
 */
registerRoomKind("memory", MemoryRoom);
registerRoomKind("challenge", ChallengeRoom);
