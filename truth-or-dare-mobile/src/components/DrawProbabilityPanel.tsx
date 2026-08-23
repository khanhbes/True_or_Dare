/**
 * DrawProbabilityPanel — Task 6
 * Collapsible panel showing live draw probabilities.
 * - When cardState === 'deck': live probabilities from getJourneyDrawProbabilities
 * - When card is drawn: frozen snapshot
 * - In position phase: only star distribution
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { COLORS, FONTS } from '@/theme';
import type {
  CardType,
  JourneyPhase,
  OutfitState,
  ProgressionConfig,
  PlayerIndex,
  CardLevel,
} from '@/shared/types';
import type {
  JourneyDrawProbabilities,
  LuxuryDrawProbabilities,
} from '@/shared/utils/progression';
import { getJourneyDrawProbabilities } from '@/shared/utils/progression';
import type { CardItem } from '@/shared/types';

interface DrawProbabilityPanelProps {
  cardState: 'deck' | 'drawn_hidden' | 'drawn_revealed' | 'completed';
  journeyPhase: JourneyPhase;
  // For live calculation (deck state)
  availableCards: CardItem[];
  actorIndex: PlayerIndex;
  outfits: [OutfitState, OutfitState];
  usedCardIds: string[];
  levels: readonly CardLevel[];
  intimacyPercent: number;
  config: ProgressionConfig;
  pendingDifficultyBoost: boolean;
  preferredType?: CardType | null;
  // Frozen snapshot (drawn state)
  snapshot: JourneyDrawProbabilities | LuxuryDrawProbabilities | null;
}

const TRUTH_COLOR = '#60a5fa';
const DARE_COLOR = '#f87171';
const STAR_COLORS = ['#a3a3a3', '#86efac', '#fcd34d', '#fb923c', '#f472b6'];

export const DrawProbabilityPanel: React.FC<DrawProbabilityPanelProps> = ({
  cardState,
  journeyPhase,
  availableCards,
  actorIndex,
  outfits,
  usedCardIds,
  levels,
  intimacyPercent,
  config,
  pendingDifficultyBoost,
  preferredType,
  snapshot,
}) => {
  const [expanded, setExpanded] = useState(false);

  const isPositionPhase = journeyPhase === 'position' || journeyPhase === 'final';
  const isCardActive = cardState !== 'deck';

  // Live probabilities when deck state, frozen snapshot otherwise
  let probs: JourneyDrawProbabilities | LuxuryDrawProbabilities | null = null;
  if (isCardActive) {
    probs = snapshot;
  } else if (!isPositionPhase) {
    try {
      probs = getJourneyDrawProbabilities({
        cards: availableCards,
        preferredType: preferredType ?? null,
        actorIndex,
        outfits,
        usedCardIds,
        levels,
        intimacyPercent,
        config,
        difficultyBoost: pendingDifficultyBoost,
      });
    } catch {}
  }

  if (!probs && !isPositionPhase) return null;

  const journeyProbs = !isPositionPhase ? (probs as JourneyDrawProbabilities | null) : null;
  const luxuryProbs = isPositionPhase ? (snapshot as LuxuryDrawProbabilities | null) : null;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.header}>
        <Text style={styles.headerText}>
          {isCardActive ? '📊 Xác suất lúc rút' : '📊 Xác suất rút'}
        </Text>
        <View style={styles.headerRight}>
          {isCardActive && <Text style={styles.frozenBadge}>đã đóng băng</Text>}
          {expanded ? (
            <ChevronUp size={14} color={COLORS.neutral400} />
          ) : (
            <ChevronDown size={14} color={COLORS.neutral400} />
          )}
        </View>
      </Pressable>

      {expanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.body}>
          {/* Truth / Dare row — standard phase only */}
          {journeyProbs && !isPositionPhase && (
            <View style={styles.typeRow}>
              <View style={styles.typeItem}>
                <Text style={[styles.typeLabel, { color: TRUTH_COLOR }]}>
                  💬 Sự thật
                </Text>
                <View style={[styles.miniBar, { backgroundColor: 'rgba(96,165,250,0.15)' }]}>
                  <View
                    style={[
                      styles.miniBarFill,
                      { width: `${journeyProbs.types.truth}%` as unknown as number, backgroundColor: TRUTH_COLOR },
                    ]}
                  />
                </View>
                <Text style={[styles.pct, { color: TRUTH_COLOR }]}>
                  {Math.round(journeyProbs.types.truth)}%
                </Text>
              </View>
              <View style={styles.typeItem}>
                <Text style={[styles.typeLabel, { color: DARE_COLOR }]}>
                  🔥 Thử thách
                </Text>
                <View style={[styles.miniBar, { backgroundColor: 'rgba(248,113,113,0.15)' }]}>
                  <View
                    style={[
                      styles.miniBarFill,
                      { width: `${journeyProbs.types.dare}%` as unknown as number, backgroundColor: DARE_COLOR },
                    ]}
                  />
                </View>
                <Text style={[styles.pct, { color: DARE_COLOR }]}>
                  {Math.round(journeyProbs.types.dare)}%
                </Text>
              </View>
            </View>
          )}

          {/* Star distribution */}
          {journeyProbs && (
            <View style={styles.starsGrid}>
              {([1, 2, 3, 4, 5] as const).map((star, idx) => {
                const pct = Math.round(journeyProbs.stars[star]);
                if (pct === 0) return null;
                return (
                  <View key={star} style={styles.starRow}>
                    <Text style={styles.starLabel}>{'⭐'.repeat(star)}</Text>
                    <View style={styles.starBar}>
                      <View
                        style={[
                          styles.starBarFill,
                          { width: `${pct}%` as unknown as number, backgroundColor: STAR_COLORS[idx] },
                        ]}
                      />
                    </View>
                    <Text style={[styles.pct, { color: STAR_COLORS[idx] }]}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Luxury star distribution */}
          {isPositionPhase && luxuryProbs && (
            <View style={styles.starsGrid}>
              {([1,2,3,4,5,6,7,8,9,10] as const).map((star) => {
                const pct = Math.round(luxuryProbs.stars[star] ?? 0);
                if (pct === 0) return null;
                return (
                  <View key={star} style={styles.starRow}>
                    <Text style={styles.starLabel}>✦{star}</Text>
                    <View style={styles.starBar}>
                      <View
                        style={[
                          styles.starBarFill,
                          { width: `${pct}%` as unknown as number, backgroundColor: '#c084fc' },
                        ]}
                      />
                    </View>
                    <Text style={[styles.pct, { color: '#c084fc' }]}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          )}

          {!probs && isPositionPhase && (
            <Text style={styles.noDataText}>Rút thẻ để xem phân phối</Text>
          )}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  headerText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: COLORS.neutral400,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  frozenBadge: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 9,
    color: COLORS.gold,
    opacity: 0.7,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeItem: {
    flex: 1,
    gap: 4,
  },
  typeLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
  },
  miniBar: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  starsGrid: {
    gap: 5,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starLabel: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 9,
    width: 50,
    color: '#fff',
  },
  starBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  starBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  pct: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    width: 30,
    textAlign: 'right',
  },
  noDataText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.neutral400,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
