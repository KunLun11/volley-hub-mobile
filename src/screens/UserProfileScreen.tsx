import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { useNavigation, useRoute } from '@react-navigation/native';

import { api, ApiError } from '../api/client';
import type { OrganizerProfile, PlayerProfile, UserProfileResponse } from '../types';
import { POSITIONS, SKILL_LEVELS } from '../types';
import {
  AppHeader,
  Avatar,
  Bar,
  Btn,
  Card,
  EmptyState,
  Icon,
  Screen,
  Skeleton,
  contentStyle,
} from '../components/ui';
import { playerAchievements, rankFor } from '../lib/profile';
import { useToast } from '../store';
import { colors, fontDisplay, fontMono, radius, spacing } from '../theme';

/** Чужой профиль (игрока или организатора) — read-only.
 *
 *  Открывается по UUID пользователя (route.params.id). Бэкенд сам определяет
 *  тип профиля (player | organizer), клиент лишь рисует нужный вид. Смотреть
 *  может любой аутентифицированный пользователь — и игрок, и организатор.
 */
export default function UserProfileScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const id = String(route.params?.id ?? '');
  const toast = useToast();

  const [data, setData] = useState<UserProfileResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound'>('loading');

  useEffect(() => {
    if (!id) {
      setStatus('notfound');
      return;
    }
    let alive = true;
    setStatus('loading');
    api
      .userProfile(id)
      .then((res) => {
        if (!alive) return;
        setData(res);
        setStatus('ready');
      })
      .catch((e) => {
        if (!alive) return;
        setStatus('notfound');
        // 404 — это нормальный «профиль не найден», остальное — сбой сети
        if (!(e instanceof ApiError && e.status === 404)) {
          toast.push('Не удалось загрузить профиль', 'error');
        }
      });
    return () => {
      alive = false;
    };
  }, [id, toast]);

  const back = () => (nav.canGoBack() ? nav.goBack() : nav.navigate('Tabs', { screen: 'Games' }));

  return (
    <Screen>
      <AppHeader />
      <ScrollView contentContainerStyle={contentStyle}>
        <Pressable onPress={back}>
          <Text style={styles.back}>← Назад</Text>
        </Pressable>

        {status === 'loading' ? (
          <>
            <Skeleton height={180} />
            <Skeleton height={120} />
          </>
        ) : status === 'notfound' || !data ? (
          <EmptyState
            text="Пользователь ещё не заполнил профиль."
            action={<Btn kind="secondary" onPress={() => nav.navigate('Tabs', { screen: 'Games' })}>К списку игр</Btn>}
          />
        ) : data.type === 'organizer' ? (
          <OrganizerProfileView p={data.profile as OrganizerProfile} />
        ) : (
          <PlayerProfileView p={data.profile as PlayerProfile} />
        )}
      </ScrollView>
    </Screen>
  );
}

