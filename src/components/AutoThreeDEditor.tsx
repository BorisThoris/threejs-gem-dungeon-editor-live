import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import SharedNavigation from "./SharedNavigation";
import Door from "./Door";
import { useURLParams, parseJSON, serializeJSON } from "../hooks/useURLParams";

// Import the consolidated card system
import { useRoomActions } from "../hooks/useRoomActions";
import { mapToRoomType, hasActionCards } from "../utils/roomTypeMapper";
import RoomActionCards from "./RoomActionCards";

// Import configuration arrays
import { ROOM_CONFIGS } from "../configs/roomConfigs";
import { BIOME_CONFIGS } from "../configs/biomeConfigs";
import { OBJECT_CONFIGS } from "../configs/objectConfigs";
import { ELEMENT_CONFIGS } from "../configs/elementConfigs";
import type { RoomConfig } from "../configs/roomConfigs";

const LoadingFallback: React.FC = () => (
  <Html position={[0, 0, 0]}>
    <div
      style={{
        color: "white",
        background: "rgba(0,0,0,0.8)",
        padding: "20px",
        borderRadius: "8px",
      }}
    >
      Loading components...
    </div>
  </Html>
);

// Main editor component
const AutoThreeDEditor: React.FC = () => {
  const { urlParams, updateURL, getParam } = useURLParams();

  // Add show action cards state - DISABLED (but keep logic)
  const [showActionCards, setShowActionCards] = useState<boolean>(false);

  // Add consolidated card system for biomes - DISABLED (but keep logic)
  const [roomActionCards, setRoomActionCards] = useState<any[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<
    "rooms" | "biomes" | "objects" | "elements"
  >(
    () =>
      (getParam("category") as "rooms" | "biomes" | "objects" | "elements") ||
      "rooms"
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(
    () => getParam("subcategory") || "all"
  );
  const [selectedComponent, setSelectedComponent] = useState<RoomConfig | null>(
    () => {
      const componentType = getParam("componentType");
      const category = getParam("category") as
        | "rooms"
        | "biomes"
        | "objects"
        | "elements";
      console.log(
        "AutoThreeDEditor: Initializing with componentType:",
        componentType,
        "category:",
        category
      );
      if (componentType) {
        let configs = ROOM_CONFIGS;
        if (category === "biomes") configs = BIOME_CONFIGS;
        else if (category === "objects") configs = OBJECT_CONFIGS;
        else if (category === "elements") configs = ELEMENT_CONFIGS;

        console.log(
          "AutoThreeDEditor: Looking in configs:",
          configs.length,
          "items"
        );
        const found = configs.find((config) => config.type === componentType);
        console.log("AutoThreeDEditor: Found component:", found);
        return found || null;
      }
      return null;
    }
  );
  const [selectedObject, setSelectedObject] = useState<RoomConfig | null>(
    () => {
      const objectType = getParam("objectType");
      if (objectType) {
        return (
          OBJECT_CONFIGS.find((config) => config.type === objectType) || null
        );
      }
      return null;
    }
  );
  const [selectedElement, setSelectedElement] = useState<RoomConfig | null>(
    () => {
      const elementType = getParam("elementType");
      if (elementType) {
        return (
          ELEMENT_CONFIGS.find(
            (config: RoomConfig) => config.type === elementType
          ) || null
        );
      }
      return null;
    }
  );

  const [componentProps, setComponentProps] = useState<any>(() =>
    parseJSON(getParam("componentProps"), {})
  );
  const [objectProps, setObjectProps] = useState<any>(() =>
    parseJSON(getParam("objectProps"), {})
  );
  const [elementProps, setElementProps] = useState<any>(() =>
    parseJSON(getParam("elementProps"), {})
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComponents = useCallback(() => {
    try {
      setIsLoading(true);

      // Only set default selections if no URL parameters are present
      const componentType = getParam("componentType");
      const objectType = getParam("objectType");
      const elementType = getParam("elementType");

      if (!componentType && ROOM_CONFIGS.length > 0) {
        setSelectedComponent(ROOM_CONFIGS[0]);
        setComponentProps(ROOM_CONFIGS[0].props || {});
      }
      if (!objectType && OBJECT_CONFIGS.length > 0) {
        setSelectedObject(OBJECT_CONFIGS[0]);
        setObjectProps(OBJECT_CONFIGS[0].props || {});
      }
      if (!elementType && ELEMENT_CONFIGS.length > 0) {
        setSelectedElement(ELEMENT_CONFIGS[0]);
        setElementProps(ELEMENT_CONFIGS[0].props || {});
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load components:", err);
      setError(
        "Failed to load components. Please check the console for details."
      );
      setIsLoading(false);
    }
  }, [getParam]);

  // Load components on mount
  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  // Update URL when category changes
  useEffect(() => {
    updateURL({
      category: selectedCategory,
    });
  }, [selectedCategory, updateURL]);

  // Update URL when subcategory changes
  useEffect(() => {
    updateURL({
      subcategory: selectedSubcategory,
    });
  }, [selectedSubcategory, updateURL]);

  const handleComponentSelect = (component: RoomConfig) => {
    setSelectedComponent(component);
    setComponentProps(component.props || {});
    updateURL({
      componentType: component.type,
      componentProps: serializeJSON(component.props || {}),
    });
  };

  const handleObjectSelect = (object: RoomConfig) => {
    setSelectedObject(object);
    setObjectProps(object.props || {});
    updateURL({
      objectType: object.type,
      objectProps: serializeJSON(object.props || {}),
    });
  };

  const handleElementSelect = (element: RoomConfig) => {
    setSelectedElement(element);
    setElementProps(element.props || {});
    updateURL({
      elementType: element.type,
      elementProps: serializeJSON(element.props || {}),
    });
  };

  const handlePropChange = (key: string, value: any) => {
    const newProps = { ...componentProps, [key]: value };
    setComponentProps(newProps);
    updateURL({
      componentProps: serializeJSON(newProps),
    });
  };

  const handleObjectPropChange = (key: string, value: any) => {
    const newProps = { ...objectProps, [key]: value };
    setObjectProps(newProps);
    updateURL({
      objectProps: serializeJSON(newProps),
    });
  };

  const handleElementPropChange = (key: string, value: any) => {
    const newProps = { ...elementProps, [key]: value };
    setElementProps(newProps);
    updateURL({
      elementProps: serializeJSON(newProps),
    });
  };

  // Get current selection based on category
  const getCurrentSelection = useCallback(() => {
    switch (selectedCategory) {
      case "rooms":
        return selectedComponent;
      case "biomes":
        return selectedComponent;
      case "objects":
        return selectedObject;
      case "elements":
        return selectedElement;
      default:
        return selectedComponent;
    }
  }, [selectedCategory, selectedComponent, selectedObject, selectedElement]);

  // Update room action cards when component changes - DISABLED (but keep logic)
  useEffect(() => {
    const currentComponent = getCurrentSelection();
    if (selectedCategory === "biomes" && currentComponent) {
      const roomType = mapToRoomType(currentComponent.type);
      if (roomType) {
        // Simple function to get cards without hooks
        const getRoomCardsForType = (roomType: string): any[] => {
          switch (roomType) {
            case "portal":
              return [
                {
                  id: "activate_portal",
                  title: "Activate Portal",
                  description: "Activate the portal to travel",
                  icon: "🌀",
                  action: () => console.log("Portal activated in editor"),
                  cost: 0,
                },
                {
                  id: "study_portal",
                  title: "Study Portal",
                  description: "Study the portal's magical properties",
                  icon: "🔮",
                  action: () => console.log("Portal studied in editor"),
                  cost: 0,
                },
              ];
            case "coffee":
              return [
                {
                  id: "brew_coffee",
                  title: "Brew Coffee",
                  description: "Brew a fresh cup of coffee for energy boost",
                  icon: "☕",
                  action: () => console.log("Coffee brewed in editor"),
                  cost: 0,
                },
                {
                  id: "coffee_break",
                  title: "Coffee Break",
                  description: "Take a relaxing coffee break to restore energy",
                  icon: "🛋️",
                  action: () => console.log("Coffee break taken in editor"),
                  cost: 10,
                },
              ];
            default:
              return [];
          }
        };
        const cards = getRoomCardsForType(roomType);
        // CARDS DISABLED - Generate cards but don't use them
        setRoomActionCards([]);
      } else {
        setRoomActionCards([]);
      }
    } else {
      setRoomActionCards([]);
    }
  }, [
    selectedCategory,
    selectedComponent,
    selectedObject,
    selectedElement,
    getCurrentSelection,
  ]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#1a1a1a",
          color: "white",
        }}
      >
        <div>
          <h2>Loading 3D Editor...</h2>
          <p>Please wait while components are being loaded.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#1a1a1a",
          color: "white",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2>Error Loading 3D Editor</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              background: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              marginTop: "20px",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Get current configs based on selected category and subcategory
  const getCurrentConfigs = () => {
    let configs = [];
    switch (selectedCategory) {
      case "rooms":
        configs = ROOM_CONFIGS;
        break;
      case "biomes":
        configs = BIOME_CONFIGS;
        break;
      case "objects":
        configs = OBJECT_CONFIGS;
        break;
      case "elements":
        configs = ELEMENT_CONFIGS;
        break;
      default:
        return ROOM_CONFIGS;
    }

    // Filter by subcategory if not "all"
    if (selectedCategory === "biomes" && selectedSubcategory !== "all") {
      return configs.filter(
        (config: RoomConfig) => config.subcategory === selectedSubcategory
      );
    }

    return configs;
  };

  // Get current props based on category
  const getCurrentProps = () => {
    switch (selectedCategory) {
      case "rooms":
        return componentProps;
      case "biomes":
        return componentProps;
      case "objects":
        return objectProps;
      case "elements":
        return elementProps;
      default:
        return componentProps;
    }
  };

  // Handle category selection
  const handleCategorySelect = (
    category: "rooms" | "biomes" | "objects" | "elements"
  ) => {
    setSelectedCategory(category);
  };

  // Handle component selection based on category
  const handleItemSelect = (item: RoomConfig) => {
    switch (selectedCategory) {
      case "rooms":
        handleComponentSelect(item);
        break;
      case "biomes":
        handleComponentSelect(item);
        break;
      case "objects":
        handleObjectSelect(item);
        break;
      case "elements":
        handleElementSelect(item);
        break;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#1a1a1a" }}>
      {/* Navigation */}
      <SharedNavigation currentPage="editor" />

      {/* Sidebar */}
      <div
        style={{
          width: "300px",
          background: "#2a2a2a",
          padding: "20px",
          overflowY: "auto",
          borderRight: "1px solid #444",
        }}
      >
        <h2 style={{ color: "white", marginBottom: "20px" }}>3D Editor</h2>

        {/* Category Tabs */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
            {[
              { key: "rooms", label: "🏠 Rooms", count: ROOM_CONFIGS.length },
              {
                key: "biomes",
                label: "🌍 Biomes",
                count: BIOME_CONFIGS.length,
              },
              {
                key: "objects",
                label: "🎯 Objects",
                count: OBJECT_CONFIGS.length,
              },
              {
                key: "elements",
                label: "🧱 Elements",
                count: ELEMENT_CONFIGS.length,
              },
            ].map((category) => (
              <button
                key={category.key}
                onClick={() => {
                  handleCategorySelect(
                    category.key as "rooms" | "biomes" | "objects" | "elements"
                  );
                  setSelectedSubcategory("all"); // Reset subcategory when changing category
                }}
                style={{
                  padding: "8px 12px",
                  background:
                    selectedCategory === category.key ? "#4CAF50" : "#333",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                {category.label}
                <span
                  style={{
                    background:
                      selectedCategory === category.key
                        ? "rgba(255,255,255,0.3)"
                        : "rgba(255,255,255,0.1)",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    fontSize: "10px",
                  }}
                >
                  {category.count}
                </span>
              </button>
            ))}
          </div>

          {/* Subcategory Filter for Biomes */}
          {selectedCategory === "biomes" && (
            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  color: "white",
                  fontSize: "14px",
                  marginBottom: "8px",
                  display: "block",
                }}
              >
                Subcategory:
              </label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "#444",
                  color: "white",
                  border: "1px solid #666",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                <option value="all">All Biomes</option>
                <option value="buff">💪 Buff/Healing</option>
                <option value="resource">💰 Resource/Economy</option>
                <option value="puzzle">🧩 Puzzle/Interaction</option>
                <option value="transport">🚀 Transportation</option>
                <option value="obstacle">🚧 Obstacle/Architectural</option>
                <option value="special">✨ Special/Unique</option>
                <option value="utility">🔧 Utility</option>
              </select>
            </div>
          )}
        </div>

        {/* Current Category Items */}
        <div style={{ marginBottom: "30px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {getCurrentConfigs().map((item: RoomConfig) => (
              <button
                key={item.type}
                onClick={() => handleItemSelect(item)}
                style={{
                  padding: "10px",
                  background:
                    getCurrentSelection()?.type === item.type
                      ? "#4CAF50"
                      : "#333",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span>{item.emoji}</span>
                <div>
                  <div style={{ fontWeight: "bold" }}>{item.title}</div>
                  <div style={{ fontSize: "12px", opacity: 0.8 }}>
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Properties Panel */}
        {getCurrentSelection() && (
          <div style={{ marginTop: "20px" }}>
            <h3 style={{ color: "#4CAF50", marginBottom: "15px" }}>
              Properties
            </h3>

            {/* Action Cards Button for Biomes */}
            {/* Action Cards Toggle - DISABLED */}
            {false &&
              selectedCategory === "biomes" &&
              getCurrentSelection() &&
              hasActionCards(getCurrentSelection()!.type) &&
              roomActionCards &&
              roomActionCards.length > 0 && (
                <div style={{ marginBottom: "15px" }}>
                  <button
                    onClick={() => setShowActionCards(!showActionCards)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: showActionCards
                        ? "linear-gradient(45deg, #FF6B6B, #FF8E8E)"
                        : "linear-gradient(45deg, #FFD700, #FFA500)",
                      color: "white",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    {showActionCards
                      ? "❌ Hide Action Cards"
                      : "🎮 Show Action Cards"}
                  </button>
                </div>
              )}

            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {getCurrentSelection()?.editableProps?.map((prop) => (
                <div key={prop.key}>
                  <label
                    style={{
                      display: "block",
                      color: "white",
                      marginBottom: "5px",
                      fontSize: "14px",
                    }}
                  >
                    {prop.label}
                  </label>
                  {prop.type === "number" ? (
                    <input
                      type="number"
                      value={getCurrentProps()[prop.key] || prop.min || 0}
                      min={prop.min}
                      max={prop.max}
                      step={prop.step}
                      onChange={(e) =>
                        handlePropChange(prop.key, parseFloat(e.target.value))
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        background: "#444",
                        color: "white",
                        border: "1px solid #666",
                        borderRadius: "4px",
                      }}
                    />
                  ) : prop.type === "color" ? (
                    <input
                      type="color"
                      value={getCurrentProps()[prop.key] || "#ffffff"}
                      onChange={(e) =>
                        handlePropChange(prop.key, e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "4px",
                        background: "#444",
                        border: "1px solid #666",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    />
                  ) : prop.type === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={getCurrentProps()[prop.key] || false}
                      onChange={(e) =>
                        handlePropChange(prop.key, e.target.checked)
                      }
                      style={{ marginRight: "8px" }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={getCurrentProps()[prop.key] || ""}
                      onChange={(e) =>
                        handlePropChange(prop.key, e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        background: "#444",
                        color: "white",
                        border: "1px solid #666",
                        borderRadius: "4px",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main 3D Viewport */}
      <div style={{ flex: 1, position: "relative" }}>
        <Canvas camera={{ position: [10, 10, 10], fov: 60 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />

          <Physics>
            <Suspense fallback={<LoadingFallback />}>
              {getCurrentSelection() &&
                (() => {
                  const Component = getCurrentSelection()!.component;
                  return <Component {...getCurrentProps()} />;
                })()}

              {/* Action Cards for Biomes - DISABLED */}
              {false &&
                selectedCategory === "biomes" &&
                getCurrentSelection() &&
                hasActionCards(getCurrentSelection()!.type) &&
                showActionCards &&
                roomActionCards &&
                roomActionCards.length > 0 && (
                  <RoomActionCards
                    cards={roomActionCards}
                    isVisible={true}
                    onCardClick={(card) => {
                      console.log(
                        "Card clicked in AutoThreeDEditor:",
                        card.title
                      );
                    }}
                  />
                )}
            </Suspense>
          </Physics>
        </Canvas>
      </div>
    </div>
  );
};

export default AutoThreeDEditor;
