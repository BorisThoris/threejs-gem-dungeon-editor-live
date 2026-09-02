import React, { useEffect, useState, memo } from "react";
import { segmentManager } from "../../../utils/segmentUtils";
import type { RoomSegments } from "../../../utils/segmentUtils";
import WallSegment from "./WallSegment";
import Door from "../../Door";
import DoorTrigger from "../../DoorTrigger";

interface RoomSegmentRendererProps {
  roomId: string;
  roomSize: number;
  wallHeight: number;
  wallThickness: number;
  doorWidth: number;
  connections: string[];
  roomConnections?: string[]; // Actual room connection IDs
  onDoorClick?: (targetRoomId: string, direction: string) => void;
  onSegmentClick?: (segmentId: string) => void;
  onSegmentHover?: (segmentId: string) => void;
  onSegmentUnhover?: (segmentId: string) => void;
}

const RoomSegmentRenderer: React.FC<RoomSegmentRendererProps> = memo(
  ({
    roomId,
    roomSize,
    wallHeight,
    wallThickness,
    doorWidth,
    connections,
    roomConnections,
    onDoorClick,
    onSegmentClick,
    onSegmentHover,
    onSegmentUnhover,
  }) => {
    const [segments, setSegments] = useState<RoomSegments | null>(null);

    useEffect(() => {
      // Initialize segments for this room
      let roomSegments = segmentManager.getRoomSegments(roomId);
      if (!roomSegments) {
        roomSegments = segmentManager.createRoomSegments(roomId);
        // Generate wall segments
        segmentManager.generateWallSegmentsForRoom(
          roomId,
          roomSize,
          wallHeight,
          wallThickness,
          doorWidth,
          connections,
          roomConnections
        );
      }

      // Debug logging removed for performance

      setSegments(roomSegments);

      // Cleanup function
      return () => {
        // Clean up segments when component unmounts or room changes
        segmentManager.clearRoomSegments(roomId);
      };
    }, [
      roomId,
      roomSize,
      wallHeight,
      wallThickness,
      doorWidth,
      connections,
      roomConnections,
    ]);

    if (!segments) {
      return null;
    }

    return (
      <group>
        {/* Render wall segments */}
        {segments.walls.map((segment) => (
          <WallSegment
            key={segment.id}
            segment={segment}
            onSegmentClick={onSegmentClick}
            onSegmentHover={onSegmentHover}
            onSegmentUnhover={onSegmentUnhover}
          />
        ))}

        {/* Render door segments */}
        {segments.doors.map((doorSegment) => (
          <group key={doorSegment.id}>
            <Door
              position={doorSegment.position}
              rotation={doorSegment.rotation}
              targetRoomId={
                doorSegment.targetRoomId || `room_${doorSegment.direction}`
              }
              direction={doorSegment.direction}
              showLabel={true}
            />
            {/*
              Doors are opened by walking up and pressing E, never by clicking
              the panel. The trigger is a sibling of the mesh so the two stay
              independent: the Door draws, the DoorTrigger decides.
            */}
            <DoorTrigger
              position={doorSegment.position}
              label={doorSegment.targetRoomId || doorSegment.direction}
              onEnter={() =>
                onDoorClick?.(
                  doorSegment.targetRoomId || `room_${doorSegment.direction}`,
                  doorSegment.direction
                )
              }
              enabled={Boolean(onDoorClick)}
            />
          </group>
        ))}

        {/* Render floor segments */}
        {segments.floors.map((segment) => (
          <WallSegment
            key={segment.id}
            segment={segment}
            onSegmentClick={onSegmentClick}
            onSegmentHover={onSegmentHover}
            onSegmentUnhover={onSegmentUnhover}
          />
        ))}

        {/* Render ceiling segments */}
        {segments.ceilings.map((segment) => (
          <WallSegment
            key={segment.id}
            segment={segment}
            onSegmentClick={onSegmentClick}
            onSegmentHover={onSegmentHover}
            onSegmentUnhover={onSegmentUnhover}
          />
        ))}
      </group>
    );
  }
);

RoomSegmentRenderer.displayName = "RoomSegmentRenderer";

export default RoomSegmentRenderer;