/** Read-only профиль игрока: рейтинг ELO, ранг, статистика, достижения. */
function PlayerProfileView({ p }: { p: PlayerProfile }) {
  const name = `${p.first_name} ${p.last_name}`.trim() || 'Игрок';
  const { tier, nextTier, pct, name: rankName } = rankFor(p.elo_rating);
  const achievements = playerAchievements(p);

  return (
    <>
      <Text style={styles.h1}>Профиль игрока</Text>

      <Card style={styles.head}>
        <Avatar name={name} src={p.photo} size={72} />
        <View style={styles.headInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {p.city || 'город не указан'}
          </Text>
          <View style={styles.badges}>
            <View style={styles.pillInfo}>
              <Text style={styles.pillInfoText} numberOfLines={1}>
                {SKILL_LEVELS[Number(p.skill_level) as keyof typeof SKILL_LEVELS] ?? '—'}
              </Text>
            </View>
            <View style={styles.pillMuted}>
              <Text style={styles.pillMutedText} numberOfLines={1}>
                {POSITIONS[Number(p.position) as keyof typeof POSITIONS] ?? 'Амплуа не указано'}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      <Card style={styles.rank}>
        <View style={styles.rankTop}>
          <View style={styles.rankBadge}>
            <View style={styles.rankIc}>
              <Icon name="medal-outline" size={26} color={colors.gold} />
            </View>
            <View style={styles.rankInfo}>
              <Text style={styles.rankName} numberOfLines={1}>
                {rankName}
              </Text>
              <Text style={styles.rankSub} numberOfLines={1}>
                {nextTier ? `до ${nextTier.name} ${Math.max(0, tier.max - p.elo_rating)} ELO` : 'максимальный ранг'}
              </Text>
            </View>
          </View>
          <Text style={styles.rankElo} numberOfLines={1} accessibilityLabel={`Рейтинг ELO ${p.elo_rating}`}>
            {p.elo_rating}
          </Text>
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <Bar value={Math.round(pct * 100)} max={100} variant="gold" />
          <View style={styles.rankLabels}>
            <Text style={styles.rankLabelText}>
              {tier.name} · {tier.min}
            </Text>
            <Text style={styles.rankLabelText}>{nextTier ? `${nextTier.name} · ${tier.max}` : 'MAX'}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Stat num={p.elo_rating} cap="Рейтинг ELO" accent />
        <Stat num={p.total_games} cap="Всего игр" />
        <Stat num={p.total_tournament} cap="Турниры" />
      </View>

      <Card style={{ gap: spacing.md }}>
        <View style={styles.rowBetween}>
          <Text style={styles.h3}>Достижения</Text>
          <Text style={styles.metaNum}>
            {achievements.filter((a) => a.on).length} / {achievements.length}
          </Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          {achievements.map((a) => (
            <View key={a.t} style={[styles.ach, !a.on && styles.achLocked]}>
              <View style={styles.achIc}>
                <Icon name={a.on ? a.icon : 'lock-outline'} size={18} color={a.on ? colors.gold : colors.meta} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.achT, !a.on && styles.achLockedText]}>{a.t}</Text>
                <Text style={styles.achS}>{a.s}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </>
  );
}

/** Read-only профиль организатора: рейтинг, организованные/отменённые игры. */
function OrganizerProfileView({ p }: { p: OrganizerProfile }) {
  const name = `${p.first_name} ${p.last_name}`.trim() || 'Организатор';

  return (
    <>
      <Text style={styles.h1}>Профиль организатора</Text>

      <Card style={styles.head}>
        <Avatar name={name} src={p.photo} size={72} />
        <View style={styles.headInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {p.city || 'город не указан'}
          </Text>
          <View style={styles.badges}>
            <View style={styles.pillInfo}>
              <Text style={styles.pillInfoText}>Организатор</Text>
            </View>
            <View style={styles.pillMuted}>
              <Text style={styles.pillMutedText}>Рейтинг {p.organizer_rating}</Text>
            </View>
          </View>
        </View>
      </Card>

      {p.description ? (
        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.h3}>О себе</Text>
          <Text style={styles.body}>{p.description}</Text>
        </Card>
      ) : null}

      <View style={styles.statsGrid}>
        <Stat num={p.total_games} cap="Игры" />
        <Stat num={p.organizer_rating} cap="Рейтинг" accent />
        <Stat num={p.games_cancelled} cap="Отменено" />
      </View>
    </>
  );
}

function Stat({ num, cap, accent }: { num: number | string; cap: string; accent?: boolean }) {
  return (
    <Card style={styles.stat}>
      <Text style={[styles.statNum, accent && { color: colors.gold }]} numberOfLines={1}>
        {num}
      </Text>
      <Text style={styles.statCap} numberOfLines={1}>
        {cap}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  h1: { color: colors.textMain, fontSize: 26, fontWeight: '700', letterSpacing: -0.5, fontFamily: fontDisplay },
  h3: { color: colors.textMain, fontSize: 17, fontWeight: '700', fontFamily: fontDisplay },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  headInfo: { flex: 1, minWidth: 0, gap: 5 },
  name: { color: colors.textMain, fontSize: 21, fontWeight: '700', letterSpacing: -0.4, fontFamily: fontDisplay },
  sub: { color: colors.textSub, fontSize: 13.5 },
  badges: { flexDirection: 'row', gap: spacing.sm, marginTop: 2 },
  pillInfo: {
    backgroundColor: colors.infoBg,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexShrink: 1,
    minWidth: 0,
  },
  pillInfoText: { color: colors.primary, fontSize: 11.5, fontWeight: '600' },
  pillMuted: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexShrink: 1,
    minWidth: 0,
  },
  pillMutedText: { color: colors.muted, fontSize: 11.5, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  metaNum: { color: colors.meta, fontSize: 12, fontFamily: fontMono },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: '30%', minWidth: 0, alignItems: 'center', padding: spacing.md },
  statNum: { color: colors.accent, fontSize: 22, fontWeight: '700', fontFamily: fontMono },
  statCap: { color: colors.textSub, fontSize: 10.5, marginTop: 4, textAlign: 'center' },
  rank: {
    borderWidth: 1,
    borderColor: 'rgba(245,165,36,0.32)',
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: 0,
  },
  rankTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 },
  rankInfo: { flex: 1, minWidth: 0 },
  rankIc: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,165,36,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245,165,36,0.38)',
  },
  rankName: { color: colors.textMain, fontSize: 18, fontWeight: '700' },
  rankSub: { color: colors.meta, fontSize: 11, fontFamily: fontMono, marginTop: 2 },
  rankElo: { color: colors.gold, fontSize: 30, fontWeight: '800', fontFamily: fontMono, flexShrink: 0 },
  rankLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, gap: spacing.sm },
  rankLabelText: { color: colors.textSub, fontSize: 10.5, fontFamily: fontMono, flexShrink: 1 },
  ach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
  },
  achLocked: { opacity: 0.5 },
  achIc: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.10)',
  },
  achT: { color: colors.textMain, fontSize: 14, fontWeight: '600' },
  achLockedText: { color: colors.textSub },
  achS: { color: colors.textSub, fontSize: 12 },
  body: { color: colors.textSub, fontSize: 14, lineHeight: 20 },
});
