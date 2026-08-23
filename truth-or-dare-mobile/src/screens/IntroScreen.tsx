/**
 * IntroScreen — Landing screen with candle flame animation, title,
 * level badges, Play button, and mode toggle.
 * Port of the web IntroScreen.tsx using Reanimated + NativeWind.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { Heart, Flame, Sparkles, Volume2, VolumeX, BookOpen, Play, HelpCircle, UserRound, Code2 } from 'lucide-react-native';
import { COLORS, FONTS, FONT_SIZES } from '@/theme';

interface IntroScreenProps {
  mode: 'player' | 'developer';
  onModeChange: (mode: 'player' | 'developer') => void;
  onStart: () => void;
  onOpenCollection: () => void;
  onOpenRules: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({
  mode,
  onModeChange,
  onStart,
  onOpenCollection,
  onOpenRules,
}) => {
  const [isMusicOn, setIsMusicOn] = useState(false);

  // Candle glow animation
  const candleOpacity = useSharedValue(0.6);
  const candleScale = useSharedValue(1);

  useEffect(() => {
    candleOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    candleScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, []);

  const candleAnimStyle = useAnimatedStyle(() => ({
    opacity: candleOpacity.value,
    transform: [{ scale: candleScale.value }],
  }));

  // Sparkle pulse
  const sparkleOpacity = useSharedValue(0.5);
  useEffect(() => {
    sparkleOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.5, { duration: 1000 }),
      ),
      -1,
    );
  }, []);
  const sparkleAnimStyle = useAnimatedStyle(() => ({ opacity: sparkleOpacity.value }));

  return (
    <View className="flex-1 items-center justify-between px-4 py-6">
      {/* Top Header Bar */}
      <View className="w-full px-2 py-1">
        <View className="flex-row items-center justify-between gap-2">
          {/* Music toggle */}
          <Pressable
            onPress={() => setIsMusicOn(!isMusicOn)}
            className="flex-row items-center gap-2 rounded-full border border-rose-500/30 px-3 py-2"
            style={{ backgroundColor: 'rgba(76, 5, 25, 0.4)' }}
          >
            {isMusicOn
              ? <Volume2 size={16} color="#fbbf24" />
              : <VolumeX size={16} color={COLORS.neutral400} />
            }
            <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 11, color: '#fda4af' }}>
              {isMusicOn ? 'Nhạc: Bật' : 'Nhạc: Tắt'}
            </Text>
          </Pressable>

          {/* Collection button */}
          <Pressable
            onPress={onOpenCollection}
            className="flex-row items-center gap-2 rounded-full border border-amber-500/30 px-3 py-2"
            style={{ backgroundColor: 'rgba(69, 26, 3, 0.4)' }}
          >
            <BookOpen size={16} color="#fbbf24" />
            <Text style={{ fontFamily: FONTS.bodyRegular, fontSize: 11, color: '#fde68a' }}>
              Bộ sưu tập
            </Text>
          </Pressable>
        </View>

        {/* Mode toggle */}
        <View className="flex-row self-center mt-3 rounded-full border border-white/10 p-1" style={{ backgroundColor: 'rgba(0,0,0,0.25)', maxWidth: 260 }}>
          {([
            { id: 'player' as const, label: 'Player', Icon: UserRound },
            { id: 'developer' as const, label: 'Developer', Icon: Code2 },
          ]).map(({ id, label, Icon }) => (
            <Pressable
              key={id}
              onPress={() => onModeChange(id)}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full px-3 py-2"
              style={mode === id ? {
                backgroundColor: 'rgba(244, 63, 94, 0.18)',
                shadowColor: '#fb7185',
                shadowOpacity: 0.4,
                shadowRadius: 1,
                shadowOffset: { width: 0, height: 0 },
              } : {}}
            >
              <Icon size={14} color={mode === id ? '#ffe4e6' : COLORS.neutral500} />
              <Text style={{
                fontFamily: FONTS.bodySemiBold,
                fontSize: 12,
                color: mode === id ? '#ffe4e6' : COLORS.neutral500,
              }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Main Center */}
      <Animated.View
        entering={FadeIn.duration(800)}
        className="items-center py-8"
      >
        {/* Candle flame */}
        <View className="relative mb-6">
          <Animated.View
            style={[
              {
                width: 80,
                height: 80,
                borderRadius: 40,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
              },
              candleAnimStyle,
            ]}
          >
            <Flame
              size={40}
              color="#fbbf24"
              style={{
                shadowColor: 'rgba(212, 175, 55, 0.8)',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 12,
              }}
            />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', top: -4, right: -4 }, sparkleAnimStyle]}>
            <Sparkles size={20} color="#fda4af" />
          </Animated.View>
        </View>

        {/* Title */}
        <Text
          className="text-center uppercase mb-3"
          style={{
            fontFamily: FONTS.serifBold,
            fontSize: FONT_SIZES['5xl'],
            color: COLORS.gold,
            letterSpacing: 4,
            textShadowColor: 'rgba(212, 175, 55, 0.4)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 15,
          }}
        >
          Truth or Dare
        </Text>

        {/* Subtitle */}
        <Text
          className="text-center mb-4"
          style={{
            fontFamily: FONTS.serifItalic,
            fontSize: FONT_SIZES.xl,
            color: COLORS.rose,
            textShadowColor: 'rgba(255, 107, 157, 0.6)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 12,
          }}
        >
          Dành Cho Cặp Đôi • Sự Thật Hay Thách
        </Text>

        {/* Description */}
        <Text
          className="text-center mb-8"
          style={{
            fontFamily: FONTS.bodyLight,
            fontSize: FONT_SIZES.sm,
            color: COLORS.neutral300,
            lineHeight: FONT_SIZES.sm * 1.625,
            maxWidth: 320,
          }}
        >
          {mode === 'player'
            ? 'Khám phá từng lá bài qua những câu hỏi gắn kết và thử thách dành riêng cho hai người.'
            : 'Quản lý toàn bộ nội dung, xem trước thẻ khóa và chỉnh sửa bộ bài dành cho người chơi.'}
        </Text>

        {/* Level badges */}
        <View className="flex-row flex-wrap justify-center gap-2 mb-10">
          <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-500/30"
            style={{ backgroundColor: 'rgba(76, 5, 25, 0.5)' }}>
            <Text style={{ fontSize: 13 }}>🌸</Text>
            <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 12, color: '#fda4af' }}>Nhẹ nhàng</Text>
          </View>
          <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30"
            style={{ backgroundColor: 'rgba(69, 26, 3, 0.5)' }}>
            <Text style={{ fontSize: 13 }}>🔥</Text>
            <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 12, color: '#fcd34d' }}>Thân mật</Text>
          </View>
          <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-500/40"
            style={{ backgroundColor: 'rgba(69, 10, 10, 0.5)' }}>
            <Text style={{ fontSize: 13 }}>💋</Text>
            <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 12, color: '#fca5a5' }}>Nồng nhiệt</Text>
          </View>
        </View>

        {/* Play button */}
        <Pressable
          onPress={onStart}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 40,
            paddingVertical: 16,
            borderRadius: 9999,
            backgroundColor: pressed ? COLORS.goldGradientEnd : COLORS.goldGradientMid,
            shadowColor: COLORS.gold,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 25,
            elevation: 12,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          {mode === 'player'
            ? <Play size={20} color="#171717" fill="#171717" />
            : <Code2 size={20} color="#171717" />
          }
          <Text style={{
            fontFamily: FONTS.bodySemiBold,
            fontSize: FONT_SIZES.lg,
            color: '#171717',
            letterSpacing: 0.5,
          }}>
            {mode === 'player' ? 'Bắt Đầu Chơi' : 'Mở Trình Quản Lý'}
          </Text>
          <Heart size={20} color="#9f1239" fill="#9f1239" />
        </Pressable>

        {/* Rules button */}
        <Pressable
          onPress={onOpenRules}
          className="flex-row items-center gap-2 mt-4 px-4 py-2 rounded-full"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <HelpCircle size={16} color="#fda4af" />
          <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.neutral300 }}>
            Cách chơi & luật phạt
          </Text>
        </Pressable>
      </Animated.View>

      {/* Footer */}
      <View className="flex-row items-center gap-1">
        <Text style={{ fontFamily: FONTS.bodyLight, fontSize: 11, color: COLORS.neutral500 }}>
          Thiết kế dành riêng cho 2 người
        </Text>
        <Text style={{ color: COLORS.rose, fontSize: 11 }}>♥</Text>
        <Text style={{ fontFamily: FONTS.bodyLight, fontSize: 11, color: COLORS.neutral500 }}>
          Giữ trọn cảm xúc ngọt ngào
        </Text>
      </View>
    </View>
  );
};
