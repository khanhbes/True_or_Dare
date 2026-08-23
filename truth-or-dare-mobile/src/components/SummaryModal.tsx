/**
 * SummaryModal — Game end / session summary modal.
 * Shows intimacy score, completed/skipped counts, outfit stats,
 * and restart / home actions.
 * Synced with PLAN.md: positionSessionStats, end reason display.
 */
import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Trophy, Heart, RotateCcw, Home, Sparkles, Sword } from 'lucide-react-native';
import type { ClothingRemovalEvent, GameEndReason, JourneyPhase, OutfitState, Player, PositionSessionStats } from '@/shared/types';
import { getPresentGarmentSlots } from '@/shared/utils/wardrobe';
import { COLORS, FONTS, FONT_SIZES } from '@/theme';

export interface SummaryModalProps {
  visible: boolean;
  player1: Player;
  player2: Player;
  totalRounds: number;
  favoritesCount: number;
  outfitStates?: [OutfitState, OutfitState];
  removalEvents?: ClothingRemovalEvent[];
  intimacyPercent?: number;
  journeyPhase?: JourneyPhase;
  positionSessionStats?: PositionSessionStats;
  onRestart: () => void;
  onClose: () => void;
  onHome?: () => void;
  endReason?: GameEndReason | null;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  visible,
  player1,
  player2,
  totalRounds,
  favoritesCount,
  outfitStates,
  intimacyPercent = 0,
  positionSessionStats,
  onRestart,
  onClose,
  onHome,
  endReason,
}) => {
  if (!visible) return null;

  const totalCompleted = player1.completedCount + player2.completedCount;
  const totalSkipped = player1.skippedCount + player2.skippedCount;

  // End reason display config
  const isHaveSex = endReason === 'have_sex';
  const isPinkComplete = endReason === 'pink_complete';

  let intimacyBadge = 'Gắn Kết Nhẹ Nhàng 🌸';
  let badgeColor: string = COLORS.rose;
  if (isHaveSex) {
    intimacyBadge = '🏆 Đã đạt đến Have Sex!';
    badgeColor = COLORS.gold;
  } else if (isPinkComplete) {
    intimacyBadge = '🎀 Hoàn thành hành trình Tim hồng!';
    badgeColor = '#f472b6';
  } else if (intimacyPercent > 75) {
    intimacyBadge = 'Bùng Nổ Nồng Nhiệt 💋';
    badgeColor = '#ef4444';
  } else if (intimacyPercent > 40) {
    intimacyBadge = 'Thân Mật Đắm Say 🔥';
    badgeColor = COLORS.gold;
  }

  const p1GarmentsLeft = outfitStates ? getPresentGarmentSlots(outfitStates[0]).length : null;
  const p2GarmentsLeft = outfitStates ? getPresentGarmentSlots(outfitStates[1]).length : null;

  const hasPositionStats = positionSessionStats && positionSessionStats.drawn > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.trophyCircle, isHaveSex && { backgroundColor: 'rgba(212, 175, 55, 0.2)', borderWidth: 2, borderColor: COLORS.gold }]}>
              <Trophy size={32} color={COLORS.gold} />
            </View>
            <Text style={styles.title}>Tổng Kết Ván Chơi</Text>
            <View style={[styles.badge, { borderColor: badgeColor }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{intimacyBadge}</Text>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 340 }}>
            {/* Intimacy Score Circle/Card */}
            <View style={styles.scoreBox}>
              <Text style={styles.scoreNumber}>{Math.round(intimacyPercent)}%</Text>
              <Text style={styles.scoreLabel}>Chỉ Số Thân Mật Đạt Được</Text>
            </View>

            {/* Overall Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{totalRounds}</Text>
                <Text style={styles.statLbl}>Tổng số lượt</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: '#34d399' }]}>{totalCompleted}</Text>
                <Text style={styles.statLbl}>Đã hoàn thành</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: '#f87171' }]}>{totalSkipped}</Text>
                <Text style={styles.statLbl}>Đã bỏ qua</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: COLORS.rose }]}>{favoritesCount}</Text>
                <Text style={styles.statLbl}>Yêu thích</Text>
              </View>
            </View>

            {/* Position Stats (shown if any position cards were drawn) */}
            {hasPositionStats && (
              <View style={styles.positionStatsBox}>
                <Text style={styles.positionStatsTitle}>✦ Thống kê Tư thế</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: '#c4b5fd' }]}>{positionSessionStats!.drawn}</Text>
                    <Text style={styles.statLbl}>Đã rút</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: '#a78bfa' }]}>{positionSessionStats!.opened}</Text>
                    <Text style={styles.statLbl}>Đã mở</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: '#34d399' }]}>{positionSessionStats!.completed}</Text>
                    <Text style={styles.statLbl}>Hoàn thành</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: '#f87171' }]}>{positionSessionStats!.skipped}</Text>
                    <Text style={styles.statLbl}>Bỏ qua</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Per-Player Comparison */}
            <View style={styles.playersContainer}>
              <View style={styles.playerCard}>
                <Text style={styles.playerAvatar}>{player1.avatar}</Text>
                <Text style={styles.playerName} numberOfLines={1}>
                  {player1.name}
                </Text>
                <Text style={styles.playerSub}>
                  {player1.completedCount}✓ · {player1.skippedCount}✗
                </Text>
                {p1GarmentsLeft !== null && (
                  <Text style={styles.playerWardrobe}>Còn {p1GarmentsLeft} món đồ</Text>
                )}
              </View>

              <View style={styles.playerCard}>
                <Text style={styles.playerAvatar}>{player2.avatar}</Text>
                <Text style={styles.playerName} numberOfLines={1}>
                  {player2.name}
                </Text>
                <Text style={styles.playerSub}>
                  {player2.completedCount}✓ · {player2.skippedCount}✗
                </Text>
                {p2GarmentsLeft !== null && (
                  <Text style={styles.playerWardrobe}>Còn {p2GarmentsLeft} món đồ</Text>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable
              onPress={onRestart}
              style={({ pressed }) => [
                styles.primaryBtn,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <RotateCcw size={16} color="#171717" />
              <Text style={styles.primaryBtnText}>Chơi Ván Mới</Text>
            </Pressable>

            {onHome && (
              <Pressable
                onPress={onHome}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  { transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <Home size={16} color="#fff" />
                <Text style={styles.secondaryBtnText}>Về Trang Chủ</Text>
              </Pressable>
            )}

            <Pressable onPress={onClose} style={styles.closeTextBtn}>
              <Text style={styles.closeText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#190a12',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    borderRadius: 24,
    padding: 20,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 15,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  trophyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.serifBold,
    fontSize: FONT_SIZES['2xl'],
    color: COLORS.gold,
  },
  badge: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  badgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
  },
  scoreBox: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    marginBottom: 14,
  },
  scoreNumber: {
    fontFamily: FONTS.serifBold,
    fontSize: 36,
    color: '#fff',
  },
  scoreLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: '#fda4af',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  positionStatsBox: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  positionStatsTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: '#c4b5fd',
    marginBottom: 8,
    textAlign: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statVal: {
    fontFamily: FONTS.serifBold,
    fontSize: 18,
    color: '#fff',
  },
  statLbl: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 9,
    color: COLORS.neutral400,
    marginTop: 2,
    textAlign: 'center',
  },
  playersContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  playerCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  playerAvatar: {
    fontSize: 24,
    marginBottom: 4,
  },
  playerName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#fff',
  },
  playerSub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.neutral300,
    marginTop: 2,
  },
  playerWardrobe: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 10,
    color: '#fda4af',
    marginTop: 4,
  },
  actions: {
    gap: 8,
    marginTop: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.goldGradientMid,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#171717',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: '#fff',
  },
  closeTextBtn: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  closeText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.neutral400,
  },
});
