import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { api } from '../api/client';
import { SKILL_LEVELS, type GameList } from '../types';
import { Btn, Card, EmptyState, GameCard, Icon, Modal, Skeleton, contentStyle } from '../components/ui';
import { CheckboxRow, Field, Input } from '../components/form';
import { useToast } from '../store';
import { colors, fontMono, radius, spacing } from '../theme';

/** Б1. Список открытых игр: поиск + поп-апы «Даты» и «Уровень», фильтрация клиентская. */
export default function GamesListScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const [games, setGames] = useState<GameList[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /* ---- Фильтры (как в вебе: поиск + поп-апы «Даты» и «Уровень») ---- */
  const [search, setSearch] = useState('');
  const [levels, setLevels] = useState<number[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [levelOpen, setLevelOpen] = useState(false);

  /** С сервера берём только открытые игры — фильтрация клиентская, как в вебе. */
  const load = useCallback(() => {
    setGames(null);
    api
      .games({ status: 1 })
      .then(setGames)
      .catch((e) => {
        setGames([]);
        toast.push(
          e instanceof Error && e.message.includes('Failed') ? 'Проверьте соединение' : 'Не удалось загрузить игры',
          'error',
        );
      });
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const list = useMemo(() => {
    if (!games) return [];
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    return games.filter((g) => {
      if (q && !`${g.title} ${g.location?.name ?? ''}`.toLowerCase().includes(q)) return false;
      if (levels.length && !levels.includes(g.skill_level)) return false;
      if (onlyFree && g.capacity - g.booked_count <= 0) return false;
      const t = new Date(g.date_time).getTime();
      if (from !== null && !Number.isNaN(from) && t < from) return false;
      if (to !== null && !Number.isNaN(to) && t > to) return false;
      return true;
    });
  }, [games, search, levels, dateFrom, dateTo, onlyFree]);

  function toggleLevel(l: number) {
    setLevels((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l].sort((a, b) => a - b)));
  }

  function resetFilters() {
    setSearch('');
    setLevels([]);
    setDateFrom('');
    setDateTo('');
    setOnlyFree(false);
  }

  const filterCount =
    (search ? 1 : 0) + (levels.length ? 1 : 0) + (dateFrom || dateTo ? 1 : 0) + (onlyFree ? 1 : 0);

  /** 2026-03-10 -> 10.03 */
  function shortDate(d: string) {
    if (!d) return '';
    const [, m, day] = d.split('-');
    return m && day ? `${day}.${m}` : d;
  }

  const datesLabel = dateFrom || dateTo ? `${shortDate(dateFrom) || '…'} — ${shortDate(dateTo) || '…'}` : 'Любые';
  const levelsLabel = levels.length ? `Выбрано: ${levels.length}` : 'Любой';

  function onRefresh() {
    setRefreshing(true);
    load();
    setTimeout(() => setRefreshing(false), 700);
  }

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

      {/* Фильтры: поиск с лупой + поп-апы «Даты» и «Уровень» */}
      <Card style={styles.widget}>
        <View style={styles.wRow}>
          <Icon name="magnify" size={18} color={colors.meta} />
          <TextInput
            style={styles.wInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Название или зал"
            placeholderTextColor={colors.meta}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search ? (
            <Pressable style={styles.wClear} onPress={() => setSearch('')} hitSlop={8}>
              <Icon name="close" size={15} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.wSep} />
        <View style={styles.wSlots}>
          <Pressable style={styles.slot} onPress={() => setDatesOpen(true)}>
            <Icon name="calendar-blank-outline" size={19} color={colors.accent} />
            <View style={styles.slotTxt}>
              <Text style={styles.slotLabel}>Даты</Text>
              <Text style={[styles.slotValue, (dateFrom || dateTo) && styles.slotValueOn]} numberOfLines={1}>
                {datesLabel}
              </Text>
            </View>
          </Pressable>
          <Pressable style={[styles.slot, styles.slotDivider]} onPress={() => setLevelOpen(true)}>
            <Icon name="target" size={19} color={colors.accent} />
            <View style={styles.slotTxt}>
              <Text style={styles.slotLabel}>Уровень</Text>
              <Text style={[styles.slotValue, levels.length > 0 && styles.slotValueOn]} numberOfLines={1}>
                {levelsLabel}
              </Text>
            </View>
          </Pressable>
        </View>
      </Card>

      {games === null ? (
        <View style={{ gap: spacing.lg }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={168} />
          ))}
        </View>
      ) : (
        <>
          <View style={styles.resultBar}>
            <Text style={styles.resultLine}>
              Найдено <Text style={styles.resultNum}>{list.length}</Text>
            </Text>
            {filterCount > 0 ? (
              <Pressable onPress={resetFilters} hitSlop={8}>
                <Text style={styles.reset}>Сбросить фильтры</Text>
              </Pressable>
            ) : null}
          </View>

          {list.length === 0 ? (
            <EmptyState
              text="Пока нет игр по вашим фильтрам"
              action={
                <Btn kind="secondary" onPress={resetFilters}>
                  Сбросить фильтры
                </Btn>
              }
            />
          ) : (
            <View style={{ gap: spacing.lg }}>
              {list.map((g) => (
                <GameCard key={g.id} game={g} onPress={() => nav.navigate('GameDetails', { id: g.id })} />
              ))}
            </View>
          )}
        </>
      )}

      {/* Поп-ап «Даты» */}
      <Modal visible={datesOpen} onClose={() => setDatesOpen(false)}>
        <Text style={styles.mTitle}>Даты</Text>
        <Text style={styles.mSub}>Показываем игры в выбранном диапазоне</Text>
        <View style={styles.mBody}>
          <Field label="С какой" hint="Формат: ГГГГ-ММ-ДД">
            <Input
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="2026-03-01"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>
          <Field label="По какую" hint="Формат: ГГГГ-ММ-ДД">
            <Input
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="2026-03-31"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>
        </View>
        <View style={styles.mActions}>
          <Btn block onPress={() => setDatesOpen(false)}>
            Готово
          </Btn>
          <Btn
            kind="ghost"
            onPress={() => {
              setDateFrom('');
              setDateTo('');
            }}
          >
            Сбросить
          </Btn>
        </View>
      </Modal>

      {/* Поп-ап «Уровень» */}
      <Modal visible={levelOpen} onClose={() => setLevelOpen(false)}>
        <Text style={styles.mTitle}>Уровень</Text>
        <Text style={styles.mSub}>Можно выбрать несколько — покажем игры этих уровней</Text>
        <View style={styles.pillGroup}>
          {Object.entries(SKILL_LEVELS).map(([v, l]) => {
            const lvl = Number(v);
            const on = levels.includes(lvl);
            return (
              <Pressable key={v} onPress={() => toggleLevel(lvl)} style={[styles.pill, on && styles.pillOn]}>
                <Text style={[styles.pillText, on && styles.pillTextOn]}>
                  {lvl} · {l}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <CheckboxRow checked={onlyFree} onToggle={() => setOnlyFree((v) => !v)}>
            Только со свободными местами
          </CheckboxRow>
        </View>
        <View style={styles.mActions}>
          <Btn block onPress={() => setLevelOpen(false)}>
            Готово
          </Btn>
          <Btn
            kind="ghost"
            onPress={() => {
              setLevels([]);
              setOnlyFree(false);
            }}
          >
            Сбросить
          </Btn>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.textMain, fontSize: 28, fontWeight: '700' },
  sub: { color: colors.textSub, fontSize: 14, marginTop: 4 },

  /* --- Виджет фильтров --- */
  widget: { padding: 0, overflow: 'hidden' },
  wRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  wInput: {
    flex: 1,
    minWidth: 0,
    color: colors.fg,
    fontSize: 15,
    padding: 0,
  },
  wClear: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wSep: { height: 1, backgroundColor: colors.border },
  wSlots: { flexDirection: 'row', alignItems: 'stretch' },
  slot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  slotDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  slotTxt: { flex: 1, minWidth: 0 },
  slotLabel: {
    color: colors.meta,
    fontSize: 10.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  slotValue: { color: colors.fg, fontSize: 14, fontWeight: '600', marginTop: 2 },
  slotValueOn: { color: colors.accent },

  /* --- Строка результата --- */
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  resultLine: { color: colors.muted, fontSize: 13 },
  resultNum: { color: colors.fg, fontFamily: fontMono },
  reset: { color: colors.accent, fontSize: 13, fontWeight: '600' },

  /* --- Поп-апы --- */
  mTitle: { color: colors.fg, fontSize: 18, fontWeight: '700' },
  mSub: { color: colors.muted, fontSize: 13, marginTop: 4 },
  mBody: { marginTop: spacing.lg, gap: spacing.md },
  mActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.xl },
  pillGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillOn: { borderColor: colors.accent, backgroundColor: colors.infoBg },
  pillText: { color: colors.textSub, fontSize: 13.5, fontWeight: '500' },
  pillTextOn: { color: colors.accent, fontWeight: '700' },
});
