import React from "react";
import RoomBuilder from "../components/RoomBuilder";
import SharedNavigation from "../components/SharedNavigation";

const RoomBuilderPage: React.FC = () => {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <SharedNavigation currentPage="room-builder" />
      <div style={{ flex: 1 }}>
        <RoomBuilder />
      </div>
    </div>
  );
};

export default RoomBuilderPage;
