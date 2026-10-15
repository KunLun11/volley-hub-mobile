/* ============================================================
   Общие расчёты профиля игрока (перенос из volley-hub-frontend/src/lib/profile.ts).
   Используются и в своём профиле (screens/ProfileScreen.tsx), и в чужом
   (screens/UserProfileScreen.tsx) — чтобы «ранг» и «достижения» не разъезжались.
   ============================================================ */
import type { IconName } from '../components/ui';

/** Ранги по ELO (янтарь = данные, brand-spec.md) */
export const TIERS = [
  { name: 'Бронза', min: 0, max: 1200 },
  { name: 'Серебро', min: 1200, max: 1500 },
  { name: 'Золото', min: 1500, max: 1800 },
  { name: 'Платина', min: 1800, max: 2100 },
  { name: 'Алмаз', min: 2100, max: 2600 },
] as const;

export interface RankInfo {
  tier: (typeof TIERS)[number];
  nextTier?: (typeof TIERS)[number];
  /** Прогресс внутри текущего тира, 0..1 */
  pct: number;
  /** Например «Золото II» */
  name: string;
}

/** ELO → тир + подуровень (III/II/I) + прогресс до следующего ранга. */
export function rankFor(elo: number): RankInfo {
  const idxRaw = TIERS.findIndex((t) => elo < t.max);
  const idx = idxRaw === -1 ? TIERS.length - 1 : idxRaw;
  const tier = TIERS[idx];
  const nextTier: (typeof TIERS)[number] | undefined = TIERS[idx + 1];
  const pct = Math.min(1, Math.max(0, (elo - tier.min) / (tier.max - tier.min)));
  const roman = pct < 0.34 ? 'III' : pct < 0.67 ? 'II' : 'I';
  return { tier, nextTier, pct, name: `${tier.name} ${roman}` };
}

export interface Achievement {
  icon: IconName;
  t: string;
  s: string;
  on: boolean;
}

/** Достижения игрока — только по реальным счётчикам (без дутых наград). */
export function playerAchievements(p: { total_games: number; total_tournament: number }): Achievement[] {
  return [
    { icon: 'fire', t: 'Первая игра', s: 'Дебют', on: p.total_games >= 1 },
    { icon: 'trophy-outline', t: 'Первый турнир', s: 'Турнир', on: p.total_tournament >= 1 },
    { icon: 'shield-outline', t: '10 игр', s: 'Стабильность', on: p.total_games >= 10 },
    {
      icon: 'target',
      t: '20 игр',
      s: p.total_games >= 20 ? 'Достигнуто' : `Ещё ${Math.max(0, 20 - p.total_games)} игр`,
      on: p.total_games >= 20,
    },
  ];
}
