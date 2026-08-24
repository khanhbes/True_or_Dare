/**
 * GameCard — React Native port of the web's GameCard component.
 * 5 visual variants: gentle, intimate, passionate, position, position-rare.
 * Prismatic border effect via Reanimated rotating gradient simulation.
 * Synced with web: getCardTurnAudience, pass_turn badge, timerSeconds null check.
 */
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Heart } from 'lucide-react-native';
import type { CardItem } from '@/shared/types';
import { LEVEL_INFO } from '@/shared/data/cards';
import {
  deriveDifficultyStars,
  derivePositionDifficultyStars,
  getCardTurnAudience,
  getCardDeck,
} from '@/shared/utils/progression';
import { COLORS, FONTS, FONT_SIZES } from '@/theme';

interface GameCardProps {
  card: CardItem;
  size?: 'sm' | 'md' | 'lg';
  showContent?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: (cardId: string) => void;
  onPress?: () => void;
}

const CORNER_SYMBOLS = ['♠', '♥', '♦', '♣'];

const CARD_BACKGROUNDS: Record<string, { colors: string[]; shadowColor: string }> = {
  gentle: {
    colors: ['#1a0810', '#0d0407', '#0a0305'],
    shadowColor: 'rgba(255, 107, 157, 0.15)',
  },
  intimate: {
    colors: ['#2d1854', '#1e1045', '#150a35'],
    shadowColor: 'rgba(130, 80, 220, 0.15)',
  },
  passionate: {
    colors: ['#3d2a0a', '#2a1d08', '#1f1606'],
    shadowColor: 'rgba(212, 175, 55, 0.15)',
  },
  position: {
    colors: ['#111d37', '#070b18', '#03050c'],
    shadowColor: 'rgba(226, 194, 117, 0.12)',
  },
  'position-rare': {
    colors: ['#35124b', '#120717', '#050507'],
    shadowColor: 'rgba(244, 232, 255, 0.16)',
  },
};

const BORDER_COLORS: Record<string, string> = {
  gentle: '#FF6B9D',
  intimate: '#60a5fa',
  passionate: '#D4AF37',
  position: '#e2c275',
  'position-rare': '#f4e8ff',
};

const SIZE_CONFIG = {
  sm: { padding: 10, minHeight: 130, iconSize: 30, contentSize: 11, badgeSize: 8, timerSize: 10 },
  md: { padding: 12, minHeight: 180, iconSize: 42, contentSize: 12, badgeSize: 9, timerSize: 10 },
  lg: { padding: 16, minHeight: 240, iconSize: 48, contentSize: 15, badgeSize: 11, timerSize: 12 },
};

