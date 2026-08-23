/**
 * SetupScreen — Game setup: player names, avatar picker, level selection,
 * timer settings, draw mode, outfit configurator, and consent confirmation.
 * Port of the web SetupScreen.tsx using NativeWind + Reanimated.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, FlatList } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Heart, User, EyeOff, Timer, Shuffle, Check, ArrowLeft, Play,
  ChevronDown, HelpCircle, Shirt, ShieldCheck, Minus, Plus
} from 'lucide-react-native';
import type { CardLevel, GameSettings, OutfitConfig, Player } from '@/shared/types';
import { LEVEL_INFO } from '@/shared/data/cards';
import { GARMENT_LABELS, GARMENT_COLORS, getGarmentStyles, GARMENT_SLOT_ORDER } from '@/shared/utils/wardrobe';
import type { GarmentSlot, GarmentConfig, PlayerPresentation } from '@/shared/types';
import { COLORS, FONTS, FONT_SIZES } from '@/theme';

interface SetupScreenProps {
  initialPlayer1: Player;
  initialPlayer2: Player;
  initialSettings: GameSettings;
  onBack: () => void;
  onOpenRules: () => void;
  onStartGame: (p1: Player, p2: Player, settings: GameSettings) => void;
}

const AVATAR_OPTIONS = ['👨‍💼', '👩‍💼', '👑', '💖', '🔥', '🍷', '🌹', '🦋'];
const TIMER_PRESETS = [15, 30, 45, 60] as const;

const clampTimerDuration = (value: number, fallback: number) =>
  Number.isInteger(value) && value >= 1 && value <= 3600 ? value : fallback;

/* ── Avatar Picker ── */
const AvatarPicker: React.FC<{ value: string; onChange: (v: string) => void; tone: 'rose' | 'amber' }> = ({ value, onChange, tone }) => {
  const [isOpen, setIsOpen] = useState(false);
  const borderColor = tone === 'rose' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)';
  const bgColor = tone === 'rose' ? 'rgba(76, 5, 25, 0.8)' : 'rgba(69, 26, 3, 0.8)';

  return (
    <View style={{ zIndex: isOpen ? 50 : 30 }}>
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        style={{
          height: 44,
          minWidth: 66,
          paddingHorizontal: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor,
          backgroundColor: bgColor,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 20 }}>{value}</Text>
        <ChevronDown size={14} color="rgba(255,255,255,0.6)" style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setIsOpen(false)}>
          <View style={{ marginTop: 120, marginHorizontal: 60, borderRadius: 16, backgroundColor: '#171014', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', padding: 12 }}>
            <FlatList
              data={AVATAR_OPTIONS}
              numColumns={4}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onChange(item); setIsOpen(false); }}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderRadius: 12,
                    margin: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: value === item ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255,255,255,0.035)',
                    borderWidth: value === item ? 1 : 0,
                    borderColor: 'rgba(251, 113, 133, 0.7)',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

