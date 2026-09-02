import React from "react";
import ThreeDEditor from "../components/ThreeDEditor";
import RoomBuilderPage from "../pages/RoomBuilderPage";
import TexturePainterLauncher from "../components/TexturePainterLauncher";
import MosaicCreatorLauncher from "../components/MosaicCreatorLauncher";
import TexturePainterExample from "../components/TexturePainterExample";
import URLParamTest from "../components/URLParamTest";
import URLDebugTest from "../components/URLDebugTest";
import HandDemo from "../components/HandDemo";

/**
 * Development-only authoring tools.
 *
 * This module is loaded exclusively through a dynamic `import()` that lives
 * inside an `import.meta.env.DEV` branch in `src/App.tsx`. In a production
 * build that branch is statically `false`, so this file - and the ~6k lines of
 * editor / painter / mosaic tooling it pulls in - is never referenced and is
 * dropped from the shipped bundle entirely.
 */

export type DevToolId =
  | "editor"
  | "room-builder"
  | "texture-painter"
  | "mosaic-creator"
  | "texture-painter-example"
  | "url-test"
  | "url-debug"
  | "hand-demo";

interface DevToolRoutesProps {
  tool: DevToolId;
}

const DevToolRoutes: React.FC<DevToolRoutesProps> = ({ tool }) => {
  switch (tool) {
    case "editor":
      return <ThreeDEditor />;
    case "room-builder":
      return <RoomBuilderPage />;
    case "texture-painter":
      return <TexturePainterLauncher />;
    case "mosaic-creator":
      return <MosaicCreatorLauncher />;
    case "texture-painter-example":
      return <TexturePainterExample />;
    case "url-test":
      return <URLParamTest />;
    case "url-debug":
      return <URLDebugTest />;
    case "hand-demo":
      return <HandDemo />;
    default:
      return null;
  }
};

export default DevToolRoutes;
