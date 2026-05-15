import React, { useState, useEffect } from "react";
import * as THREE from "three";

interface GameLoadingScreenProps {
  progress: number;
  status: string;
  onComplete?: () => void;
}

const GameLoadingScreen: React.FC<GameLoadingScreenProps> = ({
  progress,
  status,
  onComplete,
}) => {
  const [dots, setDots] = useState("");

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Complete loading when progress reaches 100%
  useEffect(() => {
    console.log(
      "GameLoadingScreen progress:",
      progress,
      "onComplete:",
      !!onComplete
    );
    if (progress >= 1.0 && onComplete) {
      console.log("GameLoadingScreen triggering onComplete in 500ms");
      setTimeout(onComplete, 500); // Small delay for smooth transition
    }
  }, [progress, onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background:
          "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
        fontFamily: "monospace",
        color: "#ffffff",
      }}
    >
      {/* Game Title */}
      <div
        style={{
          fontSize: "3rem",
          fontWeight: "bold",
          marginBottom: "2rem",
          textShadow: "0 0 20px #00ffff",
          letterSpacing: "0.2em",
        }}
      >
        GHOST DUNGEON
      </div>

      {/* Loading Animation */}
      <div
        style={{
          width: "300px",
          height: "20px",
          border: "2px solid #00ffff",
          borderRadius: "10px",
          overflow: "hidden",
          marginBottom: "2rem",
          boxShadow: "0 0 20px rgba(0, 255, 255, 0.3)",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background:
              "linear-gradient(90deg, #00ffff 0%, #0080ff 50%, #0040ff 100%)",
            transition: "width 0.3s ease-out",
            boxShadow: "0 0 10px #00ffff",
          }}
        />
      </div>

      {/* Progress Text */}
      <div
        style={{
          fontSize: "1.2rem",
          marginBottom: "1rem",
          textAlign: "center",
        }}
      >
        {Math.round(progress * 100)}%
      </div>

      {/* Status Text */}
      <div
        style={{
          fontSize: "1rem",
          color: "#cccccc",
          textAlign: "center",
          minHeight: "1.5rem",
        }}
      >
        {status}
        {dots}
      </div>

      {/* Loading Spinner */}
      <div
        style={{
          marginTop: "2rem",
          width: "40px",
          height: "40px",
          border: "3px solid #333",
          borderTop: "3px solid #00ffff",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />

      {/* CSS Animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default GameLoadingScreen;
