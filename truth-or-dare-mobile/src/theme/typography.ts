/**
 * Typography design tokens for Truth or Dare for Couples.
 * Fonts: Playfair Display (serif romantic) + Be Vietnam Pro (body).
 */

/** Font family names as registered by expo-google-fonts. */
export const FONTS = {
  // Serif — romantic headings
  serifBold: 'PlayfairDisplay_700Bold',
  serifRegular: 'PlayfairDisplay_400Regular',
  serifItalic: 'PlayfairDisplay_400Regular_Italic',
  serifBoldItalic: 'PlayfairDisplay_700Bold_Italic',

  // Body — modern sans-serif
  bodyLight: 'BeVietnamPro_300Light',
  bodyRegular: 'BeVietnamPro_400Regular',
  bodyMedium: 'BeVietnamPro_500Medium',
  bodySemiBold: 'BeVietnamPro_600SemiBold',
  bodyBold: 'BeVietnamPro_700Bold',
} as const;

/** Type scale — pixel sizes matching the web app. */
export const FONT_SIZES = {
  '2xs': 9,
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  '8xl': 96,
} as const;

/** Line height multipliers. */
export const LINE_HEIGHTS = {
  tight: 1.1,
  snug: 1.25,
  normal: 1.4,
  relaxed: 1.625,
  loose: 2,
} as const;

/** Letter spacing values. */
export const LETTER_SPACING = {
  tighter: -0.5,
  tight: -0.25,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const;

/** Spacing scale (in dp). */
export const SPACING = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

/** Border radius values. */
export const RADII = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;