export const GameCard: React.FC<GameCardProps> = ({
  card,
  size = 'md',
  showContent = true,
  isFavorited = false,
  onToggleFavorite,
  onPress,
}) => {
  const levelInfo = LEVEL_INFO[card.level];
  const deck = getCardDeck(card);
  const isPosition = deck === 'position';
  const isRarePosition = isPosition && card.position?.rarity === 'mythic';
  const levelKey = isRarePosition ? 'position-rare' : isPosition ? 'position' : card.level;
  const bg = CARD_BACKGROUNDS[levelKey] ?? CARD_BACKGROUNDS.gentle;
  const borderColor = BORDER_COLORS[levelKey] ?? BORDER_COLORS.gentle;
  const s = SIZE_CONFIG[size];
  const isIntimateOrPassionate = !isPosition && (card.level === 'intimate' || card.level === 'passionate');

  const textScale = Math.min(1.5, Math.max(0.75, card.appearance?.textScale ?? 1));

  const isPassTurn = card.gameplayEffect?.kind === 'pass_turn';

  // Audience label: use getCardTurnAudience (not deprecated getCardAudience)
  const turnAudience = getCardTurnAudience(card);
  const audienceLabel = isPosition
    ? ({ male: 'Nam thực hiện', female: 'Nữ thực hiện', both: 'Cả hai' } as const)[
        (card.position?.turnAudience ?? card.position?.recipient ?? turnAudience) as 'male' | 'female' | 'both'
      ]
    : ({ male: 'Nam', female: 'Nữ', both: 'Cả hai' } as const)[turnAudience];

  const familyLabel = card.position
    ? card.position.family === 'other'
      ? (card.position.customLabel?.trim() || 'TƯ THẾ KHÁC').toUpperCase()
      : ({ oral: 'ORAL SEX', blowjob: 'BLOW', handjob: 'HAND', have_sex: 'HAVE SEX' } as const)[card.position.family]
    : null;

  // Prismatic border glow animation
  const borderOpacity = useSharedValue(0.78);
  useEffect(() => {
    borderOpacity.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const borderAnimStyle = useAnimatedStyle(() => ({
    borderColor: borderColor,
    opacity: borderOpacity.value,
  }));

  const cardContent = (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: bg.colors[1],
          padding: s.padding,
          minHeight: s.minHeight,
          shadowColor: bg.shadowColor,
        },
        borderAnimStyle,
      ]}
    >
      {/* Corner decorations */}
      {isIntimateOrPassionate && (
        <>
          <Text style={[styles.cornerDeco, { top: 8, left: 10 }]}>{CORNER_SYMBOLS[0]} {CORNER_SYMBOLS[1]}</Text>
          <Text style={[styles.cornerDeco, { top: 8, right: 10 }]}>{CORNER_SYMBOLS[2]} {CORNER_SYMBOLS[3]}</Text>
          <Text style={[styles.cornerDeco, { bottom: 8, left: 10 }]}>{CORNER_SYMBOLS[1]} {CORNER_SYMBOLS[0]}</Text>
          <Text style={[styles.cornerDeco, { bottom: 8, right: 10 }]}>{CORNER_SYMBOLS[3]} {CORNER_SYMBOLS[2]}</Text>
        </>
      )}

      {/* Top badges */}
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          {isPassTurn ? (
            <View style={[styles.badge, { borderColor: 'rgba(148, 163, 184, 0.4)', backgroundColor: 'rgba(71, 85, 105, 0.4)' }]}>
              <Text style={[styles.badgeText, { color: '#cbd5e1', fontSize: s.badgeSize * textScale, fontFamily: FONTS.bodyBold }]}>
                ⏭ CHUYỂN LƯỢT
              </Text>
            </View>
          ) : isPosition ? (
            <View style={[styles.badge, { borderColor: 'rgba(226, 194, 117, 0.45)', backgroundColor: 'rgba(226, 194, 117, 0.1)' }]}>
              <Text style={[styles.badgeText, { color: '#f7e7b0', fontSize: s.badgeSize * textScale, fontFamily: FONTS.bodyBold }]}>
                ✦ {familyLabel}
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.badge, card.type === 'truth'
                ? { borderColor: 'rgba(59, 130, 246, 0.4)', backgroundColor: 'rgba(23, 37, 84, 0.8)' }
                : { borderColor: 'rgba(244, 63, 94, 0.4)', backgroundColor: 'rgba(76, 5, 25, 0.8)' }
              ]}>
                <Text style={[styles.badgeText, {
                  color: card.type === 'truth' ? '#93c5fd' : '#fda4af',
                  fontSize: s.badgeSize * textScale,
                  fontFamily: FONTS.bodySemiBold,
                }]}>
                  {card.type === 'truth' ? 'SỰ THẬT' : 'THỬ THÁCH'}
                </Text>
              </View>
              <View style={[styles.badge, { borderColor: levelInfo.color + '66', backgroundColor: levelInfo.color + '1a' }]}>
                <Text style={[styles.badgeText, { color: levelInfo.color, fontSize: s.badgeSize * textScale }]}>
                  {levelInfo.icon} {levelInfo.name}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Favorite button */}
        {onToggleFavorite && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleFavorite(card.id);
            }}
            hitSlop={8}
            style={styles.favoriteButton}
          >
            <Heart
              size={16}
              color={isFavorited ? COLORS.rose : COLORS.neutral500}
              fill={isFavorited ? COLORS.rose : 'transparent'}
            />
          </Pressable>
        )}
      </View>

      {/* Center: Content */}
      <View style={styles.centerContent}>
        {showContent && (
          <Text
            style={[
              styles.contentText,
              {
                fontSize: s.contentSize * textScale,
                fontFamily: FONTS.bodyMedium,
                lineHeight: s.contentSize * textScale * 1.625,
              },
            ]}
          >
            {card.content}
          </Text>
        )}

        {showContent && card.hint && (
          <Text style={[styles.hintText, { fontSize: s.badgeSize * textScale }]}>
            💡 {card.hint}
          </Text>
        )}
      </View>

      {/* Bottom: Stars, audience, timer */}
      <View style={styles.bottomRow}>
        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <Text style={[styles.metaBadgeText, { color: '#fde68a', fontSize: 9 * textScale }]}>
              {isPosition ? derivePositionDifficultyStars(card) : deriveDifficultyStars(card)}★
            </Text>
          </View>
          <View style={[styles.metaBadge, { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.035)' }]}>
            <Text style={[styles.metaBadgeText, { color: COLORS.neutral400, fontSize: 9 * textScale }]}>
              {audienceLabel}
            </Text>
          </View>
        </View>
        {/* Only show timer if timerSeconds is not null and not undefined and card is pass_turn=false */}
        {!isPassTurn && card.timerSeconds != null && card.timerSeconds !== undefined && showContent && (
          <Text style={[styles.timerText, { fontSize: s.timerSize * textScale }]}>
            ⏱ {card.timerSeconds}s
          </Text>
        )}
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 9,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentText: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    maxWidth: '95%' as unknown as number,
  },
  hintText: {
    color: 'rgba(255, 107, 157, 0.7)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  bottomRow: {
    marginTop: 'auto' as unknown as number,
    paddingTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.2)',
    backgroundColor: 'rgba(253, 230, 138, 0.06)',
  },
  metaBadgeText: {
    fontFamily: 'BeVietnamPro_400Regular',
  },
  timerText: {
    color: 'rgba(252, 211, 77, 0.6)',
    textAlign: 'center',
    fontFamily: 'BeVietnamPro_400Regular',
  },
  cornerDeco: {
    position: 'absolute',
    fontSize: 10,
    color: 'rgba(180, 120, 255, 0.35)',
    zIndex: 3,
    fontFamily: 'BeVietnamPro_400Regular',
  },
});
