import { create } from 'zustand';

interface InitializationState {
  isInitializing: boolean;
  progress: number;
  status: string;
  isComplete: boolean;
  error: string | null;
  initializationSteps: {
    [key: string]: boolean;
  };
}

interface InitializationActions {
  setInitializing: (isInitializing: boolean) => void;
  setProgress: (progress: number) => void;
  setStatus: (status: string) => void;
  setComplete: (isComplete: boolean) => void;
  setError: (error: string | null) => void;
  setStepComplete: (step: string, complete: boolean) => void;
  reset: () => void;
}

const useInitializationStore = create<InitializationState & InitializationActions>((set) => ({
  // State
  isInitializing: true,
  progress: 0,
  status: 'Initializing...',
  isComplete: false,
  error: null,
  initializationSteps: {},

  // Actions
  setInitializing: (isInitializing) => set({ isInitializing }),
  setProgress: (progress) => set({ progress: Math.max(0, Math.min(1, progress)) }),
  setStatus: (status) => set({ status }),
  setComplete: (isComplete) => set({ isComplete }),
  setError: (error) => set({ error }),
  setStepComplete: (step, complete) => 
    set((state) => ({
      initializationSteps: {
        ...state.initializationSteps,
        [step]: complete,
      },
    })),
  reset: () => set({
    isInitializing: true,
    progress: 0,
    status: 'Initializing...',
    isComplete: false,
    error: null,
    initializationSteps: {},
  }),
}));

export default useInitializationStore;
