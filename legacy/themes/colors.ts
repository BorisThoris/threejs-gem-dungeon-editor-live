// Color palette and theme system
export interface ColorTheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

// Extended color palette with 200+ colors
export const COLOR_PALETTE = {
  // Primary Colors
  red: [
    "#FF0000", "#FF1A1A", "#FF3333", "#FF4D4D", "#FF6666", "#FF8080", "#FF9999", "#FFB3B3", "#FFCCCC", "#FFE6E6",
    "#E60000", "#CC0000", "#B30000", "#990000", "#800000", "#660000", "#4D0000", "#330000", "#1A0000", "#000000"
  ],
  orange: [
    "#FF8000", "#FF8F1A", "#FF9F33", "#FFAF4D", "#FFBF66", "#FFCF80", "#FFDF99", "#FFEFB3", "#FFFFCC", "#FFFFE6",
    "#E67300", "#CC6600", "#B35900", "#994D00", "#804000", "#663300", "#4D2600", "#331A00", "#1A0D00", "#000000"
  ],
  yellow: [
    "#FFFF00", "#FFFF1A", "#FFFF33", "#FFFF4D", "#FFFF66", "#FFFF80", "#FFFF99", "#FFFFB3", "#FFFFCC", "#FFFFE6",
    "#E6E600", "#CCCC00", "#B3B300", "#999900", "#808000", "#666600", "#4D4D00", "#333300", "#1A1A00", "#000000"
  ],
  green: [
    "#00FF00", "#1AFF1A", "#33FF33", "#4DFF4D", "#66FF66", "#80FF80", "#99FF99", "#B3FFB3", "#CCFFCC", "#E6FFE6",
    "#00E600", "#00CC00", "#00B300", "#009900", "#008000", "#006600", "#004D00", "#003300", "#001A00", "#000000"
  ],
  blue: [
    "#0000FF", "#1A1AFF", "#3333FF", "#4D4DFF", "#6666FF", "#8080FF", "#9999FF", "#B3B3FF", "#CCCCFF", "#E6E6FF",
    "#0000E6", "#0000CC", "#0000B3", "#000099", "#000080", "#000066", "#00004D", "#000033", "#00001A", "#000000"
  ],
  purple: [
    "#8000FF", "#8F1AFF", "#9F33FF", "#AF4DFF", "#BF66FF", "#CF80FF", "#DF99FF", "#EFB3FF", "#FFCCFF", "#FFE6FF",
    "#7300E6", "#6600CC", "#5900B3", "#4D0099", "#400080", "#330066", "#26004D", "#1A0033", "#0D001A", "#000000"
  ],
  pink: [
    "#FF0080", "#FF1A8F", "#FF339F", "#FF4DAF", "#FF66BF", "#FF80CF", "#FF99DF", "#FFB3EF", "#FFCCFF", "#FFE6FF",
    "#E60073", "#CC0066", "#B30059", "#99004D", "#800040", "#660033", "#4D0026", "#33001A", "#1A000D", "#000000"
  ],
  cyan: [
    "#00FFFF", "#1AFFFF", "#33FFFF", "#4DFFFF", "#66FFFF", "#80FFFF", "#99FFFF", "#B3FFFF", "#CCFFFF", "#E6FFFF",
    "#00E6E6", "#00CCCC", "#00B3B3", "#009999", "#008080", "#006666", "#004D4D", "#003333", "#001A1A", "#000000"
  ],
  magenta: [
    "#FF00FF", "#FF1AFF", "#FF33FF", "#FF4DFF", "#FF66FF", "#FF80FF", "#FF99FF", "#FFB3FF", "#FFCCFF", "#FFE6FF",
    "#E600E6", "#CC00CC", "#B300B3", "#990099", "#800080", "#660066", "#4D004D", "#330033", "#1A001A", "#000000"
  ],
  
  // Extended Color Ranges
  warm: [
    "#FF4500", "#FF6347", "#FF7F50", "#FFA07A", "#FFB6C1", "#FFC0CB", "#FFD700", "#FFE4B5", "#FFF8DC", "#FFFFF0",
    "#FF8C00", "#FFA500", "#FFB347", "#FFC125", "#FFD700", "#FFE55C", "#FFF176", "#FFF59D", "#FFF9C4", "#FFFDE7"
  ],
  cool: [
    "#00CED1", "#20B2AA", "#40E0D0", "#00FFFF", "#87CEEB", "#87CEFA", "#B0E0E6", "#E0FFFF", "#F0F8FF", "#F5FFFA",
    "#191970", "#000080", "#0000CD", "#4169E1", "#6495ED", "#7B68EE", "#9370DB", "#BA55D3", "#DA70D6", "#EE82EE"
  ],
  earth: [
    "#8B4513", "#A0522D", "#CD853F", "#DEB887", "#F5DEB3", "#FFE4C4", "#FFEBCD", "#FFF8DC", "#F0E68C", "#BDB76B",
    "#556B2F", "#6B8E23", "#9ACD32", "#ADFF2F", "#7FFF00", "#32CD32", "#00FF7F", "#00FA9A", "#90EE90", "#98FB98"
  ],
  pastel: [
    "#FFB6C1", "#FFC0CB", "#FFDAB9", "#FFE4E1", "#FFF0F5", "#F0F8FF", "#E6E6FA", "#D8BFD8", "#DDA0DD", "#EE82EE",
    "#F0E68C", "#F5DEB3", "#FFE4B5", "#FFF8DC", "#F0FFF0", "#F5FFFA", "#F0FFFF", "#E0FFFF", "#E6F3FF", "#F0F8FF"
  ],
  neon: [
    "#FF1493", "#FF00FF", "#8A2BE2", "#0000FF", "#00FFFF", "#00FF00", "#FFFF00", "#FF8C00", "#FF0000", "#FF69B4",
    "#FF6347", "#FF4500", "#FFD700", "#ADFF2F", "#00FF7F", "#00CED1", "#1E90FF", "#9370DB", "#FF1493", "#FF69B4"
  ],
  metallic: [
    "#C0C0C0", "#A8A8A8", "#808080", "#696969", "#2F4F4F", "#708090", "#778899", "#B0C4DE", "#E6E6FA", "#F8F8FF",
    "#FFD700", "#DAA520", "#B8860B", "#CD853F", "#D2691E", "#A0522D", "#8B4513", "#654321", "#2F1B14", "#1C1C1C"
  ],
  jewel: [
    "#FF0000", "#FF4500", "#FF8C00", "#FFD700", "#ADFF2F", "#00FF00", "#00FF7F", "#00FFFF", "#0080FF", "#0000FF",
    "#8A2BE2", "#FF1493", "#FF69B4", "#FFB6C1", "#DDA0DD", "#9370DB", "#8A2BE2", "#4B0082", "#800080", "#8B008B"
  ],
  monochrome: [
    "#000000", "#1A1A1A", "#333333", "#4D4D4D", "#666666", "#808080", "#999999", "#B3B3B3", "#CCCCCC", "#E6E6E6",
    "#FFFFFF", "#F5F5F5", "#E0E0E0", "#CCCCCC", "#B3B3B3", "#999999", "#808080", "#666666", "#4D4D4D", "#333333"
  ]
};

