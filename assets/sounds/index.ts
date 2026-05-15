// Sounds index
// This file defines available audio assets

export interface SoundDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  filename: string;
  format: 'mp3' | 'wav' | 'ogg';
  duration?: number;
  volume?: number;
  loop?: boolean;
}

export const SOUNDS: SoundDefinition[] = [
  {
    id: 'click',
    name: 'Click Sound',
    category: 'UI',
    description: 'Button click sound effect',
    filename: 'click.wav',
    format: 'wav',
    volume: 0.5
  },
  {
    id: 'hover',
    name: 'Hover Sound',
    category: 'UI',
    description: 'Button hover sound effect',
    filename: 'hover.wav',
    format: 'wav',
    volume: 0.3
  },
  {
    id: 'success',
    name: 'Success Sound',
    category: 'UI',
    description: 'Success notification sound',
    filename: 'success.wav',
    format: 'wav',
    volume: 0.6
  },
  {
    id: 'error',
    name: 'Error Sound',
    category: 'UI',
    description: 'Error notification sound',
    filename: 'error.wav',
    format: 'wav',
    volume: 0.6
  },
  {
    id: 'ambient',
    name: 'Ambient Background',
    category: 'Ambient',
    description: 'Background ambient sound',
    filename: 'ambient.mp3',
    format: 'mp3',
    volume: 0.2,
    loop: true
  }
];

export const getSoundUrl = (soundId: string): string => {
  const sound = SOUNDS.find(s => s.id === soundId);
  if (!sound) {
    throw new Error(`Sound not found: ${soundId}`);
  }
  return `/assets/sounds/${sound.filename}`;
};

export const getSoundsByCategory = (category: string): SoundDefinition[] => {
  return SOUNDS.filter(sound => sound.category === category);
};
