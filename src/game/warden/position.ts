/**
 * Where the Warden stands, in the room it is in.
 *
 * Module data rather than store state, because it changes every frame it
 * walks and nothing should re-render for that. Written by the Warden
 * itself and read by what flees it - the rats, whose scattering out of a
 * doorway is how a player learns it is behind them. `roomId` is null while
 * it is not in any mounted room. The dev probe `__warden` is a copy of
 * this, not a second owner.
 */
export const wardenAt: { x: number; z: number; roomId: string | null } = { x: 0, z: 0, roomId: null };
