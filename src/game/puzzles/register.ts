import { registerRoomKind } from "../rooms/kinds";
import { challengeAnchors, memoryAnchors } from "./anchors";
import { ChallengeRoom } from "./ChallengeRoom";
import { MemoryRoom } from "./MemoryRoom";

/**
 * The two room kinds whose content is a puzzle. Registered from here so the
 * room shell never imports puzzle code; importing this module is enough.
 */
registerRoomKind("memory", MemoryRoom, memoryAnchors);
registerRoomKind("challenge", ChallengeRoom, challengeAnchors);