// Flatten all colors into a single array for easy access
export const ALL_COLORS = Object.values(COLOR_PALETTE).flat();

// Predefined themes
export const THEMES: Record<string, ColorTheme> = {
  dark: {
    name: "Dark",
    primary: "#4CAF50",
    secondary: "#2196F3",
    accent: "#FF9800",
    background: "#121212",
    surface: "#1E1E1E",
    text: "#FFFFFF",
    textSecondary: "#B0B0B0",
    border: "#333333",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
    info: "#2196F3"
  },
  light: {
    name: "Light",
    primary: "#2196F3",
    secondary: "#4CAF50",
    accent: "#FF5722",
    background: "#FFFFFF",
    surface: "#F5F5F5",
    text: "#212121",
    textSecondary: "#757575",
    border: "#E0E0E0",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
    info: "#2196F3"
  },
  neon: {
    name: "Neon",
    primary: "#00FFFF",
    secondary: "#FF00FF",
    accent: "#FFFF00",
    background: "#000000",
    surface: "#1A0033",
    text: "#00FFFF",
    textSecondary: "#FF00FF",
    border: "#00FFFF",
    success: "#00FF00",
    warning: "#FFFF00",
    error: "#FF0040",
    info: "#0080FF"
  },
  ocean: {
    name: "Ocean",
    primary: "#00BCD4",
    secondary: "#03A9F4",
    accent: "#FF5722",
    background: "#001F3F",
    surface: "#003366",
    text: "#E0F7FA",
    textSecondary: "#B2EBF2",
    border: "#00ACC1",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
    info: "#00BCD4"
  },
  forest: {
    name: "Forest",
    primary: "#4CAF50",
    secondary: "#8BC34A",
    accent: "#FFC107",
    background: "#0D2818",
    surface: "#1B4332",
    text: "#D8F3DC",
    textSecondary: "#B7E4C7",
    border: "#52C41A",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
    info: "#2196F3"
  },
  sunset: {
    name: "Sunset",
    primary: "#FF5722",
    secondary: "#FF9800",
    accent: "#FFC107",
    background: "#2C1810",
    surface: "#4A2C17",
    text: "#FFF3E0",
    textSecondary: "#FFE0B2",
    border: "#FF7043",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
    info: "#2196F3"
  },
  cyberpunk: {
    name: "Cyberpunk",
    primary: "#00FF41",
    secondary: "#FF0080",
    accent: "#00FFFF",
    background: "#0A0A0A",
    surface: "#1A1A1A",
    text: "#00FF41",
    textSecondary: "#FF0080",
    border: "#00FFFF",
    success: "#00FF41",
    warning: "#FFFF00",
    error: "#FF0040",
    info: "#00FFFF"
  },
  vintage: {
    name: "Vintage",
    primary: "#8B4513",
    secondary: "#D2691E",
    accent: "#DAA520",
    background: "#2F1B14",
    surface: "#4A2C17",
    text: "#F5DEB3",
    textSecondary: "#DEB887",
    border: "#CD853F",
    success: "#228B22",
    warning: "#DAA520",
    error: "#DC143C",
    info: "#4169E1"
  }
};

// Default theme
export const DEFAULT_THEME = THEMES.dark;

// Utility functions
export const getRandomColor = (): string => {
  return ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)];
};

export const getRandomColorFromPalette = (palette: keyof typeof COLOR_PALETTE): string => {
  const colors = COLOR_PALETTE[palette];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const getColorByIndex = (index: number): string => {
  return ALL_COLORS[index % ALL_COLORS.length];
};

export const getColorsByPalette = (palette: keyof typeof COLOR_PALETTE): string[] => {
  return COLOR_PALETTE[palette];
};

// Color manipulation utilities
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const lightenColor = (hex: string, amount: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const r = Math.min(255, rgb.r + amount);
  const g = Math.min(255, rgb.g + amount);
  const b = Math.min(255, rgb.b + amount);
  
  return rgbToHex(r, g, b);
};

export const darkenColor = (hex: string, amount: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const r = Math.max(0, rgb.r - amount);
  const g = Math.max(0, rgb.g - amount);
  const b = Math.max(0, rgb.b - amount);
  
  return rgbToHex(r, g, b);
};
