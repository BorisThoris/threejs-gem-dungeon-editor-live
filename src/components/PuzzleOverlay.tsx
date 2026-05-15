import React, { useEffect, useState } from "react";
import useGameStore from "../store/gameStore";

interface PuzzleOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const PuzzleOverlay: React.FC<PuzzleOverlayProps> = ({
  isVisible,
  onClose,
  children,
  title,
  subtitle,
}) => {
  const { setGamePhase } = useGameStore();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      setGamePhase("puzzle");
      // Lock pointer for first-person controls
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    } else {
      setGamePhase("exploration");
      // Restore pointer lock for first-person controls
      document.body.style.cursor = "none";
      document.body.style.userSelect = "none";
    }
  }, [isVisible, setGamePhase]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isVisible) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: '"Orbitron", "Courier New", monospace',
        color: "#00ff00",
        animation: isAnimating ? "fadeIn 0.3s ease-out" : "none",
        cursor: "default",
        userSelect: "auto",
        overflow: "auto",
      }}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div
          style={{
            textAlign: "center",
            marginBottom: "2rem",
            padding: "0 2rem",
          }}
        >
          {title && (
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                color: "#00ff00",
                margin: "0 0 1rem 0",
                textShadow: "0 0 10px #00ff00",
              }}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              style={{
                fontSize: "1.2rem",
                color: "#ccc",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          maxWidth: "1200px",
          padding: "0 2rem",
        }}
      >
        {children}
      </div>

      {/* Close Button */}
      <div
        style={{
          position: "absolute",
          top: "2rem",
          right: "2rem",
          zIndex: 1001,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "rgba(255, 0, 0, 0.2)",
            border: "2px solid #ff0000",
            color: "#ff0000",
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
            fontFamily: "inherit",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "rgba(255, 0, 0, 0.4)";
            e.currentTarget.style.boxShadow = "0 0 10px #ff0000";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "rgba(255, 0, 0, 0.2)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          ESC - Close
        </button>
      </div>

      {/* Instructions */}
      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          color: "#666",
          fontSize: "0.9rem",
        }}
      >
        Press ESC to close or click the X button
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default PuzzleOverlay;