/* ── Timer Setting Row ── */
const TimerSettingRow: React.FC<{
  title: string; description: string; enabled: boolean; duration: number; tone: 'rose' | 'amber';
  onEnabledChange: (v: boolean) => void; onDurationChange: (v: number) => void;
}> = ({ title, description, enabled, duration, tone, onEnabledChange, onDurationChange }) => {
  const activeColor = tone === 'rose' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)';
  const activeBorder = tone === 'rose' ? 'rgba(253, 164, 175, 0.5)' : 'rgba(253, 230, 138, 0.5)';

  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.15)', padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 13, color: '#fff' }}>{title}</Text>
          <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.neutral400, marginTop: 2 }}>{description}</Text>
        </View>
        <Pressable
          onPress={() => onEnabledChange(!enabled)}
          style={{
            width: 68, height: 44, borderRadius: 22, borderWidth: 1,
            borderColor: enabled ? activeBorder : COLORS.neutral700,
            backgroundColor: enabled ? activeColor : COLORS.neutral800,
            justifyContent: 'center', paddingHorizontal: 4,
          }}
        >
          <View style={{
            width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff',
            alignSelf: enabled ? 'flex-end' : 'flex-start',
          }} />
        </Pressable>
      </View>
      {enabled && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {TIMER_PRESETS.map((seconds) => (
            <Pressable
              key={seconds}
              onPress={() => onDurationChange(seconds)}
              style={{
                flex: 1, height: 44, borderRadius: 12, borderWidth: 1,
                borderColor: duration === seconds ? activeBorder : COLORS.neutral700,
                backgroundColor: duration === seconds ? activeColor : 'rgba(10, 10, 10, 0.55)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{
                fontFamily: FONTS.bodySemiBold, fontSize: 12,
                color: duration === seconds ? '#fff' : COLORS.neutral400,
              }}>{seconds}s</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

/* ── Outfit Configurator (simplified for mobile) ── */
const OutfitConfigurator: React.FC<{
  value: OutfitConfig; onChange: (v: OutfitConfig) => void;
  presentation: PlayerPresentation; label: string;
}> = ({ value, onChange, presentation, label }) => {
  const slots = GARMENT_SLOT_ORDER[presentation];
  const [editingSlot, setEditingSlot] = useState<GarmentSlot>(slots[0]);
  const selectedGarment = value.garments[editingSlot];
  const garmentCount = slots.filter((s) => Boolean(value.garments[s])).length;

  const toggleGarment = (slot: GarmentSlot) => {
    setEditingSlot(slot);
    const garments = { ...value.garments };
    if (garments[slot]) {
      delete garments[slot];
    } else {
      const styles = getGarmentStyles(presentation, slot);
      garments[slot] = { styleId: styles[0]?.id ?? 'default', color: GARMENT_COLORS[0]?.value ?? '#FF6B9D' };
    }
    onChange({ presentation, garments });
  };

  const updateGarment = (patch: Partial<GarmentConfig>) => {
    if (!selectedGarment) return;
    onChange({ presentation, garments: { ...value.garments, [editingSlot]: { ...selectedGarment, ...patch } } });
  };

  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: COLORS.glassDark, padding: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View>
          <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 10, color: COLORS.neutral400, textTransform: 'uppercase' }}>
            {presentation === 'male' ? 'Nhân vật nam' : 'Nhân vật nữ'}
          </Text>
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: '#fff' }}>{label}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Shirt size={14} color={COLORS.rose} />
          <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.neutral300 }}>{garmentCount}/{slots.length}</Text>
        </View>
      </View>

      {/* Slot buttons */}
      <View style={{ gap: 6 }}>
        {slots.map((slot) => {
          const included = Boolean(value.garments[slot]);
          const selected = editingSlot === slot;
          return (
            <View key={slot} style={{
              flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden',
              borderColor: selected ? 'rgba(251, 113, 133, 0.75)' : 'rgba(255,255,255,0.1)',
              backgroundColor: selected ? 'rgba(244, 63, 94, 0.12)' : included ? 'rgba(127, 29, 29, 0.15)' : 'rgba(255,255,255,0.035)',
            }}>
              <Pressable onPress={() => setEditingSlot(slot)} style={{ flex: 1, padding: 10, justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: included ? '#ffe4e6' : COLORS.neutral300 }}>
                  {GARMENT_LABELS[slot]}
                </Text>
                <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 9, color: COLORS.neutral500 }}>
                  {included ? 'Đang mặc · Chạm để chỉnh' : 'Chưa thêm'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => toggleGarment(slot)}
                style={{
                  width: 48, alignItems: 'center', justifyContent: 'center',
                  borderLeftWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                {included ? <Minus size={16} color="#fda4af" /> : <Plus size={16} color={COLORS.neutral300} />}
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Color palette */}
      {selectedGarment && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 10, color: COLORS.neutral400, marginBottom: 6 }}>Màu sắc</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {GARMENT_COLORS.map((color) => (
              <Pressable
                key={color.id}
                onPress={() => updateGarment({ color: color.value })}
                style={{
                  width: 32, height: 32, borderRadius: 16, backgroundColor: color.value,
                  borderWidth: 2,
                  borderColor: selectedGarment.color.toLowerCase() === color.value.toLowerCase()
                    ? '#fff' : 'transparent',
                }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

/* ── Main SetupScreen ── */
const cloneOutfitConfig = (outfit: OutfitConfig): OutfitConfig => ({
  presentation: outfit.presentation,
  garments: { ...outfit.garments },
});

export const SetupScreen: React.FC<SetupScreenProps> = ({
  initialPlayer1, initialPlayer2, initialSettings, onBack, onOpenRules, onStartGame,
}) => {
  const [p1Name, setP1Name] = useState(initialPlayer1.name || 'Anh');
  const [p1Avatar, setP1Avatar] = useState(initialPlayer1.avatar || '👨‍💼');
  const [p2Name, setP2Name] = useState(initialPlayer2.name || 'Em');
  const [p2Avatar, setP2Avatar] = useState(initialPlayer2.avatar || '👩‍💼');
  const [selectedLevels, setSelectedLevels] = useState<CardLevel[]>(initialSettings.levels);
  const [privacyDefault, setPrivacyDefault] = useState(initialSettings.privacyDefault);
  const [truthTimerEnabled, setTruthTimerEnabled] = useState<boolean>(initialSettings.truthTimerEnabled ?? false);
  const [truthTimerDuration, setTruthTimerDuration] = useState<number>(initialSettings.truthTimerDuration ?? 45);
  const [dareTimerEnabled, setDareTimerEnabled] = useState<boolean>(initialSettings.dareTimerEnabled ?? false);
  const [dareTimerDuration, setDareTimerDuration] = useState<number>(initialSettings.dareTimerDuration ?? 30);
  const [drawMode, setDrawMode] = useState<'random' | 'choose'>(initialSettings.drawMode);
  const [outfits, setOutfits] = useState<[OutfitConfig, OutfitConfig]>([
    cloneOutfitConfig(initialSettings.outfits[0]),
    cloneOutfitConfig(initialSettings.outfits[1]),
  ]);
  const [penaltyClothingEnabled, setPenaltyClothingEnabled] = useState(initialSettings.penaltyClothingEnabled);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [activeOutfitTab, setActiveOutfitTab] = useState<0 | 1>(0);

  const toggleLevel = (lvl: CardLevel) => {
    if (selectedLevels.includes(lvl)) {
      if (selectedLevels.length > 1) setSelectedLevels(selectedLevels.filter(l => l !== lvl));
    } else {
      setSelectedLevels([...selectedLevels, lvl]);
    }
  };

  const handleSubmit = () => {
    if (!consentConfirmed) return;
    const p1: Player = { name: p1Name.trim() || 'Người chơi 1', avatar: p1Avatar, color: '#FF6B9D', completedCount: 0, skippedCount: 0 };
    const p2: Player = { name: p2Name.trim() || 'Người chơi 2', avatar: p2Avatar, color: '#D4AF37', completedCount: 0, skippedCount: 0 };
    const settings: GameSettings = {
      levels: selectedLevels, roundsMode: 'unlimited', targetRounds: initialSettings.targetRounds,
      privacyDefault, enableTimer: truthTimerEnabled || dareTimerEnabled,
      timerDuration: clampTimerDuration(dareTimerDuration ?? 30, 30),
      truthTimerEnabled, truthTimerDuration: clampTimerDuration(truthTimerDuration ?? 45, 45),
      dareTimerEnabled, dareTimerDuration: clampTimerDuration(dareTimerDuration ?? 30, 30),
      drawMode, outfits, penaltyClothingEnabled,
    };
    onStartGame(p1, p2, settings);
  };

  const LEVEL_STYLES: Record<CardLevel, { selectedBg: string; checkColor: string }> = {
    gentle: { selectedBg: 'rgba(76, 5, 25, 0.6)', checkColor: '#fb7185' },
    intimate: { selectedBg: 'rgba(30, 58, 138, 0.6)', checkColor: '#60a5fa' },
    passionate: { selectedBg: 'rgba(69, 26, 3, 0.6)', checkColor: '#fbbf24' },
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Pressable onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ArrowLeft size={16} color={COLORS.neutral400} />
          <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.neutral400 }}>Quay lại</Text>
        </Pressable>
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: COLORS.gold, textTransform: 'uppercase', letterSpacing: 2 }}>
          Thiết Lập
        </Text>
        <Pressable onPress={onOpenRules} style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(244,63,94,0.25)', backgroundColor: 'rgba(76,5,25,0.3)', alignItems: 'center', justifyContent: 'center' }}>
          <HelpCircle size={18} color="#fda4af" />
        </Pressable>
      </View>

      {/* Section 1: Player Names */}
      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(244,63,94,0.2)', backgroundColor: COLORS.glassDark, padding: 20, marginBottom: 24, zIndex: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <User size={16} color="#fb7185" />
          <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 12, color: '#fda4af', textTransform: 'uppercase', letterSpacing: 1 }}>
            Tên 2 Người Chơi
          </Text>
        </View>

        {/* Player 1 */}
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fb7185' }} />
            <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 11, color: COLORS.neutral300 }}>Người chơi 1</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AvatarPicker value={p1Avatar} onChange={setP1Avatar} tone="rose" />
            <TextInput
              value={p1Name} onChangeText={setP1Name} placeholder="Nhập tên..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              style={{
                flex: 1, height: 44, borderRadius: 12, borderWidth: 1,
                borderColor: 'rgba(64,64,64,0.6)', backgroundColor: 'rgba(23,23,23,0.8)',
                paddingHorizontal: 14, color: '#fff', fontFamily: FONTS.bodyRegular, fontSize: 13,
              }}
            />
          </View>
        </View>

        {/* Player 2 */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fbbf24' }} />
            <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 11, color: COLORS.neutral300 }}>Người chơi 2</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AvatarPicker value={p2Avatar} onChange={setP2Avatar} tone="amber" />
            <TextInput
              value={p2Name} onChangeText={setP2Name} placeholder="Nhập tên..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              style={{
                flex: 1, height: 44, borderRadius: 12, borderWidth: 1,
                borderColor: 'rgba(64,64,64,0.6)', backgroundColor: 'rgba(23,23,23,0.8)',
                paddingHorizontal: 14, color: '#fff', fontFamily: FONTS.bodyRegular, fontSize: 13,
              }}
            />
          </View>
        </View>
      </View>

      {/* Section 2: Outfits */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Shirt size={16} color="#fb7185" />
          <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 12, color: '#fde68a', textTransform: 'uppercase', letterSpacing: 1 }}>
            Trang Phục Ban Đầu
          </Text>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)', padding: 6 }}>
          {([0, 1] as const).map((index) => (
            <Pressable
              key={index}
              onPress={() => setActiveOutfitTab(index)}
              style={{
                flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                backgroundColor: activeOutfitTab === index ? 'rgba(244,63,94,0.18)' : 'transparent',
                borderWidth: activeOutfitTab === index ? 1 : 0, borderColor: 'rgba(251,113,133,0.45)',
              }}
            >
              <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 13, color: activeOutfitTab === index ? '#ffe4e6' : COLORS.neutral400 }}>
                {index === 0 ? `👨 ${p1Name || 'P1'}` : `👩 ${p2Name || 'P2'}`}
              </Text>
            </Pressable>
          ))}
        </View>

        <OutfitConfigurator
          value={outfits[activeOutfitTab]}
          presentation={activeOutfitTab === 0 ? 'male' : 'female'}
          label={activeOutfitTab === 0 ? p1Name || 'Người chơi 1' : p2Name || 'Người chơi 2'}
          onChange={(next) => setOutfits(current => activeOutfitTab === 0 ? [next, current[1]] : [current[0], next])}
        />
      </View>

      {/* Section 3: Level Selection */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Heart size={16} color="#fb7185" />
          <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 12, color: '#fde68a', textTransform: 'uppercase', letterSpacing: 1 }}>Chọn Cấp Độ</Text>
        </View>
        <View style={{ gap: 12 }}>
          {(['gentle', 'intimate', 'passionate'] as CardLevel[]).map((lvl) => {
            const info = LEVEL_INFO[lvl];
            const isSelected = selectedLevels.includes(lvl);
            const lvlStyle = LEVEL_STYLES[lvl];
            return (
              <Pressable key={lvl} onPress={() => toggleLevel(lvl)} style={{
                borderRadius: 16, padding: 16, borderWidth: 1, minHeight: 100,
                borderColor: isSelected ? lvlStyle.checkColor + '99' : 'rgba(38,38,38,1)',
                backgroundColor: isSelected ? lvlStyle.selectedBg : 'rgba(23,23,23,0.4)',
                opacity: isSelected ? 1 : 0.6,
              }}>
                {isSelected && (
                  <View style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: lvlStyle.checkColor, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={12} color="#171717" strokeWidth={3} />
                  </View>
                )}
                <Text style={{ fontSize: 24, marginBottom: 4 }}>{info.icon}</Text>
                <Text style={{ fontFamily: FONTS.serifBold, fontSize: 18, color: '#fff', marginBottom: 4 }}>{info.name}</Text>
                <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 12, color: COLORS.neutral300, lineHeight: 18 }}>{info.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Section 4: Options */}
      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(244,63,94,0.2)', backgroundColor: COLORS.glassDark, padding: 20, marginBottom: 24, gap: 20 }}>
        <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 12, color: '#fde68a', textTransform: 'uppercase', letterSpacing: 1 }}>
          Tùy Chỉnh
        </Text>

        {/* Privacy toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <EyeOff size={20} color="#fbbf24" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 13, color: '#fff' }}>Chế độ bảo mật</Text>
              <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.neutral400 }}>Che nội dung lá bài</Text>
            </View>
          </View>
          <Pressable onPress={() => setPrivacyDefault(!privacyDefault)} style={{
            width: 48, height: 24, borderRadius: 12, padding: 2,
            backgroundColor: privacyDefault ? '#fbbf24' : COLORS.neutral700,
            justifyContent: 'center',
          }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', alignSelf: privacyDefault ? 'flex-end' : 'flex-start' }} />
          </Pressable>
        </View>

        {/* Draw mode */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Shuffle size={20} color="#fb7185" />
            <View>
              <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 13, color: '#fff' }}>Cách chọn thể loại</Text>
              <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.neutral400 }}>Tự chọn hay ngẫu nhiên</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['random', 'choose'] as const).map((m) => (
              <Pressable key={m} onPress={() => setDrawMode(m)} style={{
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                backgroundColor: drawMode === m ? '#e11d48' : COLORS.neutral800,
              }}>
                <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 12, color: drawMode === m ? '#fff' : COLORS.neutral400 }}>
                  {m === 'random' ? 'Ngẫu nhiên' : 'Tự chọn'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Timers */}
        <TimerSettingRow title="Sự thật" description="Thời gian trả lời." enabled={truthTimerEnabled} duration={truthTimerDuration} tone="rose" onEnabledChange={setTruthTimerEnabled} onDurationChange={setTruthTimerDuration} />
        <TimerSettingRow title="Thử thách" description="Thời gian hoàn thành." enabled={dareTimerEnabled} duration={dareTimerDuration} tone="amber" onEnabledChange={setDareTimerEnabled} onDurationChange={setDareTimerDuration} />

        {/* Clothing penalty */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Shirt size={20} color="#fb7185" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 13, color: '#fff' }}>Luật phạt cởi 1 món</Text>
              <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.neutral400 }}>Khi bỏ lượt</Text>
            </View>
          </View>
          <Pressable onPress={() => setPenaltyClothingEnabled(!penaltyClothingEnabled)} style={{
            width: 48, height: 24, borderRadius: 12, padding: 2,
            backgroundColor: penaltyClothingEnabled ? '#e11d48' : COLORS.neutral700,
            justifyContent: 'center',
          }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', alignSelf: penaltyClothingEnabled ? 'flex-end' : 'flex-start' }} />
          </Pressable>
        </View>
      </View>

      {/* Consent checkbox */}
      <Pressable onPress={() => setConsentConfirmed(!consentConfirmed)} style={{
        flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 24,
        borderColor: consentConfirmed ? 'rgba(52, 211, 153, 0.45)' : 'rgba(244,63,94,0.25)',
        backgroundColor: consentConfirmed ? 'rgba(16, 185, 129, 0.07)' : 'rgba(244,63,94,0.045)',
      }}>
        <View style={{
          width: 20, height: 20, borderRadius: 4, borderWidth: 2, marginTop: 2,
          borderColor: consentConfirmed ? '#34d399' : COLORS.neutral500,
          backgroundColor: consentConfirmed ? '#34d399' : 'transparent',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {consentConfirmed && <Check size={12} color="#fff" strokeWidth={3} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} color="#6ee7b7" />
            <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 13, color: '#fff' }}>Xác nhận 18+ và đồng thuận</Text>
          </View>
          <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 11, color: COLORS.neutral400, marginTop: 4, lineHeight: 16 }}>
            Chúng tôi đều là người trưởng thành, tự nguyện tham gia và đã thống nhất giới hạn.
          </Text>
        </View>
      </Pressable>

      {/* Start button */}
      <Pressable
        onPress={handleSubmit}
        disabled={!consentConfirmed}
        style={({ pressed }) => ({
          height: 56, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12,
          backgroundColor: consentConfirmed ? (pressed ? COLORS.goldGradientEnd : COLORS.goldGradientMid) : COLORS.neutral700,
          opacity: consentConfirmed ? 1 : 0.4,
          shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 0 },
          shadowOpacity: consentConfirmed ? 0.4 : 0, shadowRadius: 25, elevation: consentConfirmed ? 12 : 0,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Play size={20} color="#171717" fill="#171717" />
        <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 18, color: '#171717' }}>Vào Bàn Chơi Ngay</Text>
      </Pressable>
    </ScrollView>
  );
};
