/**
 * Haptic feedback utility wrapping expo-haptics.
 * Provides micro-interactions for card flips, buttons, completions, and timers.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const haptics = {
  /** Light impact for button taps and subtle interactions */
  light: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  },

  /** Medium impact for card flips and dialog opens */
  medium: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  },

  /** Heavy impact for garment removals, high tier cards */
  heavy: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  },

  /** Success notification for completing cards or winning */
  success: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  },

  /** Warning notification for timer running out or skip confirmation */
  warning: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
  },

  /** Selection click for toggles, picker items */
  selection: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.selectionAsync();
    } catch {}
  },
};
