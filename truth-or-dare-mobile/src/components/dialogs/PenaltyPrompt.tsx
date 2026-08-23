/**
 * PenaltyPrompt — Modal displayed when a player skips a card.
 * Gives options to apply clothing penalty or continue without penalty.
 */
import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { ArrowLeft, ChevronRight, Layers3, ShieldCheck, X } from 'lucide-react-native';
import type { CardType } from '@/shared/types';
import { COLORS, FONTS, FONT_SIZES } from '@/theme';

interface PenaltyPromptProps {
  visible: boolean;
  playerName: string;
  playerAvatar: string;
  cardType: CardType;
  penaltyEnabled: boolean;
  canRemoveGarment: boolean;
  onReturn: () => void;
  onChooseGarment: () => void;
  onContinueWithoutPenalty: () => void;
}

export const PenaltyPrompt: React.FC<PenaltyPromptProps> = ({
  visible,
  playerName,
  playerAvatar,
  cardType,
  penaltyEnabled,
  canRemoveGarment,
  onReturn,
  onChooseGarment,
  onContinueWithoutPenalty,
}) => {
  if (!visible) return null;

  const reason =
    cardType === 'truth'
      ? 'Nếu cả hai xác nhận câu trả lời là chưa đạt hoặc không muốn trả lời, có thể áp dụng luật phạt đã thống nhất.'
      : 'Nếu thử thách chưa được thực hiện, có thể áp dụng luật phạt đã thống nhất.';

  const canChooseGarment = penaltyEnabled && canRemoveGarment;
  const statusCopy = !penaltyEnabled
    ? 'Luật phạt cởi đồ đang tắt trong thiết lập. Lượt này sẽ chỉ được ghi nhận là bỏ qua.'
    : !canRemoveGarment
    ? `${playerName} không còn món đồ nào có thể bỏ. Hai bạn có thể thống nhất phương án khác hoặc tiếp tục.`
    : `${playerName} có thể chọn một món đồ đang được phép bỏ. Bạn vẫn có thể không áp dụng luật phạt.`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onReturn}>
      <View style={styles.backdrop}>
        <View style={styles.dialogCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Xác Nhận Bỏ Lượt</Text>
              <Text style={styles.subtitle}>
                {playerAvatar} {playerName} · {cardType === 'truth' ? 'Sự Thật' : 'Thử Thách'}
              </Text>
            </View>
            <Pressable onPress={onReturn} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color={COLORS.neutral400} />
            </Pressable>
          </View>

          {/* Body */}
          <Text style={styles.reasonText}>{reason}</Text>
          <View style={styles.statusBox}>
            <ShieldCheck size={16} color={COLORS.rose} style={{ marginTop: 2 }} />
            <Text style={styles.statusText}>{statusCopy}</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            {canChooseGarment && (
              <Pressable
                onPress={onChooseGarment}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <Layers3 size={18} color="#171717" />
                <Text style={styles.primaryBtnText}>Cởi 1 Món Đồ Phạt</Text>
                <ChevronRight size={16} color="#171717" />
              </Pressable>
            )}

            <Pressable
              onPress={onContinueWithoutPenalty}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <Text style={styles.secondaryBtnText}>
                {canChooseGarment ? 'Bỏ Lượt Không Phạt' : 'Tiếp Tục'}
              </Text>
            </Pressable>

            <Pressable onPress={onReturn} style={styles.returnBtn}>
              <ArrowLeft size={14} color={COLORS.neutral400} />
              <Text style={styles.returnBtnText}>Quay Lại Thẻ Bài</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1c0a12',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.rose,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontFamily: FONTS.serifBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.gold,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: FONT_SIZES.sm,
    color: '#fda4af',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  reasonText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.neutral300,
    lineHeight: 18,
    marginBottom: 12,
  },
  statusBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  statusText: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.neutral300,
    lineHeight: 16,
  },
  actions: {
    gap: 8,
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
    fontSize: FONT_SIZES.sm,
    color: '#171717',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: FONT_SIZES.sm,
    color: '#fff',
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  returnBtnText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.neutral400,
  },
});
