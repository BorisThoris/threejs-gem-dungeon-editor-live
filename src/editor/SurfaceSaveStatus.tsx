import { getSurfaceOverride, listSurfaces, retrySurfaceSave, useSurfaceSaveFailed } from "../game/textures/registry";
import { secondaryButton, small } from "./styles";

/** Both surface tools report the persistence state owned by their shared registry. */
export function SurfaceSaveStatus() {
  const failed = useSurfaceSaveFailed();
  if (!failed) return null;
  return <div role="alert" style={{ ...small, marginBottom: 12 }}>
    Surface changes are only in this session. Browser storage could not save them.
    Download your painted surfaces before closing or reloading, or retry saving.
    <button style={{ ...secondaryButton, marginTop: 8 }} onClick={retrySurfaceSave}>Retry saving surfaces</button>
    {listSurfaces().filter(surface => surface.custom).map(surface => <a key={surface.id}
      style={{ display: "block", color: "inherit", marginTop: 6 }}
      href={getSurfaceOverride(surface.id)} download={`${surface.id}.png`}>Download {surface.id} PNG</a>)}
  </div>;
}
