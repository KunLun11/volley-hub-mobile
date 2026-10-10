import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { api } from '../api/client';
import type { MyGame } from '../types';
import {
  Btn,
  EmptyState,
  GameCard,
  ParticipantStatusBadge,
  Skeleton,
  Tabs,
  contentStyle,
  formatMoney,
} from '../components/ui';
import { colors, fontMono, spacing } from '../theme';
import { useToast } from '../store';

/** Б4. Мои игры -> GET /games/my-games/ */
type Tab = 'all' | 'upcoming' | 'past';

export default function MyGamesScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const [games, setGames] = useState<MyGame[] | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    api
      .myGames()
      .then(setGames)
      .catch(() => setGames([]));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = Date.now();
  const filtered = (games ?? []).filter((m) => {
    if (tab === 'upcoming') return new Date(m.game.date_time).getTime() > now;
    if (tab === 'past') return new Date(m.game.date_time).getTime() <= now;
    return true;
  });

  return (
    <ScrollView
      contentContainerStyle={contentStyle}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
            setTimeout(() => setRefreshing(false), 700);
          }}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.h1}>Мои игры</Text>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: 'all', label: 'Все' },
          { value: 'upcoming', label: 'Предстоящие' },
          { value: 'past', label: 'Прошедшие' },
        ]}
      />

      {games === null ? (
        <View style={{ gap: spacing.lg }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={150} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          text={tab === 'upcoming' ? 'Впереди пусто — самое время записаться!' : 'Игр в этой категории пока нет'}
          action={<Btn onPress={() => nav.navigate('Tabs', { screen: 'Games' })}>Смотреть открытые игры</Btn>}
        />
      ) : (
        <View style={{ gap: spacing.lg }}>
          {filtered.map((m) => {
            const past = new Date(m.game.date_time).getTime() <= now;
            return (
              <View key={m.participant_id} style={{ gap: spacing.sm }}>
                <GameCard game={m.game} onPress={() => nav.navigate('GameDetails', { id: m.game.id })} />
                <View style={styles.metaRow}>
                  <ParticipantStatusBadge status={m.participant_status} />
                  <Text style={styles.metaText}>{formatMoney(m.game.price)}</Text>
                </View>
                {past && m.participant_status !== 4 ? (
                  <Btn
                    kind="secondary"
                    small
                    onPress={() => toast.push('Оценка уровня игры — в разработке', 'info')}
                  >
                    Оценить уровень игры →
                  </Btn>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.textMain, fontSize: 28, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaText: { color: colors.gold, fontWeight: '700', fontFamily: fontMono },
});
