/**
 * AppShell — root wrapper providing the dark wine background with
 * animated particles, safe area insets, and translucent status bar.
 *
 * All screens should be rendered inside this shell.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ParticleBackground } from './ParticleBackground';
import { COLORS } from '@/theme';

interface AppShellProps {
  children: React.ReactNode;
  /** Whether to show the particle background. Default: true */
  showParticles?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  showParticles = true,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Animated particle background — fixed, behind all content */}
      {showParticles && <ParticleBackground />}

      {/* Main content area — above particles, with safe area padding */}
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
});
