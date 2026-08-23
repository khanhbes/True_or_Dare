/**
 * Collection route — exposes CardCollectionScreen via expo-router.
 */
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { AppShell } from '@/components/AppShell';
import { CardCollectionScreen } from '@/screens/CardCollectionScreen';
import { INITIAL_CARDS } from '@/shared/data/cards';

export default function CollectionRoute() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<string[]>([]);

  const handleToggleFavorite = (cardId: string) => {
    setFavorites((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );
  };

  return (
    <AppShell>
      <CardCollectionScreen
        cards={INITIAL_CARDS}
        favorites={favorites}
        mode="developer" // shows all cards in standalone collection route
        onToggleFavorite={handleToggleFavorite}
        onBack={() => router.back()}
      />
    </AppShell>
  );
}
