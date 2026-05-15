import React, { useState, useEffect, useMemo, useCallback } from "react";
import useGameStore from "../store/gameStore";

export interface ActionCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
  disabled?: boolean;
  cost?: number;
  cooldown?: number;
}

interface RoomActionCardsProps {
  cards: ActionCard[];
  isVisible: boolean;
  onCardClick?: (card: ActionCard) => void;
}

const RoomActionCards: React.FC<RoomActionCardsProps> = ({
  cards,
  isVisible,
  onCardClick,
}) => {
  const { playerStats } = useGameStore();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Reset selection when cards change
  useEffect(() => {
    setSelectedCard(null);
  }, [cards]);

  // Memoize card click handler to prevent unnecessary re-renders
  const handleCardClick = useCallback(
    (card: ActionCard) => {
      if (card.disabled) return;

      setSelectedCard(card.id);
      onCardClick?.(card);
      card.action();
    },
    [onCardClick]
  );

  // Memoize affordability check to prevent unnecessary recalculations
  const canAfford = useCallback(
    (card: ActionCard) => {
      if (!card.cost) return true;
      return playerStats.points >= card.cost;
    },
    [playerStats.points]
  );

  // Memoize card rendering to prevent unnecessary re-renders
  const renderedCards = useMemo(() => {
    return cards.map((card) => {
      const isSelected = selectedCard === card.id;
      const isHovered = hoveredCard === card.id;
      const isDisabled = card.disabled || (card.cost && !canAfford(card));
      const isAffordable = canAfford(card);

      return (
        <div
          key={card.id}
          onClick={() => handleCardClick(card)}
          onMouseEnter={() => setHoveredCard(card.id)}
          onMouseLeave={() => setHoveredCard(null)}
          style={{
            background: isSelected
              ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              : isHovered
              ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              : isDisabled
              ? "linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)"
              : isAffordable
              ? "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
              : "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            color: "white",
            padding: "12px 16px",
            margin: "8px 0",
            borderRadius: "12px",
            cursor: isDisabled ? "not-allowed" : "pointer",
            transform: isSelected
              ? "scale(1.05)"
              : isHovered
              ? "scale(1.02)"
              : "scale(1)",
            transition: "all 0.2s ease",
            boxShadow: isSelected
              ? "0 8px 25px rgba(0,0,0,0.3)"
              : isHovered
              ? "0 6px 20px rgba(0,0,0,0.2)"
              : "0 4px 15px rgba(0,0,0,0.1)",
            border: isSelected
              ? "2px solid #fff"
              : isHovered
              ? "2px solid rgba(255,255,255,0.8)"
              : "2px solid transparent",
            opacity: isDisabled ? 0.6 : 1,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>{card.icon}</span>
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: "600",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
              >
                {card.title}
              </h3>
            </div>
            {card.cost && (
              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                💰 {card.cost}
              </div>
            )}
          </div>

          {/* Card Description */}
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              lineHeight: "1.4",
              opacity: 0.9,
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            }}
          >
            {card.description}
          </p>

          {/* Cooldown Indicator */}
          {card.cooldown && (
            <div
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                background: "rgba(255,0,0,0.8)",
                color: "white",
                padding: "2px 6px",
                borderRadius: "8px",
                fontSize: "10px",
                fontWeight: "600",
              }}
            >
              ⏱️ {card.cooldown}s
            </div>
          )}

          {/* Disabled Overlay */}
          {isDisabled && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "12px",
              }}
            >
              <span style={{ fontSize: "24px" }}>🔒</span>
            </div>
          )}

          {/* Hover Effect Overlay */}
          {isHovered && !isDisabled && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
                animation: "shimmer 1.5s infinite",
              }}
            />
          )}
        </div>
      );
    });
  }, [cards, selectedCard, hoveredCard, canAfford, handleCardClick]);

  // Don't render if not visible or no cards
  if (!isVisible || !cards || cards.length === 0) {
    return null;
  }

  // CARDS DISABLED - Keep all logic but don't render cards
  return null;

  // Original card rendering logic (commented out but preserved):
  /*
  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
        maxWidth: "400px",
        width: "100%",
        maxHeight: "80vh",
        overflowY: "auto",
        padding: "20px",
        background: "rgba(0,0,0,0.9)",
        borderRadius: "16px",
        border: "2px solid rgba(255,255,255,0.1)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {renderedCards}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
  */
};

export default RoomActionCards;
