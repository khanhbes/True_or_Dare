/**
 * CompletionToast — Task 7
 * Fade-in/out toast after card completion showing intimacy/star gains.
 * Auto-dismisses after 2.5s. Uses absolute positioning over ScrollView.
 */
import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { FONTS } from '@/theme';

export interface CompletionToastData {
  intimacyGain?: number;
  starGain?: number;
  luxuryGain?: number;
  isPosition?: boolean;
}

interface CompletionToastProps {
  data: CompletionToastData | null;
  onDismiss: () => void;
}

export const CompletionToast: React.FC<CompletionToastProps> = ({ data, onDismiss }) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!data) {
      opacity.value = 0;
      return;
    }

    // Fade in → hold → fade out
    opacity.value = withSequence(
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
      withDelay(1800, withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) })),
    );

    const timer = setTimeout(() => {
      onDismiss();
    }, 2500);
    return () => clearTimeout(timer);
  }, [data]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: (1 - opacity.value) * -12 }],
  }));

  if (!data) return null;

  let text = '';
  if (data.isPosition) {
    text = data.luxuryGain ? `+${data.luxuryGain}% luxury · ✦` : '✦ Hoàn thành tư thế!';
  } else {
    const parts: string[] = [];
    if (data.intimacyGain) parts.push(`+${Math.round(data.intimacyGain)}% thân mật`);
    if (data.starGain) parts.push(`+${data.starGain}★`);
    text = parts.join(' · ');
  }

  if (!text) return null;

  return (
    <Animated.View style={[styles.toast, animStyle]} pointerEvents="none">
      <Text style={styles.toastText}>{text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    zIndex: 999,
    backgroundColor: 'rgba(20, 10, 18, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.4)',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 10,
    maxWidth: '70%' as unknown as number,
    shadowColor: '#FF6B9D',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toastText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.3,
  },
});
