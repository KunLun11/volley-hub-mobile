import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { colors, radius, spacing } from '../theme';

interface ParticipantLite {
  id: number;
  player_name: string;
  player_elo: number;
  status: number;
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
        .myGames()
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

  async function doRegister() {
    if (!isAuth) return nav.navigate('Login');
    if (full) return setFullModal(true);
    setBusy(true);
    setMyStatus('registered');
    try {
      await api.registerOnGame(gid);
      toast.push('Вы записаны на игру! 🎉', 'success');
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

  async function confirmPaid() {
    setBusy(true);
    try {
      await api.confirmPayment(gid);
      setMyStatus('confirmed');
      setPayModal(false);
      toast.push('Статус обновлён: оплачено ✅', 'success');
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setBusy(false);
      load();
    }
  }

  async function doAttend() {
    setBusy(true);
    try {
      await api.attend(gid);
      toast.push('Отмечено: вы присутствовали 🏐', 'success');
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
              <Text style={styles.heroMeta}>🗓 {formatDate(detail.date_time)}</Text>
              <Text style={styles.heroMeta}>⏱ {detail.duration_minutes} мин</Text>
              <Text style={styles.heroMeta}>
                📍 {detail.location.name}, {detail.location.address}
              </Text>
            </Card>

            {ratingStats && ratingStats.spread > 300 && isOpen ? (
              <Banner kind="warning" icon="⚠️">
                Большой разброс рейтинга участников ({ratingStats.spread} ELO). Игра может получиться неровной.
              </Banner>
            ) : null}
            {detail.status === 2 ? (
              <Banner kind="info" icon="🔒">
                Запись закрыта.
              </Banner>
            ) : null}
            {detail.status === 4 ? (
              <Banner kind="success" icon="✅">
                Игра завершена.
              </Banner>
            ) : null}
            {detail.status === 5 ? (
              <Banner kind="error" icon="✕">
                Игра отменена.
              </Banner>
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
                  <Btn kind="success" onPress={() => setPayModal(true)} block>
                    Оплатить {formatMoney(detail.price)}
                  </Btn>
                  <Btn kind="danger" onPress={doCancel} disabled={(deadlineLeft ?? 0) <= 0} block>
                    Отменить запись
                  </Btn>
                  {deadlineLeft !== null && deadlineLeft > 0 ? (
                    <Text style={styles.deadline}>⏳ отмена доступна ещё {formatMs(deadlineLeft)}</Text>
                  ) : (
                    <Text style={styles.muted}>Отмена недоступна (менее 24ч до игры)</Text>
                  )}
                </>
              ) : null}

              {myStatus === 'confirmed' ? (
                <>
                  <View style={styles.paidRow}>
                    <Text style={styles.paidText}>✓ Оплачено</Text>
                  </View>
                  {detail.status === 3 ? (
                    <Btn kind="secondary" onPress={doAttend} block>
                      Я здесь — отметиться
                    </Btn>
                  ) : (
                    <Btn kind="danger" onPress={doCancel} disabled={(deadlineLeft ?? 0) <= 0} block>
                      Отменить запись
                    </Btn>
                  )}
                </>
              ) : null}

              {(detail.status === 3 || detail.status === 4 || detail.status === 5) && myStatus === 'none' ? (
                <Text style={styles.muted}>Запись на эту игру недоступна.</Text>
              ) : null}
            </Card>

            {/* Участники */}
            <Card style={{ gap: spacing.md }}>
              <View style={styles.rowBetween}>
                <Text style={styles.h3}>
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
                {participants.map((p) => (
                  <View key={p.id} style={styles.participant}>
                    <Avatar name={p.player_name} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pName}>{p.player_name}</Text>
                      <Text style={styles.pSub}>ELO {p.player_elo}</Text>
                    </View>
                    <View style={[styles.pBadge, p.status === 2 ? { backgroundColor: colors.successBg } : { backgroundColor: colors.infoBg }]}>
                      <Text style={{ color: p.status === 2 ? colors.success : colors.primary, fontSize: 12, fontWeight: '600' }}>
                        {p.status === 2 ? 'Оплачено' : 'Записан'}
                      </Text>
                    </View>
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
              <View style={styles.row}>
                <Avatar name={organizerName} size={52} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pName}>{organizerName}</Text>
                  <Text style={styles.pSub}>
                    {detail.organizer.total_games} игр проведено · ELO {detail.organizer.elo_rating}
                  </Text>
                </View>
              </View>
              {detail.organizer.description ? <Text style={styles.body}>{detail.organizer.description}</Text> : null}
            </Card>
          </>
        )}
      </ScrollView>

      {/* Модалка «мест нет» */}
      <Modal visible={fullModal} onClose={() => setFullModal(false)}>
        <Text style={styles.modalTitle}>Свободных мест нет 😞</Text>
        <Text style={styles.modalText}>
          Добавить вас в лист ожидания? Как только кто-то отменит запись — место перейдёт вам.
        </Text>
        <View style={styles.modalActions}>
          <Btn
            onPress={() => {
              setFullModal(false);
              toast.push('Вы в листе ожидания ⏳', 'success');
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
          Переведите {formatMoney(detail?.price)} по номеру телефона организатора, затем подтвердите статус.
        </Text>
        <View style={styles.copyRow}>
          <Text style={styles.phone}>+7 900 123-45-67</Text>
          <Btn kind="secondary" small onPress={copyPhone}>
            {copied ? '✓ Скопировано' : 'Скопировать'}
          </Btn>
        </View>
        <Banner kind="warning" icon="💳">
          Статус сейчас: не оплачено. Автоматическая оплата через СБП — в планах.
        </Banner>
        <View style={styles.modalActions}>
          <Btn kind="success" onPress={confirmPaid} loading={busy}>
            Я оплатил — подтвердить
          </Btn>
          <Btn kind="ghost" onPress={() => setPayModal(false)}>
            Позже
          </Btn>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  hero: { gap: spacing.xs },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  heroTitle: { color: colors.textMain, fontSize: 24, fontWeight: '700' },
  heroMeta: { color: colors.textSub, fontSize: 14, marginTop: 2 },
  muted: { color: colors.textSub, fontSize: 14 },
  deadline: { color: colors.warning, fontSize: 13 },
  h3: { color: colors.textMain, fontSize: 18, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  eloChip: { backgroundColor: colors.infoBg, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  eloChipText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
  },
  pName: { color: colors.textMain, fontSize: 14, fontWeight: '600' },
  pSub: { color: colors.textSub, fontSize: 12 },
  pBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  paidRow: { backgroundColor: colors.successBg, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  paidText: { color: colors.success, fontWeight: '700', fontSize: 15 },
  body: { color: colors.textSub, fontSize: 14, lineHeight: 20 },
  modalTitle: { color: colors.textMain, fontSize: 18, fontWeight: '700' },
  modalText: { color: colors.textSub, fontSize: 14, marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, flexWrap: 'wrap' },
  phone: {
    color: colors.textMain,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
});
