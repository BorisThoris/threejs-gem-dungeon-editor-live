import React from "react";
import useRoomManagerStore from "../store/roomManagerStore";

interface LoadingScreenProps {
  isVisible: boolean;
  progress?: number;
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isVisible,
  progress = 0,
  message = "Loading...",
}) => {
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000000",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Binding of Isaac style loading screen */}
      <div
        style={{
          textAlign: "center",
          maxWidth: "600px",
          padding: "20px",
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: "3rem",
            marginBottom: "2rem",
            textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
            color: "#ff6b6b",
          }}
        >
          {message}
        </h1>

        {/* Progress bar container */}
        <div
          style={{
            width: "100%",
            height: "20px",
            backgroundColor: "#333333",
            borderRadius: "10px",
            overflow: "hidden",
            marginBottom: "1rem",
            border: "2px solid #555555",
          }}
        >
          {/* Progress bar fill */}
          <div
            style={{
              width: `${Math.max(0, Math.min(100, progress * 100))}%`,
              height: "100%",
              backgroundColor: "#ff6b6b",
              transition: "width 0.3s ease",
              position: "relative",
            }}
          >
            {/* Animated shimmer effect */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "-100%",
                width: "100%",
                height: "100%",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                animation: "shimmer 1.5s infinite",
              }}
            />
          </div>
        </div>

        {/* Progress percentage */}
        <div
          style={{
            fontSize: "1.2rem",
            marginBottom: "2rem",
            color: "#cccccc",
          }}
        >
          {Math.round(progress * 100)}%
        </div>

        {/* Loading dots animation */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: "#ff6b6b",
                borderRadius: "50%",
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite both`,
              }}
            />
          ))}
        </div>

        {/* Tips/loading messages */}
        <div
          style={{
            marginTop: "3rem",
            fontSize: "1rem",
            color: "#888888",
            fontStyle: "italic",
          }}
        >
          {progress < 0.3 && "Preparing the room..."}
          {progress >= 0.3 && progress < 0.6 && "Loading assets..."}
          {progress >= 0.6 && progress < 0.9 && "Setting up environment..."}
          {progress >= 0.9 && "Almost ready..."}
        </div>
      </div>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
          }
          
          @keyframes pulse {
            0%, 80%, 100% { 
              transform: scale(0.8);
              opacity: 0.5;
            }
            40% { 
              transform: scale(1.2);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default LoadingScreen;
