/**
 * Where the camera is pointing.
 *
 * Plain module data, written once a frame by the look controls and read by
 * anything outside the canvas that needs a heading - the minimap turns with
 * it. Deliberately not store state: it changes every frame a mouse moves,
 * and putting it in the store would re-render the HUD at the same rate.
 */
export const look = { yaw: 0, pitch: 0 };
