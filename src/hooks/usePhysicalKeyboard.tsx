import { useState, useEffect } from "react";

export const usePhysicalKeyboard = () => {
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setKeys((prev) => ({
        ...prev,
        [event.code]: true,
      }));
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      setKeys((prev) => ({
        ...prev,
        [event.code]: false,
      }));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return keys;
};
