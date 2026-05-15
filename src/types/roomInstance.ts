import { Room } from './map';

export interface RoomInstance {
  id: string;
  room: Room;
  isLoaded: boolean;
  isActive: boolean;
  loadedAt?: number;
  // Room-specific state
  enemies: any[];
  items: any[];
  puzzles: any[];
  // Transition state
  isTransitioning: boolean;
  transitionDirection?: 'north' | 'south' | 'east' | 'west';
}

export interface RoomTransition {
  fromRoomId: string;
  toRoomId: string;
  direction: 'north' | 'south' | 'east' | 'west';
  isTransitioning: boolean;
  transitionProgress: number; // 0-1
}

export interface RoomManagerState {
  currentRoomId: string | null;
  roomInstances: Map<string, RoomInstance>;
  transition: RoomTransition | null;
  isLoading: boolean;
  loadingProgress: number;
}

export interface RoomManagerActions {
  // Room management
  loadRoom: (roomId: string) => Promise<void>;
  unloadRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string) => void;
  
  // Transitions
  startTransition: (fromRoomId: string, toRoomId: string, direction: 'north' | 'south' | 'east' | 'west') => Promise<void>;
  completeTransition: () => void;
  
  // Room state
  updateRoomState: (roomId: string, updates: Partial<RoomInstance>) => void;
  
  // Loading
  setLoading: (isLoading: boolean, progress?: number) => void;
  
  // Cleanup
  cleanup: () => void;
}
