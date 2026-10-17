import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { api } from '../api/client';
import type { GameList } from '../types';
import {
  AppHeader,
  Btn,
  Card,
  EmptyState,
  GameStatusBadge,
  LevelBadge,
  Screen,
  Skeleton,
  contentStyle,
  formatDate,
} from '../components/ui';
import { colors, fontMono, spacing } from '../theme';

/** История матчей: завершённые игры с результатом и счётом партий. */
export default function MatchHistoryScreen() {
  const nav = useNavigation<any>();
  const [games, setGames] = useState<GameList[] | null>(null);

  useEffect(() => {
    api
      .gameHistory()
      .then(setGames)
      .catch(() => setGames([]));
  }, []);

  return (
    <Screen>
      <AppHeader />
      <ScrollView contentContainerStyle={contentStyle}>
        <Pressable onPress={() => nav.navigate('Tabs', { screen: 'Games' })}>
          <Text style={styles.back}>← Все игры</Text>
        </Pressable>

        <View>
          <Text style={styles.h1}>История матчей</Text>
          <Text style={styles.sub}>
            Завершённые игры с итогом и счётом партий. Победители +20 ELO, проигравшие −20.
          </Text>
        </View>

        {games === null ? (
          <View style={{ gap: spacing.lg }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={150} />
            ))}
          </View>
        ) : games.length === 0 ? (
          <EmptyState
            text="Завершённых матчей пока нет"
            action={<Btn onPress={() => nav.navigate('Tabs', { screen: 'Games' })}>Смотреть игры</Btn>}
          />
        ) : (
          <View style={{ gap: spacing.lg }}>
            {games.map((g) => {
              const sets = g.set_scores ?? [];
              const hasScore = sets.length > 0;
              const hasResult = g.winner_team != null;
              return (
                <Pressable key={g.id} onPress={() => nav.navigate('GameDetails', { id: g.id })}>
                  <Card style={{ gap: spacing.sm }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.title}>{g.title}</Text>
                      <GameStatusBadge status={g.status} />
                    </View>
                    <Text style={styles.meta}>
                      {formatDate(g.date_time)} · {g.location.name}
                    </Text>

                    {hasResult ? (
                      <View style={styles.scoreBox}>
                        <View style={styles.scoreRow}>
                          <Text
                            style={[
                              styles.team,
                              g.winner_team === 1 && { color: colors.success, fontWeight: '700' },
                            ]}
                          >
                            Команда 1{g.winner_team === 1 ? ' 🏆' : ''}
                          </Text>
                          <Text style={styles.score}>
                            {hasScore ? `${g.team_1_sets_won ?? 0} : ${g.team_2_sets_won ?? 0}` : '—'}
                          </Text>
                          <Text
                            style={[
                              styles.team,
                              { textAlign: 'right' },
                              g.winner_team === 2 && { color: colors.success, fontWeight: '700' },
                            ]}
                          >
                            {g.winner_team === 2 ? '🏆 ' : ''}Команда 2
                          </Text>
                        </View>
                        {hasScore ? (
                          <Text style={styles.sets}>{sets.map((s) => `${s.team_1}:${s.team_2}`).join(' · ')}</Text>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={styles.muted}>Результат не указан</Text>
                    )}

                    <View style={styles.rowBetween}>
                      <LevelBadge level={g.skill_level} />
                      <Text style={styles.muted}>ELO ±20</Text>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  h1: { color: colors.textMain, fontSize: 28, fontWeight: '700' },
  sub: { color: colors.textSub, fontSize: 13, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { color: colors.textMain, fontSize: 17, fontWeight: '700', flex: 1 },
  meta: { color: colors.textSub, fontSize: 13 },
  muted: { color: colors.textSub, fontSize: 12 },
  scoreBox: { backgroundColor: colors.surfaceSoft, borderRadius: 12, padding: spacing.md, gap: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  team: { color: colors.textSub, fontSize: 14, flex: 1 },
  score: { color: colors.gold, fontSize: 20, fontWeight: '700', fontFamily: fontMono },
  sets: { color: colors.muted, fontSize: 12, fontFamily: fontMono, letterSpacing: 1 },
});
