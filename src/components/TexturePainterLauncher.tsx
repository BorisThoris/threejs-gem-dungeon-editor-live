import React from "react";
import TexturePainter from "./TexturePainter";
import SharedNavigation from "./SharedNavigation";

const TexturePainterLauncher: React.FC = () => {
  return (
    <>
      <SharedNavigation currentPage="texture-painter" />
      <TexturePainter />
    </>
  );
};

export default TexturePainterLauncher;
