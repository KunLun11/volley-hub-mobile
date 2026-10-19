import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { useNavigation } from '@react-navigation/native';

import { api } from '../api/client';
import type { GameList, Paginated } from '../types';
import {
  AppHeader,
  Btn,
  Card,
  EmptyState,
  GameStatusBadge,
  Icon,
  LevelBadge,
  Screen,
  Skeleton,
  Tabs,
  contentStyle,
  formatDate,
  formatMoney,
} from '../components/ui';
import { useToast } from '../store';
import { colors, fontDisplay, fontMono, spacing } from '../theme';

/** В2. Кабинет организатора: мои игры + статусы + действия (пагинация с бэкенда) */
const PAGE_SIZE = 20;

export default function OrganizerCabinetScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const [tab, setTab] = useState<string | number>('all');
  const [games, setGames] = useState<Paginated<GameList[]> | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(
    (targetPage = 1, showSkeleton = true) => {
      if (showSkeleton) setGames(null);
      api
        .organizedGamesPage({
          status: tab === 'all' ? undefined : Number(tab),
          page: targetPage,
          page_size: PAGE_SIZE,
        })
        .then((data) => {
          setGames(data);
          setPage(targetPage);
        })
        .catch(() => setGames({ count: 0, next: null, previous: null, results: [] }));
    },
    [tab],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const list = games?.results ?? [];
  const total = games?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function act(id: number, fn: (id: number) => Promise<unknown>, okMsg: string) {
    try {
      await fn(id);
      toast.push(okMsg, 'success');
      load(page, false);
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
            { value: 2, label: 'Запись закрыта' },
            { value: 3, label: 'Идёт' },
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
        ) : list.length === 0 ? (
          <EmptyState
            text="Здесь пока пусто"
            action={<Btn onPress={() => nav.navigate('CreateGame')}>Создать первую игру</Btn>}
          />
        ) : (
          <>
            <View style={{ gap: spacing.md }}>
              {list.map((g) => (
              <Card key={g.id} style={{ gap: spacing.md }}>
                <Pressable onPress={() => nav.navigate('ManageGame', { id: g.id })} style={{ gap: 6 }}>
                  <Text style={styles.title} numberOfLines={2}>
                    {g.title}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {formatDate(g.date_time)}
                  </Text>
                  <View style={styles.metaRow}>
                    <Icon name="map-marker-outline" size={14} color={colors.meta} />
                    <Text style={styles.meta} numberOfLines={1}>
                      {g.location.name}
                    </Text>
                  </View>
                  <View style={styles.rowBetween}>
                    <View style={{ flexShrink: 1, minWidth: 0 }}>
                      <LevelBadge level={g.skill_level} />
                    </View>
                    <Text style={styles.slots} numberOfLines={1}>
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
                      <Btn small onPress={() => act(g.id, api.startGame, 'Игра началась')}>
                        Начать
                      </Btn>
                      <Btn kind="danger" small onPress={() => act(g.id, api.cancelGame, 'Игра отменена')}>
                        Отменить
                      </Btn>
                    </>
                  ) : null}
                  {g.status === 2 ? (
                    <Btn small onPress={() => act(g.id, api.startGame, 'Игра началась')}>
                      Начать
                    </Btn>
                  ) : null}
                  {g.status === 2 || g.status === 3 ? (
                    <Btn kind="success" small onPress={() => nav.navigate('ManageGame', { id: g.id })}>
                      Итоги / счёт
                    </Btn>
                  ) : null}
                </View>
              </Card>
            ))}
            </View>
            {total > PAGE_SIZE ? (
              <View style={styles.pager}>
                <Btn kind="secondary" small disabled={!games?.previous} onPress={() => load(page - 1)}>
                  ← Назад
                </Btn>
                <Text style={styles.pagerText}>
                  Страница {page} из {totalPages}
                </Text>
                <Btn kind="secondary" small disabled={!games?.next} onPress={() => load(page + 1)}>
                  Вперёд →
                </Btn>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { color: colors.textMain, fontSize: 24, fontWeight: '700', flexShrink: 1, letterSpacing: -0.5, fontFamily: fontDisplay },
  title: { color: colors.textMain, fontSize: 17, fontWeight: '700', lineHeight: 22 },
  meta: { color: colors.textSub, fontSize: 13, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  pagerText: { color: colors.textSub, fontSize: 13, fontFamily: fontMono },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  slots: { color: colors.textSub, fontSize: 12.5, fontFamily: fontMono, flexShrink: 0 },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
