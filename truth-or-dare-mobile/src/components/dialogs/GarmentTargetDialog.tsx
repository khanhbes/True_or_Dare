import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import type { OutfitState, Player } from '@/shared/types';
import { getRemovableGarments } from '@/shared/utils/wardrobe';
import { COLORS, FONTS } from '@/theme';

interface GarmentTargetDialogProps {
  visible: boolean;
  players: readonly [Player, Player];
  outfits: readonly [OutfitState, OutfitState];
  onSelect: (targetIndex: 0 | 1) => void;
  onCancel: () => void;
}

/** Lets the couple decide who a `choice` clothing card affects. */
export const GarmentTargetDialog: React.FC<GarmentTargetDialogProps> = ({
  visible,
  players,
  outfits,
  onSelect,
  onCancel,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable onPress={onCancel} hitSlop={10} style={styles.closeButton}>
            <X size={18} color={COLORS.neutral400} />
          </Pressable>
          <Text style={styles.eyebrow}>CÙNG QUYẾT ĐỊNH</Text>
          <Text style={styles.title}>Ai muốn cởi một món?</Text>
          <Text style={styles.description}>Chỉ những người còn món đồ có thể tháo mới được chọn.</Text>

          <View style={styles.options}>
            {([0, 1] as const).map((index) => {
              const canRemove = getRemovableGarments(outfits[index]).length > 0;
              const player = players[index];
              return (
                <Pressable
                  key={index}
                  disabled={!canRemove}
                  onPress={() => onSelect(index)}
                  style={[styles.option, !canRemove && styles.optionDisabled]}
                >
                  <Text style={styles.avatar}>{player.avatar}</Text>
                  <View style={styles.optionText}>
                    <Text style={styles.name}>{player.name}</Text>
                    <Text style={styles.status}>{canRemove ? 'Có thể chọn một món' : 'Không còn món phù hợp'}</Text>
                  </View>
                  {canRemove && <Check size={18} color={COLORS.rose} />}
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Không cởi đồ</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(0, 0, 0, 0.82)' },
  card: { width: '100%', maxWidth: 520, borderRadius: 18, padding: 18, backgroundColor: '#190a12', borderWidth: 1, borderColor: 'rgba(255, 107, 157, 0.3)' },
  closeButton: { position: 'absolute', top: 10, right: 10, padding: 6, zIndex: 1 },
  eyebrow: { color: COLORS.gold, fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 1.2 },
  title: { color: '#fff', fontFamily: FONTS.serifBold, fontSize: 22, marginTop: 4 },
  description: { color: COLORS.neutral400, fontFamily: FONTS.bodyRegular, fontSize: 12, marginTop: 4 },
  options: { flexDirection: 'row', gap: 10, marginTop: 16 },
  option: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)' },
  optionDisabled: { opacity: 0.42 },
  avatar: { fontSize: 22 },
  optionText: { flex: 1, minWidth: 0 },
  name: { color: '#fff', fontFamily: FONTS.bodyBold, fontSize: 13 },
  status: { color: COLORS.neutral400, fontFamily: FONTS.bodyRegular, fontSize: 10, marginTop: 2 },
  cancelButton: { alignSelf: 'center', paddingHorizontal: 16, paddingTop: 14 },
  cancelText: { color: COLORS.neutral400, fontFamily: FONTS.bodyMedium, fontSize: 12 },
});
