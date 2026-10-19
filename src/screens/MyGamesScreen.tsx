import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
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
  useTabContentStyle,
  formatMoney,
} from '../components/ui';
import { colors, fontMono, spacing } from '../theme';
import { useToast } from '../store';

/** Б4. Мои игры -> GET /games/my-games/ */
type Tab = 'all' | 'upcoming' | 'past';

export default function MyGamesScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const contentStyle = useTabContentStyle();
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

  const submitReview = async (gameId: number, matched: boolean) => {
    try {
      await api.submitReview(gameId, matched);
      toast.push('Спасибо! Отметка сохранена', 'success');
      load();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Не удалось сохранить оценку', 'error');
    }
  };

  const rateGame = (gameId: number) => {
    Alert.alert('Уровень игры', 'Совпал ли уровень игры с ожиданиями?', [
      { text: 'Совпало', onPress: () => submitReview(gameId, true) },
      { text: 'Не совпало', onPress: () => submitReview(gameId, false) },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

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
                  <Text style={styles.metaText} numberOfLines={1}>
                    {formatMoney(m.game.price)}
                  </Text>
                </View>
                {past && m.participant_status !== 4 && m.participant_status !== 5 ? (
                  m.has_review ? (
                    <Text style={styles.reviewed}>Уровень оценён</Text>
                  ) : (
                    <Btn kind="secondary" small onPress={() => rateGame(m.game.id)}>
                      Оценить уровень игры →
                    </Btn>
                  )
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
  h1: { color: colors.textMain, fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  metaText: { color: colors.gold, fontWeight: '700', fontFamily: fontMono, flexShrink: 0 },
  reviewed: { color: colors.success, fontSize: 13, fontWeight: '600' },
});
