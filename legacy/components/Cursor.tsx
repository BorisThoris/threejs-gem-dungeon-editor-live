import React, { useEffect, useState } from "react";

/**
 * The reticle drawn while the player is holding right-click to look around.
 *
 * It used to track the mouse: a `mousemove` listener called `setMousePosition`
 * on every event, and because the effect listed `mousePosition.x`,
 * `mousePosition.y` and `isPointerLocked` in its dependency array, every one of
 * those events also tore down and re-attached all three listeners. During a
 * look that is a React re-render plus six listener registrations per mouse
 * event, hundreds of times a second.
 *
 * All of that work was invisible. The component renders nothing unless the
 * pointer is locked, and while the pointer is locked the browser stops updating
 * clientX/clientY - the code even forced the position back to the window centre
 * on lock. So the reticle was always dead centre no matter what the tracking
 * computed. It is now simply a centred reticle, shown while the pointer is
 * locked, with one listener that is attached once.
 */
const Cursor: React.FC = () => {
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsPointerLocked(!!document.pointerLockElement);
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    handlePointerLockChange();

    return () => {
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange
      );
    };
  }, []);

  // Use the default cursor when not in mouse look mode.
  if (!isPointerLocked) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "20px",
        height: "20px",
        border: "2px solid #00ff00",
        borderRadius: "50%",
        backgroundColor: "rgba(0, 255, 0, 0.3)",
        pointerEvents: "none",
        zIndex: 1000,
        boxShadow: "0 0 15px rgba(0, 255, 0, 0.8)",
      }}
    />
  );
};

export default Cursor;
