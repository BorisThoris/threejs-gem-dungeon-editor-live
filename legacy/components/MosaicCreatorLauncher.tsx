import React from "react";
import MosaicCreator from "./primitives/objects/MosaicCreator";
import SharedNavigation from "./SharedNavigation";

const MosaicCreatorLauncher: React.FC = () => {
  return (
    <>
      <SharedNavigation currentPage="mosaic-creator" />
      <MosaicCreator />
    </>
  );
};

export default MosaicCreatorLauncher;
