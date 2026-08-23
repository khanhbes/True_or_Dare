import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { AppShell } from '@/components/AppShell';
import { IntroScreen } from '@/screens/IntroScreen';
import { RulesModal } from '@/components/RulesModal';

export default function HomeScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'player' | 'developer'>('player');
  const [showRules, setShowRules] = useState(false);

  return (
    <AppShell>
      <IntroScreen
        mode={mode}
        onModeChange={setMode}
        onStart={() => router.push('/setup')}
        onOpenCollection={() => router.push('/collection')}
        onOpenRules={() => setShowRules(true)}
      />
      <RulesModal visible={showRules} onClose={() => setShowRules(false)} />
    </AppShell>
  );
}
