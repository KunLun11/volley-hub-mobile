import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { api } from '../api/client';
import { SKILL_LEVELS, type GameList } from '../types';
import { Btn, Card, EmptyState, GameCard, Skeleton, contentStyle } from '../components/ui';
import { Field, Input, Select } from '../components/form';
import { useToast } from '../store';
import { colors, spacing } from '../theme';

/** Б1. Список открытых игр -> GET /games/?skill_level&date_from&date_to&status=1 */
export default function GamesListScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const [games, setGames] = useState<GameList[] | null>(null);
  const [level, setLevel] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    setGames(null);
    api
      .games({
        skill_level: level ? Number(level) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        status: 1,
      })
      .then(setGames)
      .catch((e) => {
        setGames([]);
        toast.push(
          e instanceof Error && e.message.includes('Failed') ? 'Проверьте соединение' : 'Не удалось загрузить игры',
          'error',
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, dateFrom, dateTo]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load]);

  const hasFilters = Boolean(level || dateFrom || dateTo);

  function onRefresh() {
    setRefreshing(true);
    load();
    setTimeout(() => setRefreshing(false), 700);
  }

  const levelOptions = [
    { label: 'Любой', value: '' },
    ...Object.entries(SKILL_LEVELS).map(([v, l]) => ({ label: `${v}. ${l}`, value: v })),
  ];

  return (
    <ScrollView
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View>
        <Text style={styles.h1}>Открытые игры</Text>
        <Text style={styles.sub}>Запись в один клик · уровень виден сразу · без чатов</Text>
      </View>

      <Card style={styles.filters}>
        <Field label="Уровень">
          <Select value={level} options={levelOptions} onChange={(v) => setLevel(String(v))} />
        </Field>
        <Field label="С даты" hint="Формат: ГГГГ-ММ-ДД">
          <Input value={dateFrom} onChangeText={setDateFrom} placeholder="2026-10-09" autoCapitalize="none" />
        </Field>
        <Field label="По дату" hint="Формат: ГГГГ-ММ-ДД">
          <Input value={dateTo} onChangeText={setDateTo} placeholder="2026-12-31" autoCapitalize="none" />
        </Field>
        <View style={styles.actions}>
          <Btn kind="secondary" onPress={load} block>
            Применить
          </Btn>
          {hasFilters ? (
            <Btn
              kind="ghost"
              onPress={() => {
                setLevel('');
                setDateFrom('');
                setDateTo('');
              }}
            >
              Сбросить
            </Btn>
          ) : null}
        </View>
      </Card>

      {games === null ? (
        <View style={{ gap: spacing.lg }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={168} />
          ))}
        </View>
      ) : games.length === 0 ? (
        <EmptyState
          text="Пока нет игр по вашим фильтрам"
          action={
            <Btn
              kind="secondary"
              onPress={() => {
                setLevel('');
                setDateFrom('');
                setDateTo('');
              }}
            >
              Сбросить фильтры
            </Btn>
          }
        />
      ) : (
        <View style={{ gap: spacing.lg }}>
          {games.map((g) => (
            <GameCard key={g.id} game={g} onPress={() => nav.navigate('GameDetails', { id: g.id })} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.textMain, fontSize: 28, fontWeight: '700' },
  sub: { color: colors.textSub, fontSize: 14, marginTop: 4 },
  filters: { gap: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
});
