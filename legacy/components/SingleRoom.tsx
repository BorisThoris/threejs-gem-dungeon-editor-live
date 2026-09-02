import React from "react";
import RoomFactory from "./primitives/game-rooms/RoomFactory";

interface SingleRoomProps {
  currentRoomId: string | null;
  onRoomChange?: (roomId: string) => void;
}

const SingleRoom: React.FC<SingleRoomProps> = ({
  currentRoomId,
  onRoomChange,
}) => {
  return (
    <RoomFactory currentRoomId={currentRoomId} onRoomChange={onRoomChange} />
  );
};

export default SingleRoom;
