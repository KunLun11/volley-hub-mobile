import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { api } from '../api/client';
import type { GameDetail, SetScore } from '../types';
import {
  AppHeader,
  Avatar,
  Bar,
  Btn,
  Card,
  GameStatusBadge,
  LevelBadge,
  Modal,
  Screen,
  Skeleton,
  contentStyle,
  formatDate,
  formatMoney,
} from '../components/ui';
import { useToast } from '../store';
import ScoreEntry from '../components/ScoreEntry';
import { colors, fontMono, radius, spacing } from '../theme';

interface ParticipantLite {
  id: number;
  /** id профиля игрока (совпадает с responsible.id). */
  player_id: number;
  player_name: string;
  player_elo: number;
  status: number; // 1 registered, 2 confirmed, 3 attended, 4 no_show
  player_user_id?: string | null;
  team?: number | null;
  result?: number;
  elo_before?: number | null;
  elo_after?: number | null;
}

/** В3. Управление записавшимися + В4. Сводка после игры */
export default function ManageGameScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const gid = Number(route.params?.id ?? 1);
  const toast = useToast();

  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [players, setPlayers] = useState<ParticipantLite[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [resultModal, setResultModal] = useState(false);
  const [responsibleModal, setResponsibleModal] = useState(false);
  const [winnerTeam, setWinnerTeam] = useState<number>(1);
  const [setScores, setSetScores] = useState<SetScore[]>([{ team_1: 0, team_2: 0 }]);
  const [savingResult, setSavingResult] = useState(false);

  const load = () => {
    api.gameDetail(gid).then(setDetail).catch(() => undefined);
    api
      .participants(gid)
      .then((p) => setPlayers(p as unknown as ParticipantLite[]))
      .catch(() => undefined);
  };

  useEffect(load, [gid]); // eslint-disable-line

  async function act(pid: number, fn: (g: number, p: number) => Promise<unknown>, msg: string) {
    setBusyId(pid);
    try {
      await fn(gid, pid);
      toast.push(msg, 'success');
      load();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const paid = players.filter((p) => p.status === 2 || p.status === 3).length;
  const total = players.length;

  /** Номера команд в игре (по 6 человек). */
  const teamNumbers = [...new Set(players.map((p) => p.team).filter((t): t is number => t != null))].sort(
    (a, b) => a - b,
  );
  const hasResult = !!detail?.result_finalized_at;
  const canFinalize =
    (detail?.status === 2 || detail?.status === 3 || detail?.status === 4) && !hasResult;
  /** Ввод счёта доступен организатору до фиксации результата. */
  const canEnterScore = Boolean(
    !hasResult && (detail?.status === 2 || detail?.status === 3 || detail?.status === 4),
  );

  function openResultModal() {
    setWinnerTeam(teamNumbers[0] ?? 1);
    setSetScores(
      detail?.set_scores && detail.set_scores.length > 0
        ? detail.set_scores.map((s) => ({ ...s }))
        : [{ team_1: 0, team_2: 0 }],
    );
    setResultModal(true);
  }

  function updateSet(index: number, key: 'team_1' | 'team_2', value: string) {
    const num = Math.max(0, Number(value.replace(/[^0-9]/g, '')) || 0);
    setSetScores((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: num } : s)));
  }

  async function submitResult() {
    if (savingResult) return;
    setSavingResult(true);
    try {
      await api.setGameResult(gid, { winner_team: winnerTeam, set_scores: setScores });
      toast.push('Результат зафиксирован: ELO пересчитан (±20)', 'success');
      setResultModal(false);
      load();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Не удалось сохранить результат', 'error');
    } finally {
      setSavingResult(false);
    }
  }

  /** Назначить ответственного за счёт (null — снять). */
  async function assignResponsible(participantId: number | null) {
    try {
      await api.assignResponsible(gid, participantId);
      toast.push(
        participantId ? 'Ответственный за счёт назначен' : 'Ответственный за счёт снят',
        'success',
      );
      setResponsibleModal(false);
      load();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Не удалось назначить ответственного', 'error');
    }
  }

  /** Удаление участника с подтверждением (включая уже оплатившего — решение конфликта). */
  function confirmRemove(p: ParticipantLite) {
    const isPaid = p.status === 2 || p.status === 3;
    Alert.alert(
      'Удалить участника?',
      `${p.player_name} будет исключён из игры, место снова откроется для записи.` +
        (isPaid ? '\n\nУчастник уже оплатил. Удаление не отменяет платёж — верните деньги вне сервиса.' : ''),
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () =>
            act(
              p.id,
              api.removeParticipant,
              isPaid ? `${p.player_name}: удалён из игры` : `${p.player_name}: удалён за неоплату`,
            ),
        },
      ],
    );
  }

  return (
    <Screen>
      <AppHeader />
      <ScrollView contentContainerStyle={contentStyle}>
        <Pressable onPress={() => nav.navigate('Organizer')}>
          <Text style={styles.back}>← Кабинет организатора</Text>
        </Pressable>

        {!detail ? (
          <Skeleton height={140} />
        ) : (
          <Card style={{ gap: spacing.md }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.h2}>{detail.title}</Text>
                <Text style={styles.meta}>
                  {formatDate(detail.date_time)} · {detail.location.name} · {formatMoney(detail.price)}
                </Text>
              </View>
            </View>
            <View style={styles.badgeRow}>
              <LevelBadge level={detail.skill_level} />
              <GameStatusBadge status={detail.status} />
            </View>
            <Bar value={paid} max={Math.max(1, total)} variant="success" />
            <Text style={styles.meta}>
              Оплатили <Text style={{ color: colors.success, fontWeight: '700' }}>{paid}</Text> из{' '}
              <Text style={{ fontWeight: '700' }}>{total}</Text> записанных · собрано ≈{' '}
              <Text style={{ color: colors.gold, fontWeight: '700', fontFamily: fontMono }}>
                {(paid * (detail.price ?? 0)).toLocaleString('ru-RU')} ₽
              </Text>
            </Text>
            {canFinalize ? (
              <Btn kind="success" small onPress={openResultModal} disabled={players.length === 0}>
                Зафиксировать результат
              </Btn>
            ) : null}
            {detail.status === 4 && detail.winner_team != null ? (
              <View style={styles.resultLine}>
                <View style={styles.statusBadge}>
                  <Text style={[styles.statusText, { color: colors.success }]}>
                    Победа: команда {detail.winner_team}
                  </Text>
                </View>
                <Text style={styles.resultScore}>
                  {detail.team_1_sets_won ?? 0} : {detail.team_2_sets_won ?? 0}
                </Text>
                {detail.set_scores && detail.set_scores.length > 0 ? (
                  <Text style={styles.setsLine}>
                    {detail.set_scores.map((s) => `${s.team_1}:${s.team_2}`).join(' · ')}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Ответственный за счёт: назначает организатор */}
            <View style={styles.responsibleRow}>
              <Text style={styles.meta}>
                Ответственный за счёт:{' '}
                <Text style={{ color: colors.textMain, fontWeight: '700' }}>
                  {detail.responsible
                    ? `${detail.responsible.first_name} ${detail.responsible.last_name}`.trim()
                    : 'не назначен'}
                </Text>
              </Text>
              {!hasResult ? (
                <Btn kind="secondary" small onPress={() => setResponsibleModal(true)}>
                  {detail.responsible ? 'Изменить' : 'Назначить'}
                </Btn>
              ) : null}
            </View>
          </Card>
        )}

        {/* Счёт партий: организатор или ответственный вводит после каждого сета */}
        {detail ? (
          <ScoreEntry
            gameId={gid}
            setScores={detail.set_scores ?? []}
            canEdit={canEnterScore}
            hint="Вводите результат партии сразу после её окончания."
            onSaved={load}
          />
        ) : null}

        <Card style={{ gap: spacing.md }}>
          <Text style={styles.h3}>Участники</Text>
          {players.map((p) => {
            const uid = p.player_user_id;
            const identity = (
              <>
                <Avatar name={p.player_name} size={36} />
                <View>
                  <Text style={styles.pName}>{p.player_name}</Text>
                  <Text style={styles.pSub}>ELO {p.player_elo}</Text>
                </View>
              </>
            );
            return (
              <View key={p.id} style={styles.participant}>
                {uid ? (
                  <Pressable
                    onPress={() => nav.navigate('UserProfile', { id: uid })}
                    style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Открыть профиль ${p.player_name}`}
                  >
                    {identity}
                  </Pressable>
                ) : (
                  <View style={styles.identity}>{identity}</View>
                )}
                <View style={styles.row}>
                  <View style={[styles.statusBadge, statusStyle(p.status)]}>
                    <Text style={[styles.statusText, statusTextStyle(p.status)]}>{statusLabel(p.status)}</Text>
                  </View>
                  {p.team != null ? (
                    <View style={[styles.statusBadge, { backgroundColor: colors.infoBg }]}>
                      <Text style={[styles.statusText, { color: colors.primary }]}>Команда {p.team}</Text>
                    </View>
                  ) : null}
                  {hasResult && p.result ? (
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: p.result === 1 ? colors.successBg : colors.dangerBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: p.result === 1 ? colors.success : colors.danger },
                        ]}
                      >
                        {p.result === 1 ? 'Победа' : 'Поражение'}
                        {p.elo_before != null && p.elo_after != null
                          ? ` ${p.elo_after - p.elo_before > 0 ? '+' : ''}${p.elo_after - p.elo_before}`
                          : ''}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.actionsCol}>
                  {p.status === 1 ? (
                    <Btn
                      kind="success"
                      small
                      loading={busyId === p.id}
                      onPress={() => act(p.id, (g, pid) => api.markPaid(g, pid), `${p.player_name}: оплачено ✅`)}
                    >
                      Оплатил
                    </Btn>
                  ) : null}
                  {p.status !== 5 ? (
                    <Btn kind="danger" small loading={busyId === p.id} onPress={() => confirmRemove(p)}>
                      Удалить
                    </Btn>
                  ) : null}
                  {(p.status === 1 || p.status === 2) && detail?.status === 4 ? (
                    <Btn
                      kind="secondary"
                      small
                      onPress={() => act(p.id, api.markNoShow, `${p.player_name}: no-show`)}
                    >
                      No-show
                    </Btn>
                  ) : null}
                </View>
              </View>
            );
          })}
          {players.length === 0 ? <Text style={styles.muted}>Записанных пока нет.</Text> : null}
        </Card>

        {/* В4. Сводка после игры */}
        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.h3}>Сводка: совпал ли уровень с ожиданиями?</Text>
          <Text style={styles.muted}>
            Отметок пока нет — игроки оценят игру после завершения. Метрика используется для калибровки ELO-подбора.
          </Text>
        </Card>
      </ScrollView>

      {/* Назначение ответственного за счёт */}
      <Modal visible={responsibleModal} onClose={() => setResponsibleModal(false)}>
        <Text style={styles.h3}>Ответственный за счёт</Text>
        <Text style={styles.muted}>
          Выберите участника, который в перерывах между партиями будет вводить счёт. Он увидит форму ввода на
          странице игры.
        </Text>
        <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: spacing.sm, marginTop: spacing.md }}>
          {players
            .filter((p) => p.status === 1 || p.status === 2 || p.status === 3)
            .map((p) => {
              const isCurrent = detail?.responsible?.id === p.player_id;
              return (
                <View key={p.id} style={styles.participant}>
                  <Avatar name={p.player_name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pName}>{p.player_name}</Text>
                    <Text style={styles.pSub}>ELO {p.player_elo}</Text>
                  </View>
                  <Btn
                    kind={isCurrent ? 'success' : 'secondary'}
                    small
                    onPress={() => assignResponsible(isCurrent ? null : p.id)}
                  >
                    {isCurrent ? 'Снять' : 'Назначить'}
                  </Btn>
                </View>
              );
            })}
          {players.length === 0 ? <Text style={styles.muted}>В игре пока нет участников.</Text> : null}
        </ScrollView>
        <View style={styles.modalActions}>
          <Btn kind="ghost" onPress={() => setResponsibleModal(false)}>
            Закрыть
          </Btn>
        </View>
      </Modal>

      {/* Фиксация результата: победившая команда + счёт партий */}
      <Modal visible={resultModal} onClose={() => setResultModal(false)}>
        <Text style={styles.h3}>Итог матча</Text>
        <Text style={styles.muted}>
          Победители получат +20 ELO, проигравшие — −20 ELO. Игра перейдёт в историю матчей.
        </Text>

        <Text style={styles.label}>Победившая команда</Text>
        <View style={styles.modalRow}>
          {(teamNumbers.length > 0 ? teamNumbers : [1, 2]).map((team) => (
            <Btn key={team} kind={winnerTeam === team ? 'success' : 'secondary'} small onPress={() => setWinnerTeam(team)}>
              Команда {team}
            </Btn>
          ))}
        </View>

        <Text style={styles.label}>Счёт партий</Text>
        {setScores.map((s, i) => (
          <View key={i} style={styles.setRow}>
            <Text style={styles.setLabel}>Партия {i + 1}</Text>
            <TextInput
              style={styles.scoreInput}
              keyboardType="number-pad"
              value={String(s.team_1)}
              onChangeText={(v) => updateSet(i, 'team_1', v)}
              accessibilityLabel={`Команда 1, партия ${i + 1}`}
            />
            <Text style={styles.colon}>:</Text>
            <TextInput
              style={styles.scoreInput}
              keyboardType="number-pad"
              value={String(s.team_2)}
              onChangeText={(v) => updateSet(i, 'team_2', v)}
              accessibilityLabel={`Команда 2, партия ${i + 1}`}
            />
            {setScores.length > 0 ? (
              <Btn kind="ghost" small onPress={() => setSetScores((prev) => prev.filter((_, idx) => idx !== i))}>
                Удалить
              </Btn>
            ) : null}
          </View>
        ))}
        <Btn kind="secondary" small onPress={() => setSetScores((prev) => [...prev, { team_1: 0, team_2: 0 }])}>
          + Добавить партию
        </Btn>

        <View style={styles.modalActions}>
          <Btn kind="ghost" onPress={() => setResultModal(false)}>
            Отмена
          </Btn>
          <Btn kind="success" loading={savingResult} onPress={submitResult}>
            Зафиксировать результат
          </Btn>
        </View>
      </Modal>
    </Screen>
  );
}

function statusLabel(s: number) {
  return s === 2 ? 'Оплатил' : s === 4 ? 'No-show' : s === 3 ? 'Присутствовал' : 'Записан';
}
function statusStyle(s: number) {
  if (s === 2) return { backgroundColor: colors.successBg };
  if (s === 4) return { backgroundColor: colors.dangerBg };
  if (s === 3) return { backgroundColor: colors.primaryGlow };
  return { backgroundColor: colors.infoBg };
}
function statusTextStyle(s: number) {
  if (s === 2) return { color: colors.success };
  if (s === 4) return { color: colors.danger };
  if (s === 3) return { color: colors.primary };
  return { color: colors.primary };
}

const styles = StyleSheet.create({
  back: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  h2: { color: colors.textMain, fontSize: 22, fontWeight: '700' },
  h3: { color: colors.textMain, fontSize: 18, fontWeight: '600' },
  meta: { color: colors.textSub, fontSize: 13, marginTop: 4, lineHeight: 19 },
  muted: { color: colors.textSub, fontSize: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    flexWrap: 'wrap',
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 140 },
  pressed: { opacity: 0.85 },
  pName: { color: colors.textMain, fontSize: 14, fontWeight: '600' },
  pSub: { color: colors.textSub, fontSize: 12 },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  actionsCol: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', width: '100%' },
  resultLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  responsibleRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  resultScore: { color: colors.gold, fontSize: 20, fontWeight: '700', fontFamily: fontMono },
  setsLine: { color: colors.textSub, fontSize: 12, fontFamily: fontMono, letterSpacing: 1 },
  label: { color: colors.textMain, fontSize: 14, fontWeight: '700', marginTop: spacing.md },
  modalRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  setLabel: { color: colors.textSub, fontSize: 13, width: 64 },
  scoreInput: {
    width: 64,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    color: colors.textMain,
    fontSize: 16,
    fontFamily: fontMono,
    textAlign: 'center',
  },
  colon: { color: colors.textSub, fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' },
});
