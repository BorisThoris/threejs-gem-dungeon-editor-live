import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RapierRigidBody } from "@react-three/rapier";

interface PlayerDebuggerProps {
  playerRef: React.RefObject<RapierRigidBody | null>;
}

export function PlayerDebugger({ playerRef }: PlayerDebuggerProps) {
  const debugRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (playerRef.current && debugRef.current) {
      const position = playerRef.current.translation();
      const velocity = playerRef.current.linvel();

      debugRef.current.innerHTML = `
        <div style="color: white; font-family: monospace; font-size: 12px;">
          <div>Position: ${position.x.toFixed(2)}, ${position.y.toFixed(
        2
      )}, ${position.z.toFixed(2)}</div>
          <div>Velocity: ${velocity.x.toFixed(2)}, ${velocity.y.toFixed(
        2
      )}, ${velocity.z.toFixed(2)}</div>
          <div>Speed: ${Math.sqrt(velocity.x ** 2 + velocity.z ** 2).toFixed(
            2
          )}</div>
        </div>
      `;
    }
  });

  return (
    <div
      ref={debugRef}
      style={{
        position: "fixed",
        top: "10px",
        left: "10px",
        background: "rgba(0, 0, 0, 0.7)",
        padding: "10px",
        borderRadius: "5px",
        zIndex: 20000, // High z-index to appear above all game UI
      }}
    />
  );
}
