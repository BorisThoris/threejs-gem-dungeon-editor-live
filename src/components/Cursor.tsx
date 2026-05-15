import React, { useState, useEffect } from "react";

const Cursor: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isMouseLookActive, setIsMouseLookActive] = useState(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Always update cursor position based on mouse movement
      // Constrain mouse position to window boundaries
      const constrainedX = Math.max(
        0,
        Math.min(event.clientX, window.innerWidth)
      );
      const constrainedY = Math.max(
        0,
        Math.min(event.clientY, window.innerHeight)
      );

      setMousePosition({ x: constrainedX, y: constrainedY });
    };

    const handleResize = () => {
      // If cursor is at center, keep it centered after resize
      if (
        mousePosition.x === window.innerWidth / 2 &&
        mousePosition.y === window.innerHeight / 2
      ) {
        setMousePosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
      } else {
        // Constrain existing position to new window size
        const constrainedX = Math.max(
          0,
          Math.min(mousePosition.x, window.innerWidth)
        );
        const constrainedY = Math.max(
          0,
          Math.min(mousePosition.y, window.innerHeight)
        );
        setMousePosition({ x: constrainedX, y: constrainedY });
      }
    };

    const handlePointerLockChange = () => {
      const locked = !!document.pointerLockElement;
      setIsPointerLocked(locked);
      setIsMouseLookActive(locked);

      // When pointer lock changes, update cursor position
      if (locked) {
        // When locked, cursor should be at center (where we're looking)
        setMousePosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
      }
    };

    // Add event listeners
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);
    document.addEventListener("pointerlockchange", handlePointerLockChange);

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange
      );
    };
  }, [mousePosition.x, mousePosition.y, isPointerLocked]);

  // Only render custom cursor when mouse look is active
  if (!isMouseLookActive) {
    return null; // Use default cursor when not in mouse look mode
  }

  return (
    <div
      style={{
        position: "fixed",
        top: mousePosition.y,
        left: mousePosition.x,
        transform: "translate(-50%, -50%)",
        width: isPointerLocked ? "20px" : "24px",
        height: isPointerLocked ? "20px" : "24px",
        border: isPointerLocked ? "2px solid #00ff00" : "3px solid #ffffff",
        borderRadius: "50%",
        backgroundColor: isPointerLocked
          ? "rgba(0, 255, 0, 0.3)"
          : "rgba(255, 255, 255, 0.2)",
        pointerEvents: "none",
        zIndex: 1000,
        transition: "all 0.1s ease",
        boxShadow: isPointerLocked
          ? "0 0 15px rgba(0, 255, 0, 0.8)"
          : "0 0 10px rgba(255, 255, 255, 0.5)",
      }}
    />
  );
};

export default Cursor;
