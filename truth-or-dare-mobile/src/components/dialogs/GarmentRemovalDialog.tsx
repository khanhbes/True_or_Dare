/**
 * GarmentRemovalDialog — Dialog to select a garment slot to remove,
 * featuring interactive slot choices and OutfitFigure preview.
 */
import React, { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Check, Lock, X, AlertCircle } from 'lucide-react-native';
import type { GarmentSlot, OutfitState } from '@/shared/types';
import {
  GARMENT_LABELS,
  getPresentGarmentSlots,
  getRemovableGarmentSlots,
} from '@/shared/utils/wardrobe';
import { OutfitFigure } from '../OutfitFigure';
import { COLORS, FONTS, FONT_SIZES } from '@/theme';

export interface GarmentRemovalDialogProps {
  visible: boolean;
  targetName: string;
  outfitState: OutfitState;
  source: 'card' | 'penalty' | 'preparation';
  preparationProgress?: { current: number; total: number };
  onConfirm: (slot: GarmentSlot) => void;
  onCancel: () => void;
  onContinueWithoutRemoval?: () => void;
}

export const GarmentRemovalDialog: React.FC<GarmentRemovalDialogProps> = ({
  visible,
  targetName,
  outfitState,
  source,
  onConfirm,
  onCancel,
  onContinueWithoutRemoval,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<GarmentSlot | null>(null);

  if (!visible) return null;

  const eligibleSlots = getRemovableGarmentSlots(outfitState);
  const presentSlots = getPresentGarmentSlots(outfitState);
  const hasEligibleGarment = eligibleSlots.length > 0;
  const isPreparation = source === 'preparation';
  const sourceLabel = isPreparation ? 'Chuẩn bị Tư thế' : source === 'card' ? 'Thẻ bài' : 'Luật phạt';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialogCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceTag}>{sourceLabel.toUpperCase()}</Text>
              <Text style={styles.title}>Chọn Món Đồ Cần Bỏ</Text>
              <Text style={styles.subtitle}>Người thực hiện: {targetName}</Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color={COLORS.neutral400} />
            </Pressable>
          </View>

          {/* Outfit Figure Preview + Slot list */}
          <View style={styles.bodyRow}>
            {/* Figure */}
            <View style={styles.figureBox}>
              <OutfitFigure
                outfit={outfitState.initial}
                state={outfitState}
                previewRemovedSlot={selectedSlot}
                compact
                width={100}
                height={190}
              />
            </View>

            {/* Slots selection */}
            <ScrollView style={styles.slotsContainer}>
              {presentSlots.map((slot) => {
                const isRemovable = eligibleSlots.includes(slot);
                const isSelected = selectedSlot === slot;

                return (
                  <Pressable
                    key={slot}
                    disabled={!isRemovable}
                    onPress={() => setSelectedSlot(slot)}
                    style={[
                      styles.slotItem,
                      isSelected && styles.slotItemSelected,
                      !isRemovable && styles.slotItemDisabled,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.slotLabel,
                          isSelected && { color: '#ffe4e6' },
                          !isRemovable && { color: COLORS.neutral500 },
                        ]}
                      >
                        {GARMENT_LABELS[slot]}
                      </Text>
                      {!isRemovable && (
                        <Text style={styles.slotLockedText}>Cần cởi lớp ngoài trước</Text>
                      )}
                    </View>

                    {isSelected ? (
                      <Check size={16} color={COLORS.rose} />
                    ) : !isRemovable ? (
                      <Lock size={14} color={COLORS.neutral500} />
                    ) : null}
                  </Pressable>
                );
              })}

              {!hasEligibleGarment && (
                <View style={styles.noGarmentBox}>
                  <AlertCircle size={16} color="#fcd34d" />
                  <Text style={styles.noGarmentText}>Không còn món đồ nào có thể bỏ.</Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {hasEligibleGarment && (
              <Pressable
                disabled={!selectedSlot}
                onPress={() => {
                  if (selectedSlot) onConfirm(selectedSlot);
                }}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  !selectedSlot && styles.btnDisabled,
                  { transform: [{ scale: pressed && selectedSlot ? 0.98 : 1 }] },
                ]}
              >
                <Text style={styles.confirmBtnText}>Xác Nhận Bỏ Đồ</Text>
              </Pressable>
            )}

            {onContinueWithoutRemoval && (
              <Pressable onPress={onContinueWithoutRemoval} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Tiếp Tục Không Cởi Đồ</Text>
              </Pressable>
            )}

            <Pressable onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Đóng</Text>
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
  dialogCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#190a12',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    borderRadius: 20,
    padding: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sourceTag: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  title: {
    fontFamily: FONTS.serifBold,
    fontSize: FONT_SIZES.lg,
    color: '#fff',
    marginTop: 2,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: '#fda4af',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bodyRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  figureBox: {
    width: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 6,
  },
  slotsContainer: {
    flex: 1,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    marginBottom: 8,
  },
  slotItemSelected: {
    borderColor: 'rgba(255, 107, 157, 0.8)',
    backgroundColor: 'rgba(244, 63, 94, 0.18)',
  },
  slotItemDisabled: {
    opacity: 0.45,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  slotLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: '#fff',
  },
  slotLockedText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 10,
    color: COLORS.neutral400,
    marginTop: 2,
  },
  noGarmentBox: {
    flexDirection: 'row',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
  },
  noGarmentText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: '#fcd34d',
    flex: 1,
  },
  actions: {
    gap: 8,
    marginTop: 8,
  },
  confirmBtn: {
    backgroundColor: COLORS.goldGradientMid,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#171717',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: '#fff',
  },
  cancelBtn: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.neutral400,
  },
});
