import React, { useEffect, useMemo, useState } from 'react';
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
  Tabs,
  contentStyle,
  formatDate,
  formatMoney,
} from '../components/ui';
import { useToast } from '../store';
import { colors, spacing } from '../theme';

/** В2. Кабинет организатора: мои игры + статусы + действия */
export default function OrganizerCabinetScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const [tab, setTab] = useState<string | number>('all');
  const [games, setGames] = useState<GameList[] | null>(null);

  const load = () => {
    api
      .organizedGames()
      .then(setGames)
      .catch(() => setGames([]));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => (games ?? []).filter((g) => tab === 'all' || g.status === tab),
    [games, tab],
  );

  async function act(id: number, fn: (id: number) => Promise<unknown>, okMsg: string) {
    try {
      await fn(id);
      toast.push(okMsg, 'success');
      load();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Ошибка', 'error');
    }
  }

  return (
    <Screen>
      <AppHeader />
      <ScrollView contentContainerStyle={contentStyle}>
        <View style={styles.head}>
          <Text style={styles.h1}>Кабинет организатора</Text>
        </View>
        <Btn onPress={() => nav.navigate('CreateGame')} block>
          + Создать игру
        </Btn>

        <Tabs<string | number>
          value={tab}
          onChange={setTab}
          items={[
            { value: 'all', label: 'Все' },
            { value: 0, label: 'Черновики' },
            { value: 1, label: 'Опубликованные' },
            { value: 4, label: 'Завершённые' },
            { value: 5, label: 'Отменённые' },
          ]}
        />

        {games === null ? (
          <View style={{ gap: spacing.md }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={120} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            text="Здесь пока пусто"
            action={<Btn onPress={() => nav.navigate('CreateGame')}>Создать первую игру</Btn>}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {filtered.map((g) => (
              <Card key={g.id} style={{ gap: spacing.md }}>
                <Pressable onPress={() => nav.navigate('ManageGame', { id: g.id })} style={{ gap: 6 }}>
                  <Text style={styles.title}>{g.title}</Text>
                  <Text style={styles.meta}>{formatDate(g.date_time)}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    📍 {g.location.name}
                  </Text>
                  <View style={styles.rowBetween}>
                    <LevelBadge level={g.skill_level} />
                    <Text style={styles.slots}>
                      {g.booked_count}/{g.capacity} · {formatMoney(g.price)}
                    </Text>
                  </View>
                  <View style={{ marginTop: 4 }}>
                    <GameStatusBadge status={g.status} />
                  </View>
                </Pressable>

                <View style={styles.actions}>
                  {g.status === 0 ? (
                    <>
                      <Btn kind="secondary" small onPress={() => nav.navigate('CreateGame')}>
                        Редактировать
                      </Btn>
                      <Btn small onPress={() => act(g.id, api.publishGame, 'Игра опубликована')}>
                        Опубликовать
                      </Btn>
                    </>
                  ) : null}
                  {g.status === 1 ? (
                    <>
                      <Btn kind="secondary" small onPress={() => nav.navigate('ManageGame', { id: g.id })}>
                        Участники
                      </Btn>
                      <Btn kind="danger" small onPress={() => act(g.id, api.cancelGame, 'Игра отменена')}>
                        Отменить
                      </Btn>
                    </>
                  ) : null}
                  {g.status === 2 || g.status === 3 ? (
                    <Btn kind="success" small onPress={() => act(g.id, api.completeGame, 'Игра завершена — ELO пересчитан')}>
                      Завершить
                    </Btn>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { color: colors.textMain, fontSize: 26, fontWeight: '700', flexShrink: 1 },
  title: { color: colors.textMain, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.textSub, fontSize: 13 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  slots: { color: colors.textSub, fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
