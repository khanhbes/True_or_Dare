import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { AppShell } from '@/components/AppShell';
import { SetupScreen } from '@/screens/SetupScreen';
import { RulesModal } from '@/components/RulesModal';
import { DEFAULT_PLAYER_1, DEFAULT_PLAYER_2 } from '@/shared/utils/playerStorage';
import { hydrateGameSettings } from '@/shared/utils/wardrobe';
import type { GameSettings, Player } from '@/shared/types';

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
        onStartGame={(p1: Player, p2: Player, settings: GameSettings) => {
          router.push({
            pathname: '/game',
            params: {
              settingsJson: JSON.stringify(settings),
              p1Json: JSON.stringify(p1),
              p2Json: JSON.stringify(p2),
            },
          });
        }}
      />
      <RulesModal visible={showRules} onClose={() => setShowRules(false)} />
    </AppShell>
  );
}
