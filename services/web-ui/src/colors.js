// PantryPal - Amber/Orange Theme
// Web color palette for React web app
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
  
  // Legacy color support (for backward compatibility)
  accent: '#fbbf24',         // Maps to primary
  scanButton: '#f97316',     // Maps to secondary
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
};

export const shadows = {
  small: '0 2px 4px rgba(0, 0, 0, 0.05)',
  medium: '0 4px 8px rgba(0, 0, 0, 0.08)',
  large: '0 8px 16px rgba(0, 0, 0, 0.12)',
};

// CSS gradient strings ready to use
export const gradients = {
  primary: 'linear-gradient(to bottom right, #fbbf24, #f97316)',
  warm: 'linear-gradient(to bottom right, #fff7ed, #fef3c7, #fef9c3)',
};

// Tailwind-style class name equivalents for reference
export const tailwindClasses = {
  text: 'text-amber-400, text-orange-500',
  bg: 'bg-amber-50, bg-amber-100',
  border: 'border-amber-400, border-orange-500',
  gradient: 'from-amber-400 to-orange-500',
};