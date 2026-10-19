import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

import { api } from '../api/client';
import { SKILL_LEVELS, type GameDetail, type GameList } from '../types';
import {
  AppHeader,
  Avatar,
  Bar,
  Banner,
  Btn,
  Card,
  GameStatusBadge,
  GenderText,
  Icon,
  KV,
  LevelBadge,
  Modal,
  Screen,
  Skeleton,
  contentStyle,
  formatDate,
  formatMoney,
} from '../components/ui';
import { formatMs, useAuth, useCountdown, useToast } from '../store';
import ScoreEntry from '../components/ScoreEntry';
import { colors, fontDisplay, fontMono, radius, spacing } from '../theme';

interface ParticipantLite {
  id: number;
  /** id профиля игрока (совпадает с responsible.id). */
  player_id?: number;
  player_name: string;
  player_elo: number;
  status: number;
  player_user_id?: string | null;
  team?: number | null;
  result?: number;
  elo_before?: number | null;
  elo_after?: number | null;
}

/** Б2. Карточка игры + Б3. Оплата (MVP: перевод по номеру). */
export default function GameDetailsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const gid = Number(route.params?.id ?? 1);
  const toast = useToast();
  const { isAuth } = useAuth();

  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [short, setShort] = useState<GameList | null>(null);
  const [participants, setParticipants] = useState<ParticipantLite[]>([]);
  const [myStatus, setMyStatus] = useState<'none' | 'registered' | 'confirmed'>('none');
  const [busy, setBusy] = useState(false);
  const [fullModal, setFullModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () => {
    api.gameDetail(gid).then(setDetail).catch(() => undefined);
    api
      .games({})
      .then((list) => setShort(list.find((g) => g.id === gid) ?? null))
      .catch(() => undefined);
    api
      .participants(gid)
      .then((p) => setParticipants(p as unknown as ParticipantLite[]))
      .catch(() => undefined);
    if (isAuth) {
      api
        .myGames({ game: gid })
        .then((mine) => {
          const m = mine.find((x) => x.game.id === gid);
          if (m) setMyStatus(m.participant_status >= 2 ? 'confirmed' : 'registered');
          else setMyStatus('none');
        })
        .catch(() => undefined);
    }
  };

  useEffect(load, [gid, isAuth]); // eslint-disable-line

  const free = detail ? Math.max(0, (short?.capacity ?? detail.capacity) - detail.booked_count) : 0;
  const full = detail ? free === 0 : false;
  const isOpen = detail?.status === 1;

  const deadlineLeft = useCountdown(detail?.date_time, myStatus !== 'none' && isOpen);

  const ratingStats = useMemo(() => {
    const elos = participants.map((p) => p.player_elo);
    if (!elos.length) return null;
    const avg = Math.round(elos.reduce((a, b) => a + b, 0) / elos.length);
    const spread = Math.max(...elos) - Math.min(...elos);
    return { avg, spread };
  }, [participants]);

  /** Игроки делятся на команды по 6 человек — группируем для отображения. */
  const teamGroups = useMemo(() => {
    const groups = new Map<number, ParticipantLite[]>();
    const unassigned: ParticipantLite[] = [];
    for (const p of participants) {
      if (p.team == null) {
        unassigned.push(p);
        continue;
      }
      const list = groups.get(p.team) ?? [];
      list.push(p);
      groups.set(p.team, list);
    }
    return {
      groups: [...groups.entries()].sort((a, b) => a[0] - b[0]),
      unassigned,
    };
  }, [participants]);

  const setScores = detail?.set_scores ?? [];
  const hasScore = setScores.length > 0;
  const hasResult = detail?.result_finalized_at != null || detail?.winner_team != null;
  /** Счёт партий может вводить организатор или назначенный ответственный. */
  const canEnterScore = Boolean(
    (detail?.is_organizer || detail?.is_responsible) &&
      detail?.result_finalized_at == null &&
      (detail?.status === 2 || detail?.status === 3 || detail?.status === 4),
  );

  async function doRegister() {
    if (!isAuth) return nav.navigate('Login');
    if (full) return setFullModal(true);
    setBusy(true);
    setMyStatus('registered');
    try {
      await api.registerOnGame(gid);
      toast.push('Вы записаны на игру', 'success');
      setPayModal(true);
    } catch (e) {
      setMyStatus('none');
      toast.push(e instanceof Error ? e.message : 'Не удалось записаться', 'error');
    } finally {
      setBusy(false);
      load();
    }
  }

  async function doCancel() {
    setBusy(true);
    const prev = myStatus;
    setMyStatus('none');
    try {
      await api.cancelRegistration(gid);
      toast.push('Запись отменена', 'info');
    } catch (e) {
      setMyStatus(prev);
      toast.push(e instanceof Error ? e.message : 'Не удалось отменить запись', 'error');
    } finally {
      setBusy(false);
      load();
    }
  }

  async function doAttend() {
    setBusy(true);
    try {
      await api.attend(gid);
      toast.push('Отмечено: вы присутствовали', 'success');
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Не удалось отметиться', 'error');
    } finally {
      setBusy(false);
      load();
    }
  }

  async function copyPhone() {
    await Clipboard.setStringAsync('+7 900 123-45-67');
    setCopied(true);
    toast.push('Номер скопирован', 'success');
    setTimeout(() => setCopied(false), 1500);
  }

  const organizerName = detail ? `${detail.organizer.first_name} ${detail.organizer.last_name}` : '';

  return (
    <Screen>
      <AppHeader />
      <ScrollView contentContainerStyle={contentStyle}>
        <Pressable onPress={() => nav.navigate('Tabs', { screen: 'Games' })}>
          <Text style={styles.back}>← Все игры</Text>
        </Pressable>

        {!detail ? (
          <>
            <Skeleton height={200} />
            <Skeleton height={120} />
          </>
        ) : (
          <>
            {/* Hero */}
            <Card style={styles.hero}>
              <View style={styles.badgeRow}>
                <LevelBadge level={detail.skill_level} />
                <GameStatusBadge status={detail.status} />
              </View>
              <Text style={styles.heroTitle}>{detail.title}</Text>
              <View style={styles.heroMetaRow}>
                <Icon name="calendar-blank-outline" size={15} color={colors.meta} />
                <Text style={styles.heroMeta} numberOfLines={1}>
                  {formatDate(detail.date_time)}
                </Text>
              </View>
              <View style={styles.heroMetaRow}>
                <Icon name="clock-outline" size={15} color={colors.meta} />
                <Text style={styles.heroMeta} numberOfLines={1}>
                  {detail.duration_minutes} мин
                </Text>
              </View>
              <View style={styles.heroMetaRow}>
                <Icon name="map-marker-outline" size={15} color={colors.meta} />
                <Text style={styles.heroMeta} numberOfLines={2}>
                  {detail.location.name}
                  {detail.location.address ? `, ${detail.location.address}` : ''}
                </Text>
              </View>
            </Card>

            {ratingStats && ratingStats.spread > 300 && isOpen ? (
              <Banner kind="warning" icon="alert-outline">
                Большой разброс рейтинга участников ({ratingStats.spread} ELO). Игра может получиться неровной.
              </Banner>
            ) : null}
            {detail.status === 2 ? (
              <Banner kind="info" icon="lock-outline">
                Запись закрыта.
              </Banner>
            ) : null}
            {detail.status === 4 ? (
              <Banner kind="success" icon="check-circle-outline">
                Игра завершена.
              </Banner>
            ) : null}
            {detail.status === 5 ? (
              <Banner kind="error" icon="close-circle-outline">
                Игра отменена.
              </Banner>
            ) : null}

            {/* Итог матча: победившая команда + счёт партий */}
            {detail.status === 4 && hasResult ? (
              <Card style={{ gap: spacing.sm }}>
                <Text style={styles.h3}>Итог матча</Text>
                <View style={styles.resultRow}>
                  <View style={[styles.resultTeamWrap, detail.winner_team === 1 && styles.resultWinnerWrap]}>
                    <Text
                      style={[styles.resultTeam, detail.winner_team === 1 && styles.resultWinner]}
                      numberOfLines={1}
                    >
                      Команда 1
                    </Text>
                    {detail.winner_team === 1 ? (
                      <Icon name="trophy-outline" size={16} color={colors.gold} />
                    ) : null}
                  </View>
                  <Text style={styles.resultScore} numberOfLines={1}>
                    {detail.team_1_sets_won ?? 0} : {detail.team_2_sets_won ?? 0}
                  </Text>
                  <View
                    style={[
                      styles.resultTeamWrap,
                      styles.resultTeamRight,
                      detail.winner_team === 2 && styles.resultWinnerWrap,
                    ]}
                  >
                    {detail.winner_team === 2 ? (
                      <Icon name="trophy-outline" size={16} color={colors.gold} />
                    ) : null}
                    <Text
                      style={[styles.resultTeam, detail.winner_team === 2 && styles.resultWinner]}
                      numberOfLines={1}
                    >
                      Команда 2
                    </Text>
                  </View>
                </View>
                {hasScore ? (
                  <Text style={styles.setsLine}>
                    Партии: {setScores.map((s) => `${s.team_1}:${s.team_2}`).join(' · ')}
                  </Text>
                ) : null}
                <Text style={styles.muted}>Победители: +20 ELO · проигравшие: −20 ELO</Text>
              </Card>
            ) : null}

            {/* Счёт партий: ввод ответственным в перерывах между сетами */}
            {detail &&
            (canEnterScore ||
              (setScores.length > 0 && (detail.status === 2 || detail.status === 3))) ? (
              <ScoreEntry
                gameId={gid}
                setScores={setScores}
                canEdit={canEnterScore}
                hint={
                  detail.is_responsible
                    ? 'Вы ответственный за счёт. В перерыве между партиями вводите результат сыгранного сета.'
                    : detail.is_organizer
                      ? 'Вы организатор: вводите счёт партий или назначьте ответственного в кабинете организатора.'
                      : 'Счёт партий обновляет ответственный за счёт.'
                }
                onSaved={load}
              />
            ) : null}

            {/* Действия */}
            <Card style={{ gap: spacing.md }}>
              {isOpen && myStatus === 'none' ? (
                <Btn onPress={doRegister} loading={busy} block>
                  Записаться · {formatMoney(detail.price)}
                </Btn>
              ) : null}
              {!isOpen && detail.status === 2 && myStatus === 'none' ? (
                <Text style={styles.muted}>Запись на эту игру закрыта.</Text>
              ) : null}

              {myStatus === 'registered' ? (
                <>
                  {detail.status === 3 ? (
                    <Btn kind="secondary" onPress={doAttend} block>
                      Я здесь — отметиться
                    </Btn>
                  ) : null}
                  <Btn kind="success" onPress={() => setPayModal(true)} block>
                    Оплатить {formatMoney(detail.price)}
                  </Btn>
                  {detail.status !== 3 ? (
                    <>
                      <Btn kind="danger" onPress={doCancel} disabled={(deadlineLeft ?? 0) <= 0} block>
                        Отменить запись
                      </Btn>
                      {deadlineLeft !== null && deadlineLeft > 0 ? (
                        <Text style={styles.deadline}>
                          Отмена доступна ещё {formatMs(deadlineLeft)}
                        </Text>
                      ) : (
                        <Text style={styles.muted}>Отмена недоступна (менее 24ч до игры)</Text>
                      )}
                    </>
                  ) : null}
                </>
              ) : null}

              {myStatus === 'confirmed' ? (
                <>
                  <View style={styles.paidRow}>
                    <Icon name="check-circle-outline" size={16} color={colors.success} />
                    <Text style={styles.paidText}>Оплачено</Text>
                  </View>
                  {detail.status === 3 ? (
                    <Btn kind="secondary" onPress={doAttend} block>
                      Я здесь — отметиться
                    </Btn>
                  ) : detail.status === 1 || detail.status === 2 ? (
                    <Btn kind="danger" onPress={doCancel} disabled={(deadlineLeft ?? 0) <= 0} block>
                      Отменить запись
                    </Btn>
                  ) : null}
                </>
              ) : null}

              {(detail.status === 3 || detail.status === 4 || detail.status === 5) && myStatus === 'none' ? (
                <Text style={styles.muted}>Запись на эту игру недоступна.</Text>
              ) : null}
            </Card>

            {/* Участники */}
            <Card style={{ gap: spacing.md }}>
              <View style={styles.rowBetween}>
                <Text style={[styles.h3, { flexShrink: 1 }]} numberOfLines={1}>
                  Записались ({participants.length}/{short?.capacity ?? detail.capacity})
                </Text>
                {ratingStats ? (
                  <View style={styles.eloChip}>
                    <Text style={styles.eloChipText}>Σ̄ ELO {ratingStats.avg}</Text>
                  </View>
                ) : null}
              </View>
              <Bar
                value={detail.booked_count}
                max={short?.capacity ?? detail.capacity}
                variant={full ? 'danger' : 'info'}
              />
              <View style={{ gap: spacing.sm }}>
                {[...teamGroups.groups, [null, teamGroups.unassigned] as [null, ParticipantLite[]]]
                  .filter(([, list]) => list.length > 0)
                  .map(([teamNo, list]) => (
                    <View key={String(teamNo)} style={{ gap: spacing.sm }}>
                      <View style={styles.teamHead}>
                        <Text style={styles.teamTitle}>
                          {teamNo == null ? 'Без команды' : `Команда ${teamNo}`}
                        </Text>
                        {hasResult && teamNo != null && detail.winner_team === teamNo ? (
                          <View style={styles.winBadge}>
                            <Text style={styles.winBadgeText}>Победа</Text>
                          </View>
                        ) : null}
                      </View>
                      {list.map((p) => {
                        const uid = p.player_user_id;
                        const delta =
                          p.elo_before != null && p.elo_after != null ? p.elo_after - p.elo_before : null;
                        const row = (
                          <>
                            <Avatar name={p.player_name} size={36} />
                            <View style={styles.pInfo}>
                              <Text style={styles.pName} numberOfLines={1}>
                                {p.player_name}
                              </Text>
                              <Text style={styles.pSub}>ELO {p.player_elo}</Text>
                              <View style={styles.pBadges}>
                                <View
                                  style={[
                                    styles.pBadge,
                                    p.status === 2
                                      ? { backgroundColor: colors.successBg }
                                      : { backgroundColor: colors.infoBg },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      color: p.status === 2 ? colors.success : colors.primary,
                                      fontSize: 11,
                                      fontWeight: '600',
                                    }}
                                    numberOfLines={1}
                                  >
                                    {p.status === 2 ? 'Оплачено' : 'Записан'}
                                  </Text>
                                </View>
                                {detail.responsible?.id === p.player_id ? (
                                  <View style={[styles.pBadge, { backgroundColor: colors.infoBg }]}>
                                    <Text
                                      style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}
                                      numberOfLines={1}
                                    >
                                      Счёт
                                    </Text>
                                  </View>
                                ) : null}
                                {hasResult && p.result ? (
                                  <View
                                    style={[
                                      styles.pBadge,
                                      p.result === 1
                                        ? { backgroundColor: colors.successBg }
                                        : { backgroundColor: colors.dangerBg },
                                    ]}
                                  >
                                    <Text
                                      style={{
                                        color: p.result === 1 ? colors.success : colors.danger,
                                        fontSize: 11,
                                        fontWeight: '600',
                                      }}
                                      numberOfLines={1}
                                    >
                                      {p.result === 1 ? 'Победа' : 'Поражение'}
                                      {delta != null ? ` ${delta > 0 ? '+' : ''}${delta}` : ''}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                            {uid ? <Icon name="chevron-right" size={18} color={colors.muted} /> : null}
                          </>
                        );
                        return uid ? (
                          <Pressable
                            key={p.id}
                            onPress={() => nav.navigate('UserProfile', { id: uid })}
                            style={({ pressed }) => [
                              styles.participant,
                              styles.participantLink,
                              pressed && styles.pressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Открыть профиль ${p.player_name}`}
                          >
                            {row}
                          </Pressable>
                        ) : (
                          <View key={p.id} style={styles.participant}>
                            {row}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                {participants.length === 0 ? <Text style={styles.muted}>Пока никого. Будьте первым!</Text> : null}
              </View>
            </Card>

            {/* Об игре */}
            <Card style={{ gap: spacing.xs }}>
              <Text style={styles.h3}>Об игре</Text>
              <KV k="Уровень" v={SKILL_LEVELS[detail.skill_level as keyof typeof SKILL_LEVELS]} />
              <KV k="Цена" v={formatMoney(detail.price)} />
              <KV k="Формат" v={<GenderText gender={short?.gender ?? 0} />} />
              <KV k="Площадка" v={detail.location.city} />
              <KV k="Мест занято" v={String(detail.booked_count)} />
            </Card>

            {/* Организатор */}
            <Card style={{ gap: spacing.md }}>
              <Text style={styles.h3}>Организатор</Text>
              {(() => {
                const orgUserId = detail.organizer.user_id;
                const inner = (
                  <>
                    <Avatar name={organizerName} size={52} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.pName} numberOfLines={1}>
                        {organizerName}
                      </Text>
                      <Text style={styles.pSub} numberOfLines={1}>
                        {detail.organizer.total_games} игр · ELO {detail.organizer.elo_rating}
                      </Text>
                    </View>
                    {orgUserId ? <Icon name="chevron-right" size={22} color={colors.muted} /> : null}
                  </>
                );
                return orgUserId ? (
                  <Pressable
                    onPress={() => nav.navigate('UserProfile', { id: orgUserId })}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Открыть профиль ${organizerName}`}
                  >
                    {inner}
                  </Pressable>
                ) : (
                  <View style={styles.row}>{inner}</View>
                );
              })()}
              {detail.organizer.description ? <Text style={styles.body}>{detail.organizer.description}</Text> : null}
            </Card>
          </>
        )}
      </ScrollView>

      {/* Модалка «мест нет» */}
      <Modal visible={fullModal} onClose={() => setFullModal(false)}>
        <Text style={styles.modalTitle}>Свободных мест нет</Text>
        <Text style={styles.modalText}>
          Добавить вас в лист ожидания? Как только кто-то отменит запись — место перейдёт вам.
        </Text>
        <View style={styles.modalActions}>
          <Btn
            onPress={() => {
              setFullModal(false);
              toast.push('Вы в листе ожидания', 'success');
            }}
          >
            В лист ожидания
          </Btn>
          <Btn kind="secondary" onPress={() => setFullModal(false)}>
            Закрыть
          </Btn>
        </View>
      </Modal>

      {/* Оплата MVP */}
      <Modal visible={payModal} onClose={() => setPayModal(false)}>
        <Text style={styles.modalTitle}>Оплата участия</Text>
        <Text style={styles.modalText}>
          Переведите {formatMoney(detail?.price)} по номеру телефона организатора — оплату отметит организатор.
        </Text>
        <View style={styles.copyRow}>
          <Text style={styles.phone}>+7 900 123-45-67</Text>
          <Btn kind="secondary" small onPress={copyPhone}>
            {copied ? 'Скопировано' : 'Скопировать'}
          </Btn>
        </View>
        <Banner kind="warning" icon="credit-card-outline">
          Статус сейчас: не оплачено. Автоматическая оплата через СБП — в планах.
        </Banner>
        <View style={styles.modalActions}>
          <Btn onPress={() => setPayModal(false)}>Понятно</Btn>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  hero: { gap: spacing.xs },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  heroTitle: {
    color: colors.textMain,
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: fontDisplay,
    lineHeight: 29,
  },
  heroMetaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 3, minWidth: 0 },
  heroMeta: { color: colors.textSub, fontSize: 13.5, flexShrink: 1, lineHeight: 19 },
  muted: { color: colors.textSub, fontSize: 13.5, lineHeight: 19 },
  deadline: { color: colors.warning, fontSize: 13, fontFamily: fontMono },
  h3: { color: colors.textMain, fontSize: 17, fontWeight: '700', fontFamily: fontDisplay },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minWidth: 0 },
  eloChip: {
    backgroundColor: colors.infoBg,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  eloChipText: { color: colors.primary, fontSize: 11.5, fontWeight: '700' },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    minWidth: 0,
  },
  participantLink: { borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.85 },
  pInfo: { flex: 1, minWidth: 0, gap: 2 },
  pBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  pName: { color: colors.textMain, fontSize: 14, fontWeight: '600' },
  pSub: { color: colors.textSub, fontSize: 11.5, fontFamily: fontMono },
  pBadge: { borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 2, maxWidth: '100%' },
  teamHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  teamTitle: { color: colors.textSub, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  winBadge: { backgroundColor: colors.successBg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  winBadgeText: { color: colors.success, fontSize: 11, fontWeight: '700' },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  resultTeamWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultTeamRight: { justifyContent: 'flex-end' },
  resultWinnerWrap: {},
  resultTeam: { color: colors.textSub, fontSize: 13, flexShrink: 1 },
  resultWinner: { color: colors.success, fontWeight: '700' },
  resultScore: { color: colors.gold, fontSize: 23, fontWeight: '700', fontFamily: fontMono, flexShrink: 0 },
  setsLine: { color: colors.textSub, fontSize: 12, letterSpacing: 0.5, fontFamily: fontMono },
  paidRow: {
    backgroundColor: colors.successBg,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  paidText: { color: colors.success, fontWeight: '700', fontSize: 15 },
  body: { color: colors.textSub, fontSize: 13.5, lineHeight: 20 },
  modalTitle: { color: colors.textMain, fontSize: 18, fontWeight: '700', fontFamily: fontDisplay },
  modalText: { color: colors.textSub, fontSize: 13.5, marginTop: 4, lineHeight: 19 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, flexWrap: 'wrap' },
  phone: {
    color: colors.textMain,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: radius.md,
    flexShrink: 1,
    textAlign: 'center',
    fontFamily: fontMono,
  },
});
