/**
 * CardCollectionScreen — Mobile card collection viewer.
 * Supports filtering by type, level, favorites, full text search,
 * locked card states, and detail previews.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import {
  Search,
  ArrowLeft,
  Heart,
  Lock,
  Sparkles,
  X,
  BookOpen,
} from 'lucide-react-native';
import type { CardItem, CardLevel, CardType } from '@/shared/types';
import { LEVEL_INFO } from '@/shared/data/cards';
import { GameCard } from '@/components/GameCard';
import { compareCollectionCards } from '@/shared/utils/cardOrdering';
import { COLORS, FONTS, FONT_SIZES } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CollectionTab = 'all' | 'truth' | 'dare' | 'favorites' | CardLevel;

export interface CardCollectionScreenProps {
  cards: CardItem[];
  favorites: string[];
  unlockedCardIds?: string[];
  mode?: 'player' | 'developer';
  onToggleFavorite: (cardId: string) => void;
  onBack: () => void;
}

const TABS: Array<{ id: CollectionTab; label: string; icon?: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'truth', label: 'Sự thật', icon: '💬' },
  { id: 'dare', label: 'Thử thách', icon: '🔥' },
  { id: 'favorites', label: 'Yêu thích', icon: '♥' },
  { id: 'gentle', label: 'Nhẹ nhàng', icon: '🌸' },
  { id: 'intimate', label: 'Thân mật', icon: '✨' },
  { id: 'passionate', label: 'Nồng nhiệt', icon: '💋' },
];

export const CardCollectionScreen: React.FC<CardCollectionScreenProps> = ({
  cards,
  favorites,
  unlockedCardIds,
  mode = 'player',
  onToggleFavorite,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<CollectionTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);

  const unlockedSet = useMemo(() => new Set(unlockedCardIds ?? []), [unlockedCardIds]);
  const isDev = mode === 'developer';

  const filteredCards = useMemo(() => {
    let list = [...cards].sort(compareCollectionCards);

    // Tab filter
    if (activeTab === 'truth') {
      list = list.filter((c) => c.type === 'truth');
    } else if (activeTab === 'dare') {
      list = list.filter((c) => c.type === 'dare');
    } else if (activeTab === 'favorites') {
      list = list.filter((c) => favorites.includes(c.id));
    } else if (activeTab === 'gentle' || activeTab === 'intimate' || activeTab === 'passionate') {
      list = list.filter((c) => c.level === activeTab);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.content.toLowerCase().includes(q) ||
          c.hint?.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q),
      );
    }

    return list;
  }, [cards, activeTab, favorites, searchQuery]);

  const renderCardItem = ({ item, index }: { item: CardItem; index: number }) => {
    const isUnlocked = isDev || unlockedCardIds === undefined || unlockedSet.has(item.id);
    const isFav = favorites.includes(item.id);

    if (!isUnlocked) {
      return (
        <View style={styles.lockedCard}>
          <Lock size={24} color="rgba(255, 107, 157, 0.4)" />
          <Text style={styles.lockedNumber}>#{index + 1}</Text>
          <Text style={styles.lockedText}>Mở khóa qua quá trình chơi</Text>
        </View>
      );
    }

    return (
      <View style={styles.cardWrapper}>
        <GameCard
          card={item}
          size="sm"
          isFavorited={isFav}
          onToggleFavorite={onToggleFavorite}
          onPress={() => setSelectedCard(item)}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <ArrowLeft size={18} color="#fff" />
        </Pressable>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Bộ Sưu Tập Thẻ</Text>
          <Text style={styles.headerSubtitle}>
            {filteredCards.length} lá · {favorites.length} đã thích
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Search size={16} color={COLORS.neutral400} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Tìm nội dung, gợi ý..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          style={styles.searchInput}
        />
        {Boolean(searchQuery) && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <X size={16} color={COLORS.neutral400} />
          </Pressable>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.tabsContainer}
          renderItem={({ item: tab }) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              >
                {Boolean(tab.icon) && (
                  <Text style={styles.tabIcon}>{tab.icon}</Text>
                )}
                <Text
                  style={[
                    styles.tabBtnText,
                    isActive && styles.tabBtnTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Cards List */}
      <FlatList
        data={filteredCards}
        keyExtractor={(item) => item.id}
        renderItem={renderCardItem}
        numColumns={2}
        columnWrapperStyle={styles.cardsRow}
        contentContainerStyle={styles.cardsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BookOpen size={40} color="rgba(255, 107, 157, 0.4)" />
            <Text style={styles.emptyTitle}>Không tìm thấy thẻ nào</Text>
            <Text style={styles.emptySub}>Thử tìm kiếm với từ khóa khác</Text>
          </View>
        }
      />

      {/* Detail Preview Modal */}
      {selectedCard && (
        <Modal
          visible={Boolean(selectedCard)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedCard(null)}
        >
          <Pressable
            style={styles.previewBackdrop}
            onPress={() => setSelectedCard(null)}
          >
            <View
              style={styles.previewCardBox}
              onStartShouldSetResponder={() => true}
            >
              <GameCard
                card={selectedCard}
                size="lg"
                isFavorited={favorites.includes(selectedCard.id)}
                onToggleFavorite={onToggleFavorite}
              />
              <Pressable
                onPress={() => setSelectedCard(null)}
                style={styles.closePreviewBtn}
              >
                <Text style={styles.closePreviewText}>Đóng xem trước</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 18,
    color: COLORS.gold,
  },
  headerSubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: COLORS.neutral400,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: '#fff',
    height: '100%',
  },
  tabsWrapper: {
    marginBottom: 12,
  },
  tabsContainer: {
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.25)',
    borderColor: 'rgba(251, 113, 133, 0.6)',
  },
  tabIcon: {
    fontSize: 12,
  },
  tabBtnText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.neutral400,
  },
  tabBtnTextActive: {
    color: '#ffe4e6',
    fontFamily: FONTS.bodySemiBold,
  },
  cardsList: {
    paddingBottom: 40,
  },
  cardsRow: {
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: (SCREEN_WIDTH - 44) / 2,
  },
  lockedCard: {
    flex: 1,
    maxWidth: (SCREEN_WIDTH - 44) / 2,
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.15)',
    backgroundColor: 'rgba(20, 10, 15, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  lockedNumber: {
    fontFamily: FONTS.serifBold,
    fontSize: 14,
    color: 'rgba(255, 107, 157, 0.4)',
    marginTop: 8,
  },
  lockedText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 10,
    color: COLORS.neutral500,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: '#fff',
    marginTop: 12,
  },
  emptySub: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: COLORS.neutral400,
    marginTop: 4,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewCardBox: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  closePreviewBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closePreviewText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: '#fff',
  },
});
