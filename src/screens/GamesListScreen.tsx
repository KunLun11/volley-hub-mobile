import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/Text';
import { useNavigation } from '@react-navigation/native';

import { api } from '../api/client';
import { SKILL_LEVELS, type GameList, type Paginated } from '../types';
import {
  Btn,
  Card,
  EmptyState,
  GameCard,
  Icon,
  Modal,
  Skeleton,
  levelIcon,
  useTabContentStyle,
} from '../components/ui';
import { CheckboxRow, Field, Input } from '../components/form';
import { useToast } from '../store';
import { colors, fontDisplay, fontMono, radius, spacing } from '../theme';

/** Б1. Список открытых игр: поиск + поп-апы «Даты» и «Уровень», пагинация с бэкенда. */
const PAGE_SIZE = 20;

export default function GamesListScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const contentStyle = useTabContentStyle();
  const [games, setGames] = useState<Paginated<GameList[]> | null>(null);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  /* ---- Фильтры (как в вебе: поиск + поп-апы «Даты» и «Уровень») ---- */
  const [search, setSearch] = useState('');
  const [levels, setLevels] = useState<number[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [levelOpen, setLevelOpen] = useState(false);

  /** Фильтры и пагинация считаются на сервере. */
  const load = useCallback(
    (targetPage = 1, showSkeleton = true) => {
      if (showSkeleton) setGames(null);
      api
        .gamesPage({
          board: true,
          search: search.trim() || undefined,
          skill_level: levels.length ? levels.join(',') : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          only_free: onlyFree || undefined,
          page: targetPage,
          page_size: PAGE_SIZE,
        })
        .then((data) => {
          setGames(data);
          setPage(targetPage);
        })
        .catch((e) => {
          setGames({ count: 0, next: null, previous: null, results: [] });
          toast.push(
            e instanceof Error && e.message.includes('Failed') ? 'Проверьте соединение' : 'Не удалось загрузить игры',
            'error',
          );
        });
    },
    [search, levels, dateFrom, dateTo, onlyFree, toast],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const list = games?.results ?? [];
  const total = games?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
    load(page, false);
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
        <View style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}>
          <Btn kind="secondary" small onPress={() => nav.navigate('MatchHistory')}>
            История матчей
          </Btn>
        </View>
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
              Найдено <Text style={styles.resultNum}>{total}</Text>
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
            <>
              <View style={{ gap: spacing.lg }}>
                {list.map((g) => (
                  <GameCard key={g.id} game={g} onPress={() => nav.navigate('GameDetails', { id: g.id })} />
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
                <Icon name={levelIcon(lvl)} size={13} color={on ? colors.accent : colors.meta} />
                <Text style={[styles.pillText, on && styles.pillTextOn]} numberOfLines={1}>
                  {l}
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
  h1: { color: colors.textMain, fontSize: 26, fontWeight: '700', letterSpacing: -0.5, fontFamily: fontDisplay },
  sub: { color: colors.textSub, fontSize: 13.5, marginTop: 4, lineHeight: 19 },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  pagerText: { color: colors.textSub, fontSize: 13, fontFamily: fontMono },

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
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  slotValue: { color: colors.fg, fontSize: 13, fontWeight: '600', marginTop: 2, fontFamily: fontMono },
  slotValueOn: { color: colors.accent },

  /* --- Строка результата --- */
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  resultLine: { color: colors.muted, fontSize: 13, flexShrink: 1 },
  resultNum: { color: colors.fg, fontFamily: fontMono },
  reset: { color: colors.accent, fontSize: 13, fontWeight: '600', flexShrink: 0 },

  /* --- Поп-апы --- */
  mTitle: { color: colors.fg, fontSize: 18, fontWeight: '700' },
  mSub: { color: colors.muted, fontSize: 13, marginTop: 4 },
  mBody: { marginTop: spacing.lg, gap: spacing.md },
  mActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.xl },
  pillGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  pillOn: { borderColor: 'rgba(59,130,246,0.55)', backgroundColor: colors.infoBg },
  pillText: { color: colors.textSub, fontSize: 13, fontWeight: '500', flexShrink: 1 },
  pillTextOn: { color: colors.accent, fontWeight: '700' },
});
