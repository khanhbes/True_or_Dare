/**
 * Design tokens — Color palette for Truth or Dare for Couples.
 * Mirrors the web app's dark wine / gold / rose romantic theme.
 */

export const COLORS = {
  // ── Core background ──
  bg: '#12090f',
  wine: '#1a0810',
  wineSurface: '#2d0c13',
  wineDeep: '#7A1F2B',

  // ── Accent ──
  gold: '#D4AF37',
  goldLight: '#FBF5B7',
  goldDark: '#AA771C',
  rose: '#FF6B9D',
  roseDark: '#c33d7a',

  // ── Gold gradient stops ──
  goldGradientStart: '#DFBA67',
  goldGradientMid: '#C59B27',
  goldGradientEnd: '#9E7412',

  // ── Card backgrounds ──
  cardGentle: {
    start: '#1a0810',
    mid: '#0d0407',
    end: '#0a0305',
  },
  cardIntimate: {
    start: '#2d1854',
    mid: '#1e1045',
    end: '#150a35',
  },
  cardPassionate: {
    start: '#3d2a0a',
    mid: '#2a1d08',
    end: '#1f1606',
  },
  cardPosition: {
    start: '#111d37',
    mid: '#070b18',
    end: '#03050c',
  },
  cardPositionRare: {
    start: '#35124b',
    mid: '#120717',
    end: '#050507',
  },

  // ── Position card accents ──
  champagne: '#e2c275',
  champagneLight: '#f7e7b0',
  champagneDark: '#725c2d',
  platinum: '#f4e8ff',
  roseGold: '#e8a48c',

  // ── Glassmorphism ──
  glassWine: 'rgba(45, 12, 19, 0.65)',
  glassDark: 'rgba(22, 18, 20, 0.75)',
  glassBorderGold: 'rgba(212, 175, 55, 0.2)',
  glassBorderRose: 'rgba(255, 107, 157, 0.15)',

  // ── Neutrals ──
  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.9)',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  textSubtle: 'rgba(255, 255, 255, 0.4)',
  neutral50: '#f5f5f5',
  neutral300: '#d4d4d4',
  neutral400: '#a3a3a3',
  neutral500: '#737373',
  neutral700: '#404040',
  neutral800: '#262626',
  neutral900: '#171717',
  neutral950: '#0a0a0a',

  // ── Semantic ──
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  // ── Player colors ──
  player1: '#FF6B9D',
  player2: '#D4AF37',
} as const;

/** Opacity helper — returns `rgba(hex, alpha)` for overlays. */
export function withOpacity(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
