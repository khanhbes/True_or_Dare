import { DifficultyStars, PendingDifficultyBoost, PlayerIndex, PlayerRewardState } from '../types';

export const REROLL_STAR_COST = 8;
export const DIFFICULTY_BOOST_STAR_COST = 10;

export const createPlayerRewardState = (): PlayerRewardState => ({
  starBalance: 0,
  totalStarsEarned: 0,
  rerollsUsed: 0,
  difficultyBoostsUsed: 0,
});

export const createRewardStates = (): [PlayerRewardState, PlayerRewardState] => [
  createPlayerRewardState(),
  createPlayerRewardState(),
];

export const awardStars = (
  rewards: readonly [PlayerRewardState, PlayerRewardState],
  playerIndex: PlayerIndex,
  stars: DifficultyStars,
): [PlayerRewardState, PlayerRewardState] => rewards.map((reward, index) =>
  index === playerIndex
    ? {
        ...reward,
        starBalance: reward.starBalance + stars,
        totalStarsEarned: reward.totalStarsEarned + stars,
      }
    : reward,
) as [PlayerRewardState, PlayerRewardState];

export const spendReward = (
  rewards: readonly [PlayerRewardState, PlayerRewardState],
  playerIndex: PlayerIndex,
  kind: 'reroll' | 'difficulty_boost',
): [PlayerRewardState, PlayerRewardState] | null => {
  const cost = kind === 'reroll' ? REROLL_STAR_COST : DIFFICULTY_BOOST_STAR_COST;
  if (rewards[playerIndex].starBalance < cost) return null;
  return rewards.map((reward, index) =>
    index === playerIndex
      ? {
          ...reward,
          starBalance: reward.starBalance - cost,
          rerollsUsed: reward.rerollsUsed + (kind === 'reroll' ? 1 : 0),
          difficultyBoostsUsed: reward.difficultyBoostsUsed + (kind === 'difficulty_boost' ? 1 : 0),
        }
      : reward,
  ) as [PlayerRewardState, PlayerRewardState];
};

export const refundPendingDifficultyBoost = (
  rewards: readonly [PlayerRewardState, PlayerRewardState],
  pending: PendingDifficultyBoost | null,
): [PlayerRewardState, PlayerRewardState] => {
  if (!pending) return [rewards[0], rewards[1]];
  return rewards.map((reward, index) =>
    index === pending.ownerPlayerIndex
      ? {
          ...reward,
          starBalance: reward.starBalance + DIFFICULTY_BOOST_STAR_COST,
          difficultyBoostsUsed: Math.max(0, reward.difficultyBoostsUsed - 1),
        }
      : reward,
  ) as [PlayerRewardState, PlayerRewardState];
};
