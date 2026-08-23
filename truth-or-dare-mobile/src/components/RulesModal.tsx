/**
 * RulesModal — Explains game rules, consent guidelines, outfit penalties, and levels.
 */
import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import {
  ShieldCheck,
  Heart,
  Layers3,
  CheckCircle2,
  AlertTriangle,
  X,
  Flame,
} from 'lucide-react-native';
import { COLORS, FONTS, FONT_SIZES } from '@/theme';

interface RulesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ visible, onClose }) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Luật Chơi & Hướng Dẫn</Text>
              <Text style={styles.subtitle}>Dành riêng cho 2 người · Tôn trọng & Đồng thuận</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color={COLORS.neutral400} />
            </Pressable>
          </View>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {/* Rule 1: Consent */}
            <View style={styles.ruleSection}>
              <View style={styles.ruleTitleRow}>
                <ShieldCheck size={18} color="#34d399" />
                <Text style={styles.ruleTitle}>1. Nguyên Tắc Đồng Thuận</Text>
              </View>
              <Text style={styles.ruleBody}>
                Cả hai người chơi đều có quyền dừng trò chơi hoặc từ chối bất kỳ câu hỏi/thử thách
                nào mà không cảm thấy bị ép buộc. Sự thoải mái và an toàn cảm xúc của đối phương luôn là ưu tiên cao nhất.
              </Text>
            </View>

            {/* Rule 2: Levels */}
            <View style={styles.ruleSection}>
              <View style={styles.ruleTitleRow}>
                <Heart size={18} color={COLORS.rose} />
                <Text style={styles.ruleTitle}>2. Ba Cấp Độ Trò Chơi</Text>
              </View>
              <View style={styles.levelItem}>
                <Text style={styles.levelBadge}>🌸 Nhẹ nhàng</Text>
                <Text style={styles.levelText}>Khởi động nhẹ nhàng, kỷ niệm ngọt ngào và thử thách dễ thương.</Text>
              </View>
              <View style={styles.levelItem}>
                <Text style={styles.levelBadge}>🔥 Thân mật</Text>
                <Text style={styles.levelText}>Gắn kết cảm xúc sâu sắc, cử chỉ tình cảm và tán tỉnh tinh tế.</Text>
              </View>
              <View style={styles.levelItem}>
                <Text style={styles.levelBadge}>💋 Nồng nhiệt</Text>
                <Text style={styles.levelText}>Quyến rũ, nồng nàn và thân mật đặc biệt dành cho hai người.</Text>
              </View>
            </View>

            {/* Rule 3: Clothing Penalty */}
            <View style={styles.ruleSection}>
              <View style={styles.ruleTitleRow}>
                <Layers3 size={18} color={COLORS.gold} />
                <Text style={styles.ruleTitle}>3. Luật Phạt Trang Phục</Text>
              </View>
              <Text style={styles.ruleBody}>
                Nếu một người chơi chọn "Bỏ qua" thử thách hoặc không muốn trả lời sự thật, họ có thể chọn cởi 1 món đồ đang mặc (nếu tính năng phạt đang bật trong thiết lập).
              </Text>
            </View>

            {/* Rule 4: Timer & Privacy */}
            <View style={styles.ruleSection}>
              <View style={styles.ruleTitleRow}>
                <CheckCircle2 size={18} color="#60a5fa" />
                <Text style={styles.ruleTitle}>4. Đồng Hồ & Che Nội Dung</Text>
              </View>
              <Text style={styles.ruleBody}>
                Mỗi thẻ có thể có thời gian đếm ngược riêng. Chế độ riêng tư giúp che nội dung lá bài để người rút xem trước trước khi đọc cho đối phương nghe.
              </Text>
            </View>
          </ScrollView>

          <Pressable onPress={onClose} style={styles.confirmBtn}>
            <Text style={styles.confirmBtnText}>Đã Hiểu & Tiếp Tục</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: '#190a12',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontFamily: FONTS.serifBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.gold,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: '#fda4af',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  contentScroll: {
    marginBottom: 16,
  },
  ruleSection: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  ruleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  ruleTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#fff',
  },
  ruleBody: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.neutral300,
    lineHeight: 18,
  },
  levelItem: {
    marginTop: 6,
  },
  levelBadge: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.gold,
  },
  levelText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.neutral400,
    marginTop: 1,
  },
  confirmBtn: {
    backgroundColor: COLORS.goldGradientMid,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#171717',
  },
});
