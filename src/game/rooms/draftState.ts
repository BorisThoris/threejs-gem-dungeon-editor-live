/**
 * Whether the player is standing in the draft from a cracked wall, for
 * the HUD. Module data, written every frame by the room that has the
 * crack and read by the HUD's poll, because it changes every frame the
 * player moves and nothing should re-render for that. Its own module so
 * the component that writes it exports only a component.
 */
export const draft: { near: boolean; roomId: string | null } = { near: false, roomId: null };
