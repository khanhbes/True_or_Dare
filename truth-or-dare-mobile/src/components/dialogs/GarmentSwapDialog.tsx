/**
 * GarmentSwapDialog — Dialog to swap removable garments between players.
 */
import React, { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from 'react-native';
import { ArrowLeftRight, Check, Lock, X } from 'lucide-react-native';
import type { GarmentSlot, OutfitState } from '@/shared/types';
import {
  GARMENT_LABELS,
  getPresentGarmentSlots,
  getRemovableGarmentSlots,
  swapGarments,
} from '@/shared/utils/wardrobe';
import { OutfitFigure } from '../OutfitFigure';
import { COLORS, FONTS, FONT_SIZES } from '@/theme';

interface GarmentSwapDialogProps {
  visible: boolean;
  playerNames: [string, string];
  outfitStates: [OutfitState, OutfitState];
  onConfirm: (firstSlot: GarmentSlot, secondSlot: GarmentSlot) => void;
  onCancel: () => void;
}

export const GarmentSwapDialog: React.FC<GarmentSwapDialogProps> = ({
  visible,
  playerNames,
  outfitStates,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  const [selected, setSelected] = useState<[GarmentSlot | null, GarmentSlot | null]>([
    null,
    null,
  ]);

  const eligible = [
    getRemovableGarmentSlots(outfitStates[0]),
    getRemovableGarmentSlots(outfitStates[1]),
  ] as const;

  const preview =
    selected[0] && selected[1]
      ? swapGarments(outfitStates, selected[0], selected[1])
      : null;

  const canSwap = selected[0] !== null && selected[1] !== null;

  const setSlot = (playerIndex: 0 | 1, slot: GarmentSlot) => {
    setSelected((prev) =>
      playerIndex === 0 ? [slot, prev[1]] : [prev[0], slot],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialogCard}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ArrowLeftRight size={16} color={COLORS.rose} />
                <Text style={styles.title}>Đổi Đồ Cho Nhau</Text>
              </View>
              <Text style={styles.subtitle}>Mỗi người chọn 1 món đồ để hoán đổi</Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color={COLORS.neutral400} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 380 }}>
            {([0, 1] as const).map((idx) => {
              const present = getPresentGarmentSlots(outfitStates[idx]);
              const elig = eligible[idx];
              const sel = selected[idx];

              return (
                <View key={idx} style={styles.playerSection}>
                  <Text style={styles.playerName}>{playerNames[idx]}</Text>
                  <View style={styles.playerContent}>
                    <OutfitFigure
                      outfit={
                        preview ? preview.outfits[idx].initial : outfitStates[idx].initial
                      }
                      state={preview ? preview.outfits[idx] : outfitStates[idx]}
                      compact
                      width={80}
                      height={150}
                    />
                    <View style={styles.slotsList}>
                      {present.map((slot) => {
                        const isEligible = elig.includes(slot);
                        const isSelected = sel === slot;
                        return (
                          <Pressable
                            key={slot}
                            disabled={!isEligible}
                            onPress={() => setSlot(idx, slot)}
                            style={[
                              styles.slotBtn,
                              isSelected && styles.slotBtnSelected,
                              !isEligible && styles.slotBtnDisabled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.slotBtnText,
                                isSelected && { color: '#ffe4e6' },
                                !isEligible && { color: COLORS.neutral500 },
                              ]}
                            >
                              {GARMENT_LABELS[slot]}
                            </Text>
                            {isSelected ? (
                              <Check size={14} color={COLORS.rose} />
                            ) : !isEligible ? (
                              <Lock size={12} color={COLORS.neutral500} />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              disabled={!canSwap}
              onPress={() => {
                if (selected[0] && selected[1]) {
                  onConfirm(selected[0], selected[1]);
                }
              }}
              style={[styles.confirmBtn, !canSwap && styles.btnDisabled]}
            >
              <Text style={styles.confirmBtnText}>Hoán Đổi Đồ</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Hủy</Text>
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
    maxWidth: 440,
    backgroundColor: '#190a12',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    borderRadius: 20,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontFamily: FONTS.serifBold,
    fontSize: FONT_SIZES.lg,
    color: '#fff',
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
  playerSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  playerName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: COLORS.gold,
    marginBottom: 6,
  },
  playerContent: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  slotsList: {
    flex: 1,
    gap: 6,
  },
  slotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  slotBtnSelected: {
    borderColor: 'rgba(255, 107, 157, 0.8)',
    backgroundColor: 'rgba(244, 63, 94, 0.18)',
  },
  slotBtnDisabled: {
    opacity: 0.4,
  },
  slotBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: '#fff',
  },
  actions: {
    gap: 8,
    marginTop: 10,
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
});
