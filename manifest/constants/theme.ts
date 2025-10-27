/**
 * Theme colors for the Manifest app - Dark theme with secondary as background
 */
export const Colors = {
  primary: "#1d65c9",
  secondary: "#212021",

  // UI Colors - Dark theme
  background: "#212021", // Secondary color as main background
  surface: "#2a2a2a", // Slightly lighter for cards/surfaces
  surfaceElevated: "#333333", // Even lighter for elevated surfaces

  // Status Colors
  success: "#08b333ff",
  error: "#f3372dff",
  warning: "#FF9500",

  // Text Colors - High contrast for dark background
  textPrimary: "#ffffff", // White for primary text
  textSecondary: "#b0b0b0", // Light gray for secondary text
  textMuted: "#808080", // Medium gray for muted text
  textLight: "#ffffff", // White for buttons/badges
  textDark: "#212021", // Dark text for light backgrounds
  placeholder: "#9a9a9a", // Light gray for placeholder text

  // Border and Divider - Lighter for dark theme
  border: "#404040",
  divider: "#333333",

  // Transparent overlays
  overlay: "rgba(0, 0, 0, 0.7)",

  // Color variants
  primaryLight: "#2b4a7a", // Darker variant of primary for dark theme
  primaryDark: "#163d8f",
  successLight: "#2a2a2a",
};

/**
 * Common spacing values
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 15,
  xl: 20,
};

/**
 * Common border radius values
 */
export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 20,
};

/**
 * Typography
 */
export const Typography = {
  sizes: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
  },
  weights: {
    regular: "400" as const,
    medium: "600" as const,
    bold: "bold" as const,
  },
};
