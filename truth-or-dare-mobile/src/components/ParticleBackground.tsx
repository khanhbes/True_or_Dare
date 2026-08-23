/**
 * ParticleBackground — ambient floating particle effect.
 * Reimplements the web's CSS-animated particles using Reanimated for
 * smooth 60fps animations on the native UI thread.
 *
 * 28 particles in rose/gold/wine colors, with bokeh blurs and
 * a wine radial center gradient.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { COLORS } from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

const generateParticles = (count: number): Particle[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_WIDTH,
    y: Math.random() * SCREEN_HEIGHT,
    size: Math.random() * 5 + 2,
    duration: (Math.random() * 10 + 6) * 1000,
    delay: Math.random() * 5000,
    color:
      i % 3 === 0
        ? COLORS.rose
        : i % 3 === 1
          ? COLORS.gold
          : COLORS.wineDeep,
  }));

const AnimatedParticle: React.FC<{ particle: Particle }> = ({ particle }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    translateY.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(-120, {
          duration: particle.duration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );

    translateX.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(20, {
          duration: particle.duration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );

    opacity.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: particle.duration * 0.2 }),
          withTiming(0.8, { duration: particle.duration * 0.6 }),
          withTiming(0, { duration: particle.duration * 0.2 }),
        ),
        -1,
      ),
    );

    scale.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(1.2, {
          duration: particle.duration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: particle.x,
          top: particle.y,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
          // Glow effect via shadow
          shadowColor: particle.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: particle.size * 3,
          elevation: 0,
        },
        animatedStyle,
      ]}
    />
  );
};

export const ParticleBackground: React.FC = React.memo(() => {
  const particles = useMemo(() => generateParticles(28), []);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Bokeh blur lights */}
      <View style={[styles.bokeh, styles.bokeh1]} />
      <View style={[styles.bokeh, styles.bokeh2]} />
      <View style={[styles.bokeh, styles.bokeh3]} />

      {/* Wine radial center gradient overlay */}
      <View style={styles.radialOverlay} />

      {/* Floating particles */}
      {particles.map((p) => (
        <AnimatedParticle key={p.id} particle={p} />
      ))}
    </View>
  );
});

ParticleBackground.displayName = 'ParticleBackground';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  bokeh: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.18,
  },
  bokeh1: {
    width: 500,
    height: 500,
    backgroundColor: COLORS.wineDeep,
    top: -96,
    left: -96,
    opacity: 0.25,
  },
  bokeh2: {
    width: 400,
    height: 400,
    backgroundColor: COLORS.rose,
    bottom: -64,
    right: -64,
    opacity: 0.20,
  },
  bokeh3: {
    width: 350,
    height: 350,
    backgroundColor: COLORS.gold,
    top: '20%' as unknown as number,
    right: '10%' as unknown as number,
    opacity: 0.15,
  },
  radialOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#4a121a',
    opacity: 0.4,
  },
});
