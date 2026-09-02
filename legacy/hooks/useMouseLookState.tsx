import { useState, useEffect } from "react";

export const useMouseLookState = () => {
  const [isMouseLookActive, setIsMouseLookActive] = useState(false);

  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsMouseLookActive(document.pointerLockElement !== null);
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);

    return () => {
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange
      );
    };
  }, []);

  return isMouseLookActive;
};
