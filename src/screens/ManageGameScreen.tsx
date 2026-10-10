import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { api } from '../api/client';
import type { GameDetail } from '../types';
import {
  AppHeader,
  Avatar,
  Bar,
  Btn,
  Card,
  GameStatusBadge,
  LevelBadge,
  Screen,
  Skeleton,
  contentStyle,
  formatDate,
  formatMoney,
} from '../components/ui';
import { useToast } from '../store';
import { colors, fontMono, radius, spacing } from '../theme';

interface ParticipantLite {
  id: number;
  player_name: string;
  player_elo: number;
  status: number; // 1 registered, 2 confirmed, 3 attended, 4 no_show
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
          </Card>
        )}

        <Card style={{ gap: spacing.md }}>
          <Text style={styles.h3}>Участники</Text>
          {players.map((p) => (
            <View key={p.id} style={styles.participant}>
              <Avatar name={p.player_name} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pName}>{p.player_name}</Text>
                <Text style={styles.pSub}>ELO {p.player_elo}</Text>
              </View>
              <View style={styles.row}>
                <View style={[styles.statusBadge, statusStyle(p.status)]}>
                  <Text style={[styles.statusText, statusTextStyle(p.status)]}>{statusLabel(p.status)}</Text>
                </View>
              </View>
              <View style={styles.actionsCol}>
                {p.status === 1 ? (
                  <>
                    <Btn
                      kind="success"
                      small
                      loading={busyId === p.id}
                      onPress={() => act(p.id, (g) => api.markPaid(g), `${p.player_name}: оплачено ✅`)}
                    >
                      Оплатил
                    </Btn>
                    <Btn
                      kind="danger"
                      small
                      onPress={() =>
                        act(p.id, () => api.cancelRegistration(gid).then(() => null), 'Удалён за неоплату')
                      }
                    >
                      Удалить
                    </Btn>
                  </>
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
          ))}
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
  pName: { color: colors.textMain, fontSize: 14, fontWeight: '600' },
  pSub: { color: colors.textSub, fontSize: 12 },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  actionsCol: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', width: '100%' },
});
