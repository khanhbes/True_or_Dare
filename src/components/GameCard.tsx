import React from 'react';
import { CardItem, CardLevel } from '../types';
import { getCardIcon, autoAssignIcon } from './CardIcons';
import { LEVEL_INFO } from '../data/cards';
import { Heart } from 'lucide-react';
import { deriveDifficultyStars, derivePositionDifficultyStars, getCardAudience, getCardDeck } from '../utils/progression';

interface GameCardProps {
  card: CardItem;
  size?: 'sm' | 'md' | 'lg';
  showContent?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: (cardId: string) => void;
  onClick?: () => void;
  className?: string;
}

const CORNER_SYMBOLS = ['♠', '♥', '♦', '♣'];

export const GameCard: React.FC<GameCardProps> = ({
  card,
  size = 'md',
  showContent = true,
  isFavorited = false,
  onToggleFavorite,
  onClick,
  className = '',
}) => {
  const levelInfo = LEVEL_INFO[card.level];
  const iconName = card.icon || autoAssignIcon(card.content);
  const IconComponent = getCardIcon(iconName);
  const deck = getCardDeck(card);
  const isPosition = deck === 'position';
  const isRarePosition = isPosition && card.position?.rarity === 'mythic';
  const audienceLabel = card.position
    ? ({ male: 'Nam nhận', female: 'Nữ nhận', both: 'Cả hai' } as const)[card.position.recipient]
    : ({
        male: 'Nam',
        female: 'Nữ',
        both: 'Cả hai',
        current: 'Người đang lượt',
        opponent: 'Đối phương',
      } as const)[getCardAudience(card)];
  const familyLabel = card.position
    ? card.position.family === 'other'
      ? (card.position.customLabel?.trim() || 'TƯ THẾ KHÁC').toUpperCase()
      : ({ oral: 'ORAL SEX', blowjob: 'BLOW', handjob: 'HAND', have_sex: 'HAVE SEX' } as const)[card.position.family]
    : null;

  // Card level class
  const levelClass = isRarePosition ? 'card-position-rare' : isPosition ? 'card-position' : `card-${card.level}`;
  const isIntimateOrPassionate = !isPosition && (card.level === 'intimate' || card.level === 'passionate');

  // Size-dependent styles
  const sizeStyles = {
    sm: {
      container: 'p-3',
      iconWrapper: 'card-icon-wrapper-sm',
      title: 'text-[10px]',
      content: 'text-[11px] leading-snug',
      badge: 'text-[8px] px-1.5 py-0.5',
      minHeight: 'min-h-[180px]',
      contentPixels: 11,
      badgePixels: 8,
      timerPixels: 10,
    },
    md: {
      container: 'p-4',
      iconWrapper: 'card-icon-wrapper',
      title: 'text-xs',
      content: 'text-xs leading-relaxed',
      badge: 'text-[9px] px-2 py-0.5',
      minHeight: 'min-h-[260px]',
      contentPixels: 12,
      badgePixels: 9,
      timerPixels: 10,
    },
    lg: {
      container: 'p-6 sm:p-8',
      iconWrapper: 'card-icon-wrapper-lg',
      title: 'text-sm',
      content: 'text-sm sm:text-base leading-relaxed',
      badge: 'text-xs px-3 py-1',
      minHeight: 'min-h-[380px]',
      contentPixels: 16,
      badgePixels: 12,
      timerPixels: 12,
    },
  };

  const s = sizeStyles[size];
  const iconScale = Math.min(1.8, Math.max(0.5, card.appearance?.iconScale ?? 1));
  const textScale = Math.min(1.5, Math.max(0.75, card.appearance?.textScale ?? 1));
  const iconScaleStyle = { transform: `scale(${iconScale})` };
  const iconWrapperSpacingStyle = {
    marginTop: `${Math.max(0, iconScale - 1) * 28}px`,
    marginBottom: `${12 + Math.max(0, iconScale - 1) * 36}px`,
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Mở lá bài: ${card.content}` : undefined}
      className={`game-card ${levelClass} ${isIntimateOrPassionate ? 'card-wave-pattern' : ''} ${s.minHeight} flex flex-col ${s.container} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Corner decorations for intimate/passionate */}
      {isIntimateOrPassionate && (
        <>
          <span className="card-corner-deco top-2 left-2.5">{CORNER_SYMBOLS[0]} {CORNER_SYMBOLS[1]}</span>
          <span className="card-corner-deco top-2 right-2.5">{CORNER_SYMBOLS[2]} {CORNER_SYMBOLS[3]}</span>
          <span className="card-corner-deco bottom-2 left-2.5">{CORNER_SYMBOLS[1]} {CORNER_SYMBOLS[0]}</span>
          <span className="card-corner-deco bottom-2 right-2.5">{CORNER_SYMBOLS[3]} {CORNER_SYMBOLS[2]}</span>
        </>
      )}

      {/* Card content layer */}
      <div className="card-content-layer flex flex-col h-full">
        {/* Top: Type & Level badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {isPosition ? (
              <span style={{ fontSize: `${s.badgePixels * textScale}px` }} className={`${s.badge} rounded-full border border-[#e2c275]/45 bg-[#e2c275]/10 font-bold text-[#f7e7b0]`}>
                ✦ {familyLabel}
              </span>
            ) : (
              <>
            <span
              style={{ fontSize: `${s.badgePixels * textScale}px` }}
              className={`${s.badge} rounded-full font-semibold border ${
                card.type === 'truth'
                  ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
              }`}
            >
              {card.type === 'truth' ? 'SỰ THẬT' : 'THỬ THÁCH'}
            </span>
            <span style={{ fontSize: `${s.badgePixels * textScale}px` }} className={`${s.badge} rounded-full border ${levelInfo.badgeBg}`}>
              {levelInfo.icon} {levelInfo.name}
            </span>
              </>
            )}
          </div>

          {/* Favorite button */}
          {onToggleFavorite && (
            <button
              type="button"
              aria-label={isFavorited ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(card.id);
              }}
                className="flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isFavorited
                    ? 'text-rose-500 fill-rose-500'
                    : 'text-neutral-500 hover:text-rose-400'
                }`}
              />
            </button>
          )}
        </div>

        {/* Center: Icon (custom image or SVG) */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {card.customImage ? (
            <div style={iconWrapperSpacingStyle} className={`${s.iconWrapper} card-custom-icon-wrapper ${isRarePosition ? 'mythic-icon-aura' : ''}`}>
              <div className="h-full w-full transition-transform duration-200 motion-reduce:transition-none" style={iconScaleStyle}>
                <img
                  src={card.customImage}
                  alt=""
                  className="card-custom-icon w-full h-full object-contain"
                />
              </div>
            </div>
          ) : IconComponent ? (
            <div style={iconWrapperSpacingStyle} className={`${s.iconWrapper} card-icon-color ${isRarePosition ? 'mythic-icon-aura' : ''}`}>
              <div className="h-full w-full transition-transform duration-200 motion-reduce:transition-none" style={iconScaleStyle}>
                <IconComponent className="w-full h-full" />
              </div>
            </div>
          ) : null}

          {/* Content text */}
          {showContent && (
            <p style={{ fontSize: `${s.contentPixels * textScale}px` }} className={`${s.content} text-white/90 text-center font-medium max-w-[90%] mx-auto`}>
              {card.content}
            </p>
          )}

          {/* Hint */}
          {showContent && card.hint && (
            <p style={{ fontSize: `${s.badgePixels * textScale}px` }} className={`${s.badge} text-rose-300/70 italic mt-2 text-center`}>
              💡 {card.hint}
            </p>
          )}
        </div>

        {/* Bottom: Optional timer */}
        <div className="mt-auto pt-2">
          <div style={{ fontSize: `${9 * textScale}px` }} className="mb-1.5 flex items-center justify-center gap-1.5 text-neutral-400">
            <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-2 py-0.5 text-amber-200">
              {isPosition ? derivePositionDifficultyStars(card) : deriveDifficultyStars(card)}★
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-0.5">
              {audienceLabel}
            </span>
          </div>
          {card.timerSeconds && showContent && (
            <div style={{ fontSize: `${s.timerPixels * textScale}px` }} className="text-amber-300/60 text-center">
              ⏱ {card.timerSeconds}s
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
