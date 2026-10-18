import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '../api/client';
import type { SetScore } from '../types';
import { Btn, Card } from './ui';
import { useToast } from '../store';
import { colors, fontMono, radius, spacing } from '../theme';

interface Props {
  gameId: number;
  setScores: SetScore[];
  /** Можно ли вводить счёт: организатор/ответственный, пока результат не зафиксирован. */
  canEdit: boolean;
  /** Подпись под заголовком (например, «Вы ответственный за счёт»). */
  hint?: string;
  /** Перезагрузить игру после сохранения. */
  onSaved: () => void;
}

/**
 * Счёт партий. Организатор или назначенный ответственный в перерыве между
 * партиями вводит результат очередного сета; остальные видят только счёт.
 */
export default function ScoreEntry({ gameId, setScores, canEdit, hint, onSaved }: Props) {
  const toast = useToast();
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  if (!canEdit && setScores.length === 0) return null;

  function resetForm() {
    setTeam1('');
    setTeam2('');
    setEditing(null);
  }

  function startEdit(index: number) {
    const score = setScores[index];
    setTeam1(String(score.team_1));
    setTeam2(String(score.team_2));
    setEditing(index);
  }

  async function save() {
    if (busy) return;
    const a = Number(team1.replace(/[^0-9]/g, ''));
    const b = Number(team2.replace(/[^0-9]/g, ''));
    if (!team1.trim() || !team2.trim() || a < 0 || b < 0) {
      toast.push('Укажите числовой счёт обеих команд', 'error');
      return;
    }
    if (a === b) {
      toast.push('Партия не может завершиться вничью', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.saveSetScore(gameId, { team_1: a, team_2: b, index: editing });
      toast.push(editing == null ? 'Счёт партии сохранён' : 'Партия обновлена', 'success');
      resetForm();
      onSaved();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Не удалось сохранить счёт', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(index: number) {
    if (busy) return;
    setBusy(true);
    try {
      await api.deleteSetScore(gameId, index);
      toast.push('Партия удалена', 'info');
      resetForm();
      onSaved();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Не удалось удалить партию', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: spacing.sm }}>
      <Text style={styles.h3}>Счёт партий</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {setScores.length === 0 ? (
        <Text style={styles.muted}>Партии ещё не введены.</Text>
      ) : (
        <View style={{ gap: spacing.xs }}>
          {setScores.map((s, i) => (
            <View key={i} style={styles.setRow}>
              <Text style={styles.setLabel}>Партия {i + 1}</Text>
              <Text style={styles.setScore}>
                {s.team_1}:{s.team_2}
              </Text>
              {canEdit ? (
                <View style={styles.setActions}>
                  <Btn kind="ghost" small onPress={() => startEdit(i)} disabled={busy}>
                    Изменить
                  </Btn>
                  <Btn kind="danger" small onPress={() => remove(i)} disabled={busy}>
                    Удалить
                  </Btn>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {canEdit ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Text style={styles.label}>
            {editing == null ? 'Добавить партию' : `Изменить партию ${editing + 1}`}
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={team1}
              onChangeText={setTeam1}
              placeholder="Команда 1"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Счёт команды 1"
            />
            <Text style={styles.colon}>:</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={team2}
              onChangeText={setTeam2}
              placeholder="Команда 2"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Счёт команды 2"
            />
          </View>
          <View style={styles.actionRow}>
            <Btn kind="success" onPress={save} loading={busy}>
              {editing == null ? 'Сохранить партию' : 'Сохранить'}
            </Btn>
            {editing != null ? (
              <Btn kind="ghost" onPress={resetForm} disabled={busy}>
                Отмена
              </Btn>
            ) : null}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  h3: { color: colors.textMain, fontSize: 18, fontWeight: '600' },
  hint: { color: colors.textSub, fontSize: 13 },
  muted: { color: colors.textSub, fontSize: 14 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSoft,
    flexWrap: 'wrap',
  },
  setLabel: { color: colors.textMuted, fontSize: 13, minWidth: 64 },
  setScore: { color: colors.gold, fontSize: 18, fontWeight: '700', fontFamily: fontMono },
  setActions: { flexDirection: 'row', gap: spacing.xs, marginLeft: 'auto' },
  label: { color: colors.textMain, fontSize: 14, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textMain,
    fontSize: 16,
    fontFamily: fontMono,
  },
  colon: { color: colors.textMuted, fontSize: 18 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
