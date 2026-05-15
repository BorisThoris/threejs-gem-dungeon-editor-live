import React from "react";

interface SharedNavigationProps {
  currentPage:
    | "game"
    | "editor"
    | "texture-painter"
    | "mosaic-creator"
    | "room-builder";
  className?: string;
}

const SharedNavigation: React.FC<SharedNavigationProps> = ({
  currentPage,
  className = "",
}) => {
  const navItems = [
    {
      id: "game",
      label: "🎮 Game",
      url: "/",
      description: "Main Game",
    },
    {
      id: "editor",
      label: "🔧 3D Editor",
      url: "?editor=true",
      description: "3D Scene Builder",
    },
    {
      id: "room-builder",
      label: "🏗️ Room Builder",
      url: "?room-builder=true",
      description: "Build Rooms from Biomes",
    },
    {
      id: "texture-painter",
      label: "🎨 Texture Painter",
      url: "?texture-painter=true",
      description: "Advanced Texture Painter with Library",
    },
    {
      id: "mosaic-creator",
      label: "🧩 3D Mosaic Creator",
      url: "?mosaic-creator=true",
      description: "Texture Creation Tool",
    },
  ];

  return (
    <nav
      className={className}
      style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.9)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "25px",
        padding: "8px",
        display: "flex",
        gap: "4px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      }}
    >
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => (window.location.href = item.url)}
          style={{
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: "600",
            borderRadius: "20px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "120px",
            justifyContent: "center",
            background:
              currentPage === item.id
                ? "linear-gradient(45deg, #4CAF50, #8BC34A)"
                : "transparent",
            color: currentPage === item.id ? "white" : "#ccc",
            border:
              currentPage === item.id
                ? "2px solid #fff"
                : "2px solid transparent",
          }}
          onMouseEnter={(e) => {
            if (currentPage !== item.id) {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.transform = "translateY(-2px)";
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== item.id) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#ccc";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
          title={item.description}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
};

export default SharedNavigation;
