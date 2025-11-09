// PantryPal - Amber/Orange Theme
// Mobile color palette for React Native
export const colors = {
  // Primary brand colors
  primary: '#fbbf24',        // Amber 400
  secondary: '#f97316',      // Orange 500
  
  // Backgrounds
  background: '#fffbeb',     // Amber 50
  card: '#ffffff',           // White
  lightBackground: '#fef3c7', // Amber 100
  
  // Accent colors (warm, shared across PalStack)
  accentOrange: '#f97316',   // Orange 500
  accentAmber: '#fbbf24',    // Amber 400
  
  // Text colors (consistent neutrals)
  textPrimary: '#1e293b',    // Slate 800
  textSecondary: '#475569',  // Slate 600
  textTertiary: '#94a3b8',   // Slate 400
  textDark: '#78350f',       // Amber 900 (for amber backgrounds)
  
  // Border colors
  border: '#fef3c7',         // Amber 100
  borderMedium: '#fde68a',   // Amber 200
  borderLight: '#E8E8E8',    // Light grey (legacy)
  
  // Semantic colors
  success: '#10b981',        // Emerald 500
  warning: '#f59e0b',        // Amber 500
  error: '#ef4444',          // Red 500
  info: '#3b82f6',           // Blue 500
  
  // Gradients (for use in LinearGradient or similar)
  gradientStart: '#fbbf24',  // Amber 400
  gradientEnd: '#f97316',    // Orange 500
  
  // Warm background gradient colors
  warmGradient1: '#fff7ed',  // Orange 50
  warmGradient2: '#fef3c7',  // Amber 100
  warmGradient3: '#fef9c3',  // Yellow 50
  
  // Legacy color support (for backward compatibility)
  accent: '#fbbf24',         // Maps to primary
  scanButton: '#f97316',     // Maps to secondary
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Tailwind-style class name equivalents for reference
export const tailwindClasses = {
  text: 'text-amber-400, text-orange-500',
  bg: 'bg-amber-50, bg-amber-100',
  border: 'border-amber-400, border-orange-500',
  gradient: 'from-amber-400 to-orange-500',
};