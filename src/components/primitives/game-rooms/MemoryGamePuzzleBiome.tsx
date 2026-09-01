import React, { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { Text } from "../../GameText";
import { RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useConsolidatedGameStore } from "../../../store/consolidatedGameStore";
import { getBiomeScale } from "../../../utils/biomeScaling";
import RoomActionCards from "../../RoomActionCards";
import { useRoomActions } from "../../../hooks/useRoomActions";
import Table from "../elements/Table";
import Candle from "../elements/Candle";
import BreakableMesh from "../../BreakableMesh";

interface MemoryGamePuzzleBiomeProps {
  size?: number;
  onPuzzleComplete?: () => void;
  onRoomComplete?: () => void;
  onDoorsLock?: () => void;
  onDoorsUnlock?: () => void;
}

interface MemoryBlock {
  id: number;
  position: [number, number, number];
  color: string;
  emissiveColor: string;
  pattern: number[];
}

const PARTICLE_POOL_SIZE = 18;
const PARTICLE_COLORS = [
  "#FFD700",
  "#FF6B6B",
  "#4CAF50",
  "#2196F3",
  "#9C27B0",
  "#FF9800",
];

const MemoryGamePuzzleBiome: React.FC<MemoryGamePuzzleBiomeProps> = ({
  onPuzzleComplete,
  onRoomComplete,
  onDoorsLock,
  onDoorsUnlock,
  size = 10,
}) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePhase, setGamePhase] = useState<
    "waiting" | "showing" | "playing" | "completed"
  >("waiting");
  const [currentPattern, setCurrentPattern] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);

  // Candle state management
  const [candlesLit, setCandlesLit] = useState([true, true]); // 2 candles
  const [wrongGuesses, setWrongGuesses] = useState(0);

  // Cube breaking system
  const [brokenCubes, setBrokenCubes] = useState<Set<number>>(new Set());
  const [isBreaking, setIsBreaking] = useState(false);
  const [breakCooldown, setBreakCooldown] = useState(0);

  /**
   * Ambient sparkles.
   *
   * These used to live in React state, and `updateParticles()` - a
   * `setParticles` call that rebuilt the whole array - ran from useFrame on
   * EVERY frame while the game was running. That is a React re-render of this
   * entire 1,100-line room sixty times a second, and because particles were
   * keyed by `Math.random()` and expired on their own schedule, each render
   * also mounted and unmounted meshes, allocating a fresh sphere geometry and
   * material every time. It was the single largest source of stutter in the
   * room.
   *
   * The sparkles are now a fixed pool: the meshes mount once when the game
   * starts and every frame after that only mutates their transforms and
   * materials, so React does no work at all.
   */
  const particleMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const particleState = useRef(
    Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1,
    }))
  );

  // Debug text animation refs
  const debugTextRefs = useRef<THREE.Group[]>([]);

  // Visual feedback states
  const [shakingBlocks, setShakingBlocks] = useState<Set<number>>(new Set());
  const [redBlocks, setRedBlocks] = useState<Set<number>>(new Set());
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const [failureEffect, setFailureEffect] = useState(false);
  // Dynamic blocks and spawn animation
  const [blocks, setBlocks] = useState<MemoryBlock[]>([]);
  const [isSpawning, setIsSpawning] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const spawnStartTimeRef = useRef<number | null>(null);
  const exitStartTimeRef = useRef<number | null>(null);

  // Book state
  const [bookBroken, setBookBroken] = useState(false);
  const [failureCount, setFailureCount] = useState(0);

  // Use ref to maintain stable pattern reference
  const patternRef = useRef<number[]>([]);
  // Track timeouts to avoid orphan animations
  const activeTimeouts = useRef<number[]>([]);

  // Refs for animated elements
  const blockRefs = useRef<THREE.Mesh[]>([]);
  const bookRef = useRef<THREE.Mesh>(null);

  // Utility: register timeout so we can clear on phase changes
  const addTimeout = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    activeTimeouts.current.push(id);
    return id;
  };

  // Utility: clear all outstanding timeouts
  const clearActiveTimeouts = () => {
    activeTimeouts.current.forEach((id) => clearTimeout(id));
    activeTimeouts.current = [];
  };

  // Utility: reset all blocks to default visuals
  const resetAllBlocksVisuals = () => {
    blockRefs.current.forEach((ref, index) => {
      if (!ref) return;
      ref.scale.set(1, 1, 1);
      ref.rotation.x = 0;
      ref.rotation.z = 0;
      const mat = ref.material as THREE.MeshStandardMaterial;
      if (mat && mat.emissiveIntensity !== undefined) {
        const isRed = redBlocks.has(index);
        mat.emissiveIntensity = isRed ? 0.8 : 0.2;
      }
      // Ensure position returns to base for shake recovery
      const base = blocks[index]?.position || memoryBlocks[index].position;
      ref.position.x = base[0];
      ref.position.y = base[1];
      ref.position.z = base[2];
    });
  };

  // Utility: start cube exit animation
  const startCubeExitAnimation = () => {
    setIsExiting(true);
    exitStartTimeRef.current = Date.now();

    addTimeout(() => {
      // After exit animation, clear blocks and reset game
      setBlocks([]);
      setIsExiting(false);
      setGameStarted(false);
      setGamePhase("waiting");
      setCurrentPattern([]);
      setPlayerSequence([]);
      setCurrentStep(0);
      setScore(0);
      setLevel(1);
      setCandlesLit([true, true]);
      setWrongGuesses(0);
      setShakingBlocks(new Set());
      setRedBlocks(new Set());
      setFailureEffect(false);
      setIsInteractionPaused(false);
      patternRef.current = [];
    }, 2000); // 2 second exit animation
  };

  const playerDimensions = useConsolidatedGameStore(
    (state) => state.playerStats.dimensions
  );
  const scale = getBiomeScale(playerDimensions);
  const biomeSize = size;

  const { cards, isVisible, showCards, hideCards } = useRoomActions({
    roomType: "puzzle",
  });

  // Get game store for health management
  const { playerStats, loseLife, addExperience, addPoints } =
    useConsolidatedGameStore();

  // Cube breaking functionality
  const breakCube = (blockId: number, impactPoint?: THREE.Vector3) => {
    if (isBreaking || breakCooldown > 0) return;

    // Check if player has enough strength (assuming strength is in playerStats)
    const requiredStrength = 10; // Minimum strength to break a cube
    if (playerStats.strength < requiredStrength) {
      console.log("Not enough strength to break cube!");
      return;
    }

    setIsBreaking(true);
    setBreakCooldown(1000); // 1 second cooldown

    // Add cube to broken set
    setBrokenCubes((prev) => new Set([...prev, blockId]));

    // Explosion when a cube is broken: short-lived and fast.
    burstParticles(2, 2, 0.1, 1.7);

    // Deal damage to player (risk/reward)
    const damage = 5; // 5 damage for breaking a cube
    loseLife();

    // Update pattern if game is active
    if (gameStarted && gamePhase !== "completed") {
      updatePatternForRemainingCubes();
    }

    // Check for instant win (all cubes broken)
    const remainingCubes = memoryBlocks.length - brokenCubes.size - 1;
    if (remainingCubes <= 0) {
      onRoomComplete?.();
    }

    // Reset breaking state after animation
    setTimeout(() => {
      setIsBreaking(false);
    }, 500);
  };

  // Update pattern when cubes are broken
  const updatePatternForRemainingCubes = () => {
    const remainingBlocks = memoryBlocks.filter(
      (block) => !brokenCubes.has(block.id)
    );
    if (remainingBlocks.length === 0) {
      onRoomComplete?.();
      return;
    }

    // Generate new pattern with remaining cubes
    const newPattern = generatePattern(
      remainingBlocks.length,
      remainingBlocks.length
    );
    setCurrentPattern(newPattern);
    setPlayerSequence([]);
    setCurrentStep(0);

    console.log(
      `Pattern updated for ${remainingBlocks.length} remaining cubes:`,
      newPattern
    );
  };

  // Cooldown timer for break cooldown
  useEffect(() => {
    if (breakCooldown > 0) {
      const timer = setTimeout(() => {
        setBreakCooldown((prev) => Math.max(0, prev - 100));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [breakCooldown]);

  // Particle system: one pooled slot is re-seeded rather than allocated.
  const seedAmbientParticle = useCallback((index: number) => {
    const particle = particleState.current[index];
    particle.x = (Math.random() - 0.5) * 12;
    particle.y = Math.random() * 4 + 0.5;
    particle.z = (Math.random() - 0.5) * 12;
    particle.vx = (Math.random() - 0.5) * 0.02;
    particle.vy = Math.random() * 0.01 + 0.005;
    particle.vz = (Math.random() - 0.5) * 0.02;
    particle.life = 0;
    // Seconds, not frames: the old code counted one "life" per frame, which
    // made particles live half as long on a 120Hz display.
    particle.maxLife = Math.random() * 5 + 3.3;
  }, []);

  // A burst re-seeds the whole pool around a point instead of appending
  // throwaway meshes.
  const burstParticles = useCallback(
    (spread: number, height: number, speed: number, life: number) => {
      particleState.current.forEach((particle) => {
        particle.x = (Math.random() - 0.5) * spread;
        particle.y = Math.random() * height + 1;
        particle.z = (Math.random() - 0.5) * spread;
        particle.vx = (Math.random() - 0.5) * speed;
        particle.vy = Math.random() * speed * 0.6 + speed * 0.2;
        particle.vz = (Math.random() - 0.5) * speed;
        particle.life = 0;
        particle.maxLife = life;
      });
    },
    []
  );

  // Initialize particles when game starts
  useEffect(() => {
    if (gameStarted) {
      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        seedAmbientParticle(i);
        // Stagger the pool so they do not all pulse in lockstep.
        particleState.current[i].life =
          Math.random() * particleState.current[i].maxLife;
      }
    }
  }, [gameStarted, seedAmbientParticle]);

  // Particle animation is now handled in useFrame below

  // Memory blocks configuration
  const memoryBlocks: MemoryBlock[] = [
    {
      id: 0,
      position: [-1.5, 2, 0],
      color: "#FF6B6B",
      emissiveColor: "#FF4444",
      pattern: [0],
    },
    {
      id: 1,
      position: [1.5, 2, 0],
      color: "#4ECDC4",
      emissiveColor: "#44CCCC",
      pattern: [1],
    },
    {
      id: 2,
      position: [-1.5, 0.5, 0],
      color: "#45B7D1",
      emissiveColor: "#44AACC",
      pattern: [2],
    },
    {
      id: 3,
      position: [1.5, 0.5, 0],
      color: "#96CEB4",
      emissiveColor: "#88CCAA",
      pattern: [3],
    },
  ];

  /**
   * Generate a random pattern over the cubes that actually exist.
   *
   * `blockCount` used to be read from the `blocks` state captured by the
   * closure. The pattern is generated a second after the cubes are created, but
   * from the render that created them - where `blocks` was still empty - so the
   * count fell back to 4. A round that spawned 2 or 3 cubes therefore got a
   * pattern containing ids 3 or 4 with no cube behind them: showPattern
   * highlighted nothing for those steps while handleBlockClick wrapped the same
   * id with `% blocks.length` and demanded a different cube. The sequence the
   * player was shown was not the sequence the room wanted back, and the round
   * could only be won by guessing.
   */
  const generatePattern = (length: number, blockCount: number): number[] => {
    const maxIndex = Math.max(1, blockCount);
    const pattern = Array.from({ length }, () =>
      Math.floor(Math.random() * maxIndex)
    );
    console.log("DEBUG: Generated pattern:", pattern);
    return pattern;
  };

  // Start the memory game
  const startMemoryGame = () => {
    if (gameStarted || bookBroken) return;

    setGameStarted(true);
    setGamePhase("showing");
    // Generate 2-5 cubes positioned in a circle, spawn animated
    const count = 2 + Math.floor(Math.random() * 4); // 2..5
    const radius = 2.2;
    const palette = [
      { c: "#FF6B6B", e: "#FF4444" },
      { c: "#4ECDC4", e: "#44CCCC" },
      { c: "#45B7D1", e: "#44AACC" },
      { c: "#96CEB4", e: "#88CCAA" },
      { c: "#FFD93D", e: "#E1C12F" },
    ];
    const created: MemoryBlock[] = Array.from({ length: count }).map((_, i) => {
      const ang = (i / count) * Math.PI * 2;
      const x = Math.cos(ang) * radius;
      const z = Math.sin(ang) * radius;
      const y = 1.4 + Math.sin(i) * 0.2;
      const p = palette[i % palette.length];
      return {
        id: i,
        position: [x, y, z],
        color: p.c,
        emissiveColor: p.e,
        pattern: [i],
      };
    });
    setBlocks(created);
    setIsSpawning(true);
    spawnStartTimeRef.current = null;

    // Temporary pattern; regenerate once blocks exist
    const tempPattern = Array.from({ length: level + 2 }, () => 0);
    console.log("DEBUG: Setting current pattern to:", tempPattern);
    setCurrentPattern(tempPattern);
    patternRef.current = tempPattern; // Update ref as well
    setPlayerSequence([]);
    setCurrentStep(0);

    // Reset candle states
    setCandlesLit([true, true]);
    setWrongGuesses(0);
    setRedBlocks(new Set());
    setShakingBlocks(new Set());
    setFailureEffect(false);
    setIsInteractionPaused(false);

    // Lock all doors when game starts
    onDoorsLock?.();

    // Show pattern after a short delay
    clearActiveTimeouts();
    resetAllBlocksVisuals();
    addTimeout(() => {
      // Generate pattern after blocks are spawned
      const properPattern = generatePattern(level + 2, count);
      setCurrentPattern(properPattern);
      patternRef.current = properPattern;
      showPattern(properPattern);
    }, 1000);
  };

  // Show the pattern to the player
  const showPattern = (pattern: number[]) => {
    console.log("DEBUG: Showing pattern:", pattern);
    let stepIndex = 0;

    const showNextStep = () => {
      if (stepIndex < pattern.length) {
        const blockId = pattern[stepIndex];
        console.log(
          `DEBUG: Highlighting block ${blockId} (step ${stepIndex + 1}/${
            pattern.length
          })`
        );
        highlightBlock(blockId);
        stepIndex++;
        addTimeout(showNextStep, 1200);
      } else {
        // Pattern shown, now player's turn
        console.log(
          "DEBUG: Pattern display complete, switching to playing phase"
        );
        addTimeout(() => {
          setGamePhase("playing");
        }, 1000);
      }
    };

    showNextStep();
  };

  // Handle wrong guess - shake block and turn red
  const handleWrongGuess = (blockId: number) => {
    console.log("DEBUG: Handling wrong guess for block", blockId);

    // Add to shaking and red blocks
    // Note: per-cube feedback is applied only if NOT final failure

    // Pause interaction briefly
    setIsInteractionPaused(true);

    // Turn off a candle
    const newWrongGuesses = wrongGuesses + 1;
    setWrongGuesses(newWrongGuesses);

    if (newWrongGuesses <= candlesLit.length) {
      const newCandlesLit = [...candlesLit];
      newCandlesLit[newWrongGuesses - 1] = false;
      setCandlesLit(newCandlesLit);
    }

    // If all candles are out, trigger failure effect
    if (newWrongGuesses >= candlesLit.length) {
      console.log("DEBUG: All candles out - triggering failure effect");
      // Ensure no single-cube feedback remains
      setShakingBlocks(
        new Set(Array.from({ length: blocks.length }, (_, i) => i))
      );
      setRedBlocks(new Set(Array.from({ length: blocks.length }, (_, i) => i)));
      resetAllBlocksVisuals();
      clearActiveTimeouts();
      addTimeout(() => {
        setFailureEffect(true);
        // All blocks turn red and shake
        setRedBlocks(
          new Set(Array.from({ length: blocks.length }, (_, i) => i))
        );
        setShakingBlocks(
          new Set(Array.from({ length: blocks.length }, (_, i) => i))
        );

        // Apply damage after effect
        addTimeout(() => {
          console.log("DEBUG: Applying damage and unlocking doors");
          loseLife();
          onDoorsUnlock?.();
          setIsInteractionPaused(false);

          // Increment failure count
          const newFailureCount = failureCount + 1;
          setFailureCount(newFailureCount);

          // Break book after 2 failures
          if (newFailureCount >= 2) {
            console.log("DEBUG: Book broken after 2 failures");
            setBookBroken(true);
          }

          // Start exit animation
          startCubeExitAnimation();
        }, 900);
      }, 500);
    } else {
      // Not all candles out: replay the current pattern after a brief pause
      // Apply single-cube feedback briefly
      setShakingBlocks((prev) => new Set(prev).add(blockId));
      setRedBlocks((prev) => new Set(prev).add(blockId));
      addTimeout(() => {
        setShakingBlocks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(blockId);
          return newSet;
        });
        setRedBlocks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(blockId);
          return newSet;
        });
        resetAllBlocksVisuals();
      }, 600);

      addTimeout(() => {
        setIsInteractionPaused(false);
        setPlayerSequence([]);
        clearActiveTimeouts();
        resetAllBlocksVisuals();
        setGamePhase("showing");
        addTimeout(() => {
          showPattern(patternRef.current);
        }, 400);
      }, 700);
    }
  };

  // Highlight a specific block
  const highlightBlock = (blockId: number) => {
    const blockRef = blockRefs.current[blockId];
    if (blockRef) {
      // Create a temporary highlight effect
      const originalScale = blockRef.scale.clone();
      const material = blockRef.material as THREE.MeshStandardMaterial;
      const originalEmissive = material.emissiveIntensity;

      // Expand and glow
      blockRef.scale.setScalar(1.3);
      material.emissiveIntensity = 1.0;

      // Reset after delay
      addTimeout(() => {
        blockRef.scale.copy(originalScale);
        material.emissiveIntensity = originalEmissive;
      }, 600);
    }
  };

  // Handle block click
  const handleBlockClick = (blockId: number) => {
    if (gamePhase !== "playing" || isInteractionPaused) return;
    if (blocks.length === 0) return; // safety

    console.log("DEBUG: Player clicked block", blockId);
    console.log("DEBUG: Current step:", playerSequence.length);
    console.log(
      "DEBUG: Expected for this step:",
      patternRef.current[playerSequence.length]
    );

    // Check if this individual click is correct
    const expectedBlockId =
      patternRef.current[playerSequence.length] % Math.max(1, blocks.length);
    const isCorrectClick = blockId === expectedBlockId;

    console.log("DEBUG: Click correct?", isCorrectClick);
    console.log("DEBUG: Clicked:", blockId, "Expected:", expectedBlockId);

    // Highlight the clicked block
    highlightBlock(blockId);

    if (isCorrectClick) {
      // Correct click - add to sequence
      const newSequence = [...playerSequence, blockId];
      setPlayerSequence(newSequence);

      console.log("DEBUG: ✅ Correct click! Sequence:", newSequence);

      // Check if pattern is complete
      if (newSequence.length === patternRef.current.length) {
        console.log("DEBUG: ✅ Pattern complete!");

        // Level completed!
        setScore(score + level * 10);
        setLevel(level + 1);
        setPlayerSequence([]);
        setCurrentStep(0);

        // Add rewards for completing level
        addPoints(level * 5);
        addExperience(level * 3);

        // Check if player has completed enough levels (e.g., level 5+)
        if (level >= 5) {
          // Game completed successfully!
          setGamePhase("completed");

          // Celebration burst: slower and longer-lived than an explosion.
          burstParticles(6, 3, 0.05, 3.3);

          onRoomComplete?.();
          onDoorsUnlock?.();

          // Add bonus rewards for completing the puzzle
          addPoints(50);
          addExperience(25);

          // Start exit animation on success
          startCubeExitAnimation();
        } else {
          // Start next level
          addTimeout(() => {
            const newPattern = generatePattern(level + 3, blocks.length);
            setCurrentPattern(newPattern);
            patternRef.current = newPattern; // Update ref as well
            setGamePhase("showing");
            showPattern(newPattern);
          }, 1500);
        }
      }
    } else {
      console.log("DEBUG: ❌ Wrong click! Immediate feedback");
      // Wrong click - immediate feedback
      handleWrongGuess(blockId);
    }
  };

  // Animation frame for floating blocks
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // Initialize spawn start
    if (isSpawning && spawnStartTimeRef.current == null) {
      spawnStartTimeRef.current = time;
    }

    // Initialize exit start
    if (isExiting && exitStartTimeRef.current == null) {
      exitStartTimeRef.current = time;
    }

    // Animate floating/spawned blocks
    blockRefs.current.forEach((blockRef, index) => {
      if (blockRef) {
        const target = blocks[index]?.position;
        if (!target) return;

        if (isSpawning && spawnStartTimeRef.current != null) {
          const t = Math.min(1, (time - spawnStartTimeRef.current) / 0.8);
          const origin: [number, number, number] = [0, -1.0, 0];
          const spiral = (1 - t) * 0.5;
          const angle = t * 4 + index;
          blockRef.position.x =
            origin[0] * (1 - t) + target[0] * t + Math.sin(angle) * spiral;
          blockRef.position.y = origin[1] * (1 - t) + target[1] * t;
          blockRef.position.z =
            origin[2] * (1 - t) + target[2] * t + Math.cos(angle) * spiral;
          if (t >= 1 && index === blocks.length - 1) {
            setIsSpawning(false);
          }
        } else if (isExiting && exitStartTimeRef.current != null) {
          // Exit animation - cubes fly up and fade out
          const t = Math.min(1, (time - exitStartTimeRef.current) / 2.0);
          const exitTarget: [number, number, number] = [
            target[0] + (Math.random() - 0.5) * 2,
            target[1] + 10 + t * 5,
            target[2] + (Math.random() - 0.5) * 2,
          ];
          blockRef.position.x = target[0] * (1 - t) + exitTarget[0] * t;
          blockRef.position.y = target[1] * (1 - t) + exitTarget[1] * t;
          blockRef.position.z = target[2] * (1 - t) + exitTarget[2] * t;

          // Scale down and fade out
          const scale = 1 - t;
          blockRef.scale.set(scale, scale, scale);

          // Add rotation for exit effect
          blockRef.rotation.x += 0.1;
          blockRef.rotation.y += 0.1;
          blockRef.rotation.z += 0.1;
        } else {
          const floatOffset = Math.sin(time * 2 + index) * 0.1;
          blockRef.position.y = target[1] + floatOffset;
        }

        // Gentle rotation
        blockRef.rotation.y = time * 0.5 + index;

        // Shaking animation (failure state shakes all cubes)
        const shouldShake = failureEffect || shakingBlocks.has(index);
        if (shouldShake) {
          const shakeIntensity = 0.1;
          blockRef.position.x =
            target[0] + (Math.random() - 0.5) * shakeIntensity;
          blockRef.position.z =
            target[2] + (Math.random() - 0.5) * shakeIntensity;
          blockRef.rotation.x = (Math.random() - 0.5) * 0.2;
          blockRef.rotation.z = (Math.random() - 0.5) * 0.2;
        } else {
          // Reset position when not shaking
          blockRef.position.x = target[0];
          blockRef.position.z = target[2];
          blockRef.rotation.x = 0;
          blockRef.rotation.z = 0;
        }
      }
    });

    // Animate book glow
    if (bookRef.current && !gameStarted) {
      const glowIntensity = Math.sin(time * 3) * 0.2 + 0.3;
      const material = bookRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = glowIntensity;
    }

    // Animate debug text floating
    debugTextRefs.current.forEach((textRef, index) => {
      if (textRef) {
        const floatOffset = Math.sin(time * 1.5 + index * 0.5) * 0.05;
        const baseY = 2.2 - index * 0.3; // Base positions for each text (closer together for more text)
        textRef.position.y = baseY + floatOffset;

        // Add subtle rotation
        textRef.rotation.y = Math.sin(time * 0.8 + index) * 0.1;

        // Add gentle pulsing scale
        const pulseScale = 1 + Math.sin(time * 2 + index) * 0.05;
        textRef.scale.setScalar(pulseScale);
      }
    });

    // Update particles animation. Straight onto the meshes: no React state,
    // no allocation, no mounting.
    if (gameStarted) {
      // The original moved particles by a fixed step per frame; scale by the
      // frame time so they drift at the same speed on any display.
      const step = Math.min(delta, 0.1) * 60;
      const phaseMultiplier =
        gamePhase === "showing" ? 1.5 : gamePhase === "playing" ? 0.8 : 1;

      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const particle = particleState.current[i];
        particle.life += delta;
        if (particle.life >= particle.maxLife) {
          seedAmbientParticle(i);
        }

        particle.x +=
          particle.vx * step + Math.sin(time * 0.5 + i) * 0.001 * phaseMultiplier;
        particle.y +=
          particle.vy * step + Math.sin(time * 0.8 + i) * 0.002 * phaseMultiplier;
        particle.z +=
          particle.vz * step + Math.cos(time * 0.3 + i) * 0.001 * phaseMultiplier;

        const mesh = particleMeshes.current[i];
        if (!mesh) continue;

        const lifeRatio = particle.life / particle.maxLife;
        const fade = Math.sin(lifeRatio * Math.PI);
        mesh.position.set(particle.x, particle.y, particle.z);
        const scale = 0.5 + fade * 0.5;
        mesh.scale.setScalar(scale);
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.opacity = fade * 0.8;
        material.emissiveIntensity =
          0.6 + Math.sin(lifeRatio * Math.PI * 2) * 0.3;
      }
    }
  });

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[biomeSize, 1, biomeSize]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>
      </RigidBody>

      {/* Central Table */}
      <Table
        position={[0, 0, 0]}
        size={[3, 0.8, 2]}
        color="#8B4513"
        legColor="#654321"
        castShadow={true}
      />

      {/* Candles on the table */}
      <Candle
        position={[-0.8, 0.9, 0.3]}
        isLit={candlesLit[0]}
        scale={0.8}
        smokeEnabled={true}
        smokeAnimationSpeed={1.5}
        smokeOpacity={0.7}
        onClick={() => {
          if (!candlesLit[0]) {
            const newCandlesLit = [...candlesLit];
            newCandlesLit[0] = true;
            setCandlesLit(newCandlesLit);
          }
        }}
      />
      <Candle
        position={[0.8, 0.9, 0.3]}
        isLit={candlesLit[1]}
        scale={0.8}
        smokeEnabled={true}
        smokeAnimationSpeed={1.5}
        smokeOpacity={0.7}
        onClick={() => {
          if (!candlesLit[1]) {
            const newCandlesLit = [...candlesLit];
            newCandlesLit[1] = true;
            setCandlesLit(newCandlesLit);
          }
        }}
      />

      {/* Interactive Book */}
      <mesh
        ref={bookRef}
        position={[0, 1, 0]}
        onClick={bookBroken ? undefined : startMemoryGame}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (bookBroken) {
            document.body.style.cursor = "not-allowed";
          } else {
            document.body.style.cursor = gameStarted
              ? "not-allowed"
              : "pointer";
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
        castShadow
      >
        <boxGeometry args={[0.8, 0.1, 0.6]} />
        <meshStandardMaterial
          color={bookBroken ? "#4A4A4A" : "#8B0000"}
          emissive={bookBroken ? "#000000" : "#FFD700"}
          emissiveIntensity={bookBroken ? 0 : 0.3}
        />
      </mesh>

      {/* Immersive Game Text Above Book */}
      <group
        ref={(el) => {
          if (el) debugTextRefs.current[0] = el;
        }}
      >
        <Text
          position={[0, 0, 0]}
          fontSize={0.2}
          color="#FFD700"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {bookBroken
            ? "📖 The ancient tome lies shattered..."
            : gameStarted
            ? `✨ The magic flows... Level ${level}`
            : "📖 Touch the ancient tome to begin"}
        </Text>
      </group>

      {/* Magical Pattern Display */}
      {gameStarted && currentPattern.length > 0 && gamePhase === "showing" && (
        <group
          ref={(el) => {
            if (el) debugTextRefs.current[1] = el;
          }}
        >
          <Text
            position={[0, 0, 0]}
            fontSize={0.15}
            color="#4CAF50"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            ✨ Watch the magical sequence... ✨
          </Text>
        </group>
      )}

      {/* Player Progress */}
      {gameStarted && gamePhase === "playing" && (
        <group
          ref={(el) => {
            if (el) debugTextRefs.current[2] = el;
          }}
        >
          <Text
            position={[0, 0, 0]}
            fontSize={0.15}
            color="#2196F3"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {playerSequence.length === 0
              ? "🌟 Repeat the magical pattern..."
              : `✨ ${playerSequence.length}/${currentPattern.length} steps completed`}
          </Text>
        </group>
      )}

      {/* Candle Status */}
      {gameStarted && !candlesLit.every((lit) => lit) && (
        <group
          ref={(el) => {
            if (el) debugTextRefs.current[3] = el;
          }}
        >
          <Text
            position={[0, 0, 0]}
            fontSize={0.12}
            color="#FF6B6B"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            🔥 The candles flicker dangerously...
          </Text>
        </group>
      )}

      {/* Breaking Ability */}
      {gameStarted && playerStats.strength >= 10 && breakCooldown === 0 && (
        <group
          ref={(el) => {
            if (el) debugTextRefs.current[4] = el;
          }}
        >
          <Text
            position={[0, 0, 0]}
            fontSize={0.12}
            color="#FFD700"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            💪 Your strength can shatter the cubes...
          </Text>
        </group>
      )}

      {/* Victory Message */}
      {gamePhase === "completed" && (
        <group
          ref={(el) => {
            if (el) debugTextRefs.current[5] = el;
          }}
        >
          <Text
            position={[0, 0, 0]}
            fontSize={0.18}
            color="#4CAF50"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            🎉 The ancient magic is yours! 🎉
          </Text>
        </group>
      )}

      {/* Memory Game Blocks */}
      {blocks.length > 0 &&
        (gameStarted || isSpawning) &&
        blocks.map((block, index) => {
          const isBroken = brokenCubes.has(block.id);
          const canBreak =
            !isBroken && playerStats.strength >= 10 && breakCooldown === 0;

          return (
            <BreakableMesh
              key={block.id}
              breakingOptions={{
                fragmentCount: 6,
                fractureImpulse: 2.0,
                minSizeForFracture: 0.1,
                maxSizeForFracture: 0.3,
              }}
              onBreak={(impactPoint) => {
                if (canBreak) {
                  breakCube(block.id, impactPoint);
                }
              }}
              onFragmentClick={(fragmentId) => {
                console.log("Fragment clicked:", fragmentId);
              }}
              disabled={!canBreak}
            >
              <mesh
                ref={(el) => {
                  if (el) blockRefs.current[index] = el;
                }}
                position={block.position}
                onClick={() => {
                  if (!canBreak) {
                    handleBlockClick(block.id);
                  }
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  if (isBroken) {
                    document.body.style.cursor = "not-allowed";
                  } else if (canBreak) {
                    document.body.style.cursor = "crosshair";
                  } else {
                    document.body.style.cursor =
                      gamePhase === "playing" ? "pointer" : "default";
                  }
                }}
                onPointerOut={() => {
                  document.body.style.cursor = "default";
                }}
                castShadow
                visible={!isBroken}
              >
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial
                  color={redBlocks.has(block.id) ? "#FF0000" : block.color}
                  emissive={
                    redBlocks.has(block.id) ? "#FF0000" : block.emissiveColor
                  }
                  emissiveIntensity={redBlocks.has(block.id) ? 0.8 : 0.2}
                />
              </mesh>
            </BreakableMesh>
          );
        })}

      {/* Animated Magical Particles - a fixed pool, animated in useFrame */}
      {gameStarted &&
        Array.from({ length: PARTICLE_POOL_SIZE }, (_unused, index) => {
          const color = PARTICLE_COLORS[index % PARTICLE_COLORS.length];
          return (
            <mesh
              key={index}
              ref={(el) => {
                particleMeshes.current[index] = el;
              }}
            >
              <sphereGeometry args={[0.02 + (index % 5) * 0.015]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.6}
                transparent
                opacity={0}
              />
            </mesh>
          );
        })}

      {/* Action Cards */}
      <Html position={[0, 2, 0]}>
        <RoomActionCards
          cards={cards}
          isVisible={isVisible}
          onCardClick={(card) => {
            if (card.id === "start_puzzle" && !gameStarted) {
              startMemoryGame();
              hideCards();
            }
          }}
        />
      </Html>
    </group>
  );
};

export default MemoryGamePuzzleBiome;
