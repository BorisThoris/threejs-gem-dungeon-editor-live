import React, { useState, useRef } from "react";
import { RigidBody } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Item } from "../../../types/map";
import ItemSprite from "../objects/ItemSprite";
import OptimizedPuzzleRouter from "../../OptimizedPuzzleRouter";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";

interface LibraryBiomeProps {
  books?: Item[];
}

const LibraryBiome: React.FC<LibraryBiomeProps> = ({ books = [] }) => {
  const [selectedBook, setSelectedBook] = useState<Item | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [puzzleCompleted, setPuzzleCompleted] = useState(false);

  // Refs for animated elements
  const bookRefs = useRef<THREE.Mesh[]>([]);
  const tableRef = useRef<THREE.Mesh>(null);

  const { cards, isVisible, showCards, hideCards } = useRoomActions({
    roomType: "library",
    onPuzzleStart: () => setShowPuzzle(true),
  });

  // Animation frame for magical effects
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Animate books glowing
    bookRefs.current.forEach((bookRef, index) => {
      if (bookRef) {
        const glowIntensity = Math.sin(time * 2 + index) * 0.2 + 0.3;
        bookRef.material.emissiveIntensity = glowIntensity;

        // Slight floating animation
        const floatOffset = Math.sin(time * 1.5 + index) * 0.02;
        bookRef.position.y += floatOffset * 0.1;
      }
    });

    // Animate reading table glow
    if (tableRef.current && isReading) {
      const glowIntensity = Math.sin(time * 3) * 0.3 + 0.7;
      tableRef.current.material.emissiveIntensity = glowIntensity;
    }
  });

  // Create simple bookshelf models instead of loading VOX

  const handlePuzzleComplete = () => {
    setPuzzleCompleted(true);
    setSelectedBook(books[0]); // Use first book as example
    setIsReading(true);
    // Book reading handled through card system

    // Stop reading after 2 seconds
    setTimeout(() => {
      setIsReading(false);
      setSelectedBook(null);
    }, 2000);
  };

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[10, 1, 10]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>
      </RigidBody>

      {/* Bookshelves */}
      {Array.from({ length: 4 }).map((_, i) => {
        const angle = (i * Math.PI) / 2;
        const x = Math.cos(angle) * 3;
        const z = Math.sin(angle) * 3;

        return (
          <group key={i} position={[x, 0, z]} rotation={[0, angle, 0]}>
            {/* Bookshelf Structure - Simple 3D model */}
            <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.2, 3, 2]} />
              <meshLambertMaterial color="#654321" />
            </mesh>

            {/* Books on Shelf */}
            {Array.from({ length: 6 }).map((_, j) => (
              <mesh
                key={j}
                ref={(el) => {
                  if (el) bookRefs.current[j + i * 6] = el;
                }}
                position={[
                  ((j % 3) - 1) * 0.3,
                  Math.floor(j / 3) * 0.4 - 0.4,
                  0.1,
                ]}
              >
                <boxGeometry args={[0.25, 0.3, 0.05]} />
                <meshLambertMaterial
                  color={j % 2 === 0 ? "#8B0000" : "#000080"}
                  emissive={j % 2 === 0 ? "#8B0000" : "#000080"}
                  emissiveIntensity={0.2}
                />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Central Reading Table */}
      <group position={[0, 0, 0]}>
        <mesh ref={tableRef} position={[0, 0.4, 0]}>
          <boxGeometry args={[2, 0.1, 2]} />
          <meshLambertMaterial
            color="#DEB887"
            emissive="#FFD700"
            emissiveIntensity={isReading ? 0.3 : 0.1}
          />
        </mesh>

        {/* Magical reading aura */}
        {isReading && (
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[2.2, 0.15, 2.2]} />
            <meshLambertMaterial
              color="#FFD700"
              transparent
              opacity={0.2}
              emissive="#FFD700"
              emissiveIntensity={0.4}
            />
          </mesh>
        )}

        {/* Table Legs */}
        {[
          [-0.8, -0.8],
          [0.8, -0.8],
          [-0.8, 0.8],
          [0.8, 0.8],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.2, z]}>
            <boxGeometry args={[0.1, 0.4, 0.1]} />
            <meshLambertMaterial color="#654321" />
          </mesh>
        ))}
      </group>

      {/* Knowledge Books */}
      {books.map((book, index) => (
        <group key={book.id}>
          <ItemSprite
            item={book}
            position={
              [
                ((index % 3) - 1) * 1.5,
                1.2,
                Math.floor(index / 3) * 1.5 - 0.5,
              ] as [number, number, number]
            }
            scale={0.6}
          />

          {/* Book Glow */}
          <mesh
            position={[
              ((index % 3) - 1) * 1.5,
              1.2,
              Math.floor(index / 3) * 1.5 - 0.5,
            ]}
          >
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshBasicMaterial
              color="#FFD700"
              transparent
              opacity={0.2}
              emissive="#FFD700"
              emissiveIntensity={0.3}
            />
          </mesh>

          {/* Floating magical particles around books */}
          {Array.from({ length: 3 }).map((_, particleIndex) => (
            <mesh
              key={`particle-${particleIndex}`}
              position={[
                ((index % 3) - 1) * 1.5 + (Math.random() - 0.5) * 0.5,
                1.2 + Math.sin(Date.now() * 0.002 + particleIndex) * 0.2,
                Math.floor(index / 3) * 1.5 - 0.5 + (Math.random() - 0.5) * 0.5,
              ]}
            >
              <sphereGeometry args={[0.05]} />
              <meshBasicMaterial
                color="#FFD700"
                emissive="#FFD700"
                emissiveIntensity={0.8}
                transparent
                opacity={0.7}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Reading Effect */}
      {isReading && selectedBook && (
        <group position={[0, 2, 0]}>
          {/* Reading indicator - Simple colored cube */}
          <mesh>
            <boxGeometry args={[2, 0.3, 0.1]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>

          {/* Knowledge Particles */}
          {Array.from({ length: 10 }).map((_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * 4,
                Math.random() * 2,
                (Math.random() - 0.5) * 4,
              ]}
            >
              <sphereGeometry args={[0.1, 4, 4]} />
              <meshBasicMaterial color="#FFD700" transparent opacity={0.8} />
            </mesh>
          ))}
        </group>
      )}

      {/* Room Title - Simple colored cube */}
      {/* Library Sign - Large visible sign */}
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[4, 0.5, 0.2]} />
        <meshBasicMaterial color="#8B4513" />
      </mesh>

      {/* Library Title Text */}
      <Text
        position={[0, 3, 0.15]}
        fontSize={0.8}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
      >
        LIBRARY
      </Text>

      {/* Library Indicator - Large brown book stack */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[2, 2, 1]} />
        <meshBasicMaterial color="#8B4513" />
      </mesh>

      {/* Instructions */}
      <mesh position={[0, -2, 0]}>
        <boxGeometry args={[2, 0.2, 0.1]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <Text
        position={[0, -2, 0.15]}
        fontSize={0.4}
        color="#000000"
        anchorX="center"
        anchorY="middle"
      >
        CLICK TO READ
      </Text>

      {/* Atmospheric Lighting */}
      <pointLight
        position={[0, 2, 0]}
        color="#FFD700"
        intensity={0.3}
        distance={8}
      />

      {/* Optimized Puzzle Overlay */}
      <OptimizedPuzzleRouter
        isVisible={showPuzzle}
        onComplete={handlePuzzleComplete}
        onExit={() => setShowPuzzle(false)}
        puzzleType="number"
        difficulty="hard"
      />

      {/* Action Cards */}
      <RoomActionCards
        cards={cards}
        isVisible={isVisible}
        onCardClick={(card) => {
          if (card.id === "study") {
            setShowPuzzle(true);
            hideCards();
          }
        }}
      />
    </group>
  );
};

export default LibraryBiome;
