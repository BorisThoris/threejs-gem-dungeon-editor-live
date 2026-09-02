import React from "react";
import { useTheme } from "../themes";

interface JsonTextureDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  width: number;
  height: number;
  pixels: string[];
}

interface JsonTextureGridProps {
  texture: JsonTextureDefinition;
  size?: number;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const JsonTextureGrid: React.FC<JsonTextureGridProps> = ({
  texture,
  size = 64,
  onClick,
  className,
  style,
}) => {
  const { currentTheme } = useTheme();

  const pixelSize = Math.floor(size / Math.max(texture.width, texture.height));

  return (
    <div
      className={className}
      style={{
        display: "inline-block",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      onClick={onClick}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${texture.width}, ${pixelSize}px)`,
          gridTemplateRows: `repeat(${texture.height}, ${pixelSize}px)`,
          gap: "0",
          border: `1px solid ${currentTheme.border}`,
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {texture.pixels.map((color, index) => (
          <div
            key={index}
            style={{
              width: `${pixelSize}px`,
              height: `${pixelSize}px`,
              backgroundColor: color,
              imageRendering: "pixelated",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default JsonTextureGrid;
