import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { AppShell } from '@/components/AppShell';
import { SetupScreen } from '@/screens/SetupScreen';
import { RulesModal } from '@/components/RulesModal';
import { DEFAULT_PLAYER_1, DEFAULT_PLAYER_2 } from '@/shared/utils/playerStorage';
import { hydrateGameSettings } from '@/shared/utils/wardrobe';

export default function SetupRoute() {
  const router = useRouter();
  const defaultSettings = hydrateGameSettings(null);
  const [showRules, setShowRules] = useState(false);

  return (
    <AppShell>
      <SetupScreen
        initialPlayer1={DEFAULT_PLAYER_1}
        initialPlayer2={DEFAULT_PLAYER_2}
        initialSettings={defaultSettings}
        onBack={() => router.back()}
        onOpenRules={() => setShowRules(true)}
        onStartGame={(p1, p2, settings) => {
          router.push({
            pathname: '/game',
            params: {
              p1Name: p1.name,
              p1Avatar: p1.avatar,
              p2Name: p2.name,
              p2Avatar: p2.avatar,
            },
          });
        }}
      />
      <RulesModal visible={showRules} onClose={() => setShowRules(false)} />
    </AppShell>
  );
}
