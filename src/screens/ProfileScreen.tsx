import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/client';
import type { PlayerProfile } from '../types';
import { POSITIONS, SKILL_LEVELS } from '../types';
import {
  Avatar,
  Bar,
  Btn,
  Card,
  EmptyState,
  Icon,
  Skeleton,
  contentStyle,
} from '../components/ui';
import { Field, Input, RadioPills, Select } from '../components/form';
import { pickImageDataUri } from '../lib/image';
import { useAuth, useToast } from '../store';
import { useNavigation } from '@react-navigation/native';
import { colors, fontMono, radius, spacing } from '../theme';

/** Ранги по ELO (янтарь = данные, brand-spec.md) */
const TIERS = [
  { name: 'Бронза', min: 0, max: 1200 },
  { name: 'Серебро', min: 1200, max: 1500 },
  { name: 'Золото', min: 1500, max: 1800 },
  { name: 'Платина', min: 1800, max: 2100 },
  { name: 'Алмаз', min: 2100, max: 2600 },
];

/** Б5. Профиль -> GET /users/me/ + PATCH profiles/... */
export default function ProfileScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const { isAuth } = useAuth();

  const [p, setP] = useState<PlayerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    birth_date: '',
    gender: 'M',
    city: '',
    skill_level: '4',
    position: '4',
  });
  const [eloAnim, setEloAnim] = useState(0);

  useEffect(() => {
    if (!isAuth) return;
    api
      .me()
      .then((prof) => {
        setP(prof);
        setForm({
          first_name: prof.first_name,
          last_name: prof.last_name,
          middle_name: prof.middle_name,
          birth_date: prof.birth_date,
          gender: prof.gender || 'M',
          city: prof.city,
          skill_level: prof.skill_level || '4',
          position: prof.position || '4',
        });
      })
      .catch(() => toast.push('Не удалось загрузить профиль', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  // «Оживление» цифры ELO: плавно набираем значение от 0 до рейтинга.
  useEffect(() => {
    if (!p) return;
    let v = 0;
    const target = p.elo_rating;
    const step = Math.max(1, Math.round(target / 40));
    setEloAnim(0);
    const t = setInterval(() => {
      v = Math.min(target, v + step);
      setEloAnim(v);
      if (v >= target) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  }, [p]);

  async function choosePhoto() {
    const { dataUri, error } = await pickImageDataUri();
    if (error) setPhotoError(error);
    if (dataUri) {
      setPhotoError(null);
      setPhoto(dataUri);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        middle_name: form.middle_name,
        birth_date: form.birth_date || undefined,
        gender: form.gender,
        city: form.city,
        skill_level: Number(form.skill_level),
        position: Number(form.position),
        ...(photo ? { photo } : {}),
      });
      setP(updated);
      setPhoto(null);
      setEditing(false);
      toast.push('Профиль сохранён', 'success');
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Не удалось сохранить профиль', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!isAuth) {
    return (
      <ScrollView contentContainerStyle={contentStyle}>
        <EmptyState
          text="Войдите, чтобы увидеть профиль и рейтинг ELO"
          action={<Btn onPress={() => nav.navigate('Login')}>Войти</Btn>}
        />
      </ScrollView>
    );
  }

  if (!p) {
    return (
      <ScrollView contentContainerStyle={contentStyle}>
        <Skeleton height={180} />
        <Skeleton height={120} />
      </ScrollView>
    );
  }

  const name = `${p.first_name} ${p.last_name}`.trim() || 'Игрок';

  /* ELO -> тир + подуровень (III/II/I) + прогресс до следующего */
  const tierIdxRaw = TIERS.findIndex((t) => p.elo_rating < t.max);
  const tierIdx = tierIdxRaw === -1 ? TIERS.length - 1 : tierIdxRaw;
  const tier = TIERS[tierIdx];
  const nextTier = TIERS[tierIdx + 1];
  const tierPct = Math.min(1, Math.max(0, (p.elo_rating - tier.min) / (tier.max - tier.min)));
  const roman = tierPct < 0.34 ? 'III' : tierPct < 0.67 ? 'II' : 'I';
  const rankName = `${tier.name} ${roman}`;

  return (
    <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Профиль</Text>

      <Card style={styles.head}>
        <Avatar name={name} size={72} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.sub}>
            {p.user.email} · {p.city || 'город не указан'}
          </Text>
          <View style={styles.badges}>
            <View style={styles.pillInfo}>
              <Text style={styles.pillInfoText}>
                Уровень: {SKILL_LEVELS[Number(p.skill_level) as keyof typeof SKILL_LEVELS] ?? '—'}
              </Text>
            </View>
            <View style={styles.pillPrimary}>
              <Text style={styles.pillPrimaryText}>
                {POSITIONS[Number(p.position) as keyof typeof POSITIONS] ?? 'Амплуа не указано'}
              </Text>
            </View>
          </View>
        </View>
        <Btn kind="secondary" small onPress={() => setEditing((e) => !e)}>
          {editing ? 'Отмена' : 'Изменить'}
        </Btn>
      </Card>

      <Card style={styles.rank}>
        <View style={styles.rankTop}>
          <View style={styles.rankBadge}>
            <View style={styles.rankIc}>
              <Icon name="medal-outline" size={26} color={colors.gold} />
            </View>
            <View>
              <Text style={styles.rankName}>{rankName}</Text>
              <Text style={styles.rankSub}>
                {nextTier ? `до ${nextTier.name} ${Math.max(0, tier.max - p.elo_rating)} ELO` : 'максимальный ранг'}
              </Text>
            </View>
          </View>
          <Text style={styles.rankElo} aria-label={`Рейтинг ELO ${p.elo_rating}`}>
            {eloAnim}
          </Text>
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <Bar value={Math.round(tierPct * 100)} max={100} variant="gold" />
          <View style={styles.rankLabels}>
            <Text style={styles.rankLabelText}>
              {tier.name} · {tier.min}
            </Text>
            <Text style={styles.rankLabelText}>{nextTier ? `${nextTier.name} · ${tier.max}` : 'MAX'}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Stat num={eloAnim} cap="Рейтинг ELO" accent />
        <Stat num={p.total_games} cap="Всего игр" />
        <Stat num={p.total_tournament} cap="Турниры" />
        <Stat num={`${p.completion_percentage}%`} cap="Заполненность профиля" bar={p.completion_percentage} />
      </View>

      {editing ? (
        <Card style={{ gap: spacing.lg }}>
          <Text style={styles.h3}>Редактирование</Text>
          <Field label="Фото профиля" error={photoError}>
            <Pressable style={styles.photoDrop} onPress={choosePhoto}>
              {photo ? (
                <Text style={styles.photoDropText}>✓ Новое фото выбрано</Text>
              ) : (
                <Text style={styles.photoDropText}>📷 Выбрать фото · jpg, png, webp · до 5 МБ</Text>
              )}
            </Pressable>
          </Field>

          <Field label="Имя">
            <Input value={form.first_name} onChangeText={(t) => setForm({ ...form, first_name: t })} />
          </Field>
          <Field label="Фамилия">
            <Input value={form.last_name} onChangeText={(t) => setForm({ ...form, last_name: t })} />
          </Field>
          <Field label="Отчество">
            <Input value={form.middle_name} onChangeText={(t) => setForm({ ...form, middle_name: t })} />
          </Field>
          <Field label="Дата рождения" hint="Формат: ГГГГ-ММ-ДД">
            <Input value={form.birth_date} onChangeText={(t) => setForm({ ...form, birth_date: t })} placeholder="1995-05-20" />
          </Field>
          <Field label="Город">
            <Input value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} />
          </Field>

          <Field label="Пол">
            <RadioPills
              value={form.gender}
              onChange={(v) => setForm({ ...form, gender: String(v) })}
              options={[
                { label: 'Мужской', value: 'M' },
                { label: 'Женский', value: 'F' },
                { label: 'Не указан', value: 'O' },
              ]}
            />
          </Field>

          <Field label="Уровень игры">
            <Select
              value={form.skill_level}
              onChange={(v) => setForm({ ...form, skill_level: String(v) })}
              options={Object.entries(SKILL_LEVELS).map(([v, l]) => ({ label: l, value: v }))}
            />
          </Field>

          <Field label="Амплуа">
            <Select
              value={form.position}
              onChange={(v) => setForm({ ...form, position: String(v) })}
              options={Object.entries(POSITIONS).map(([v, l]) => ({ label: l, value: v }))}
            />
          </Field>

          <Btn onPress={save} loading={saving} disabled={!form.first_name.trim() || !form.last_name.trim()} block>
            Сохранить
          </Btn>
        </Card>
      ) : null}

      <Card style={{ gap: spacing.sm }}>
        <Text style={styles.h3}>Как работает ELO?</Text>
        <Text style={styles.body}>
          После каждой игры рейтинг пересчитывается по формуле Эло: победа над более сильными соперниками даёт больше
          очков, поражение от слабых — снимает больше. Отметка «совпал ли уровень» помогает калибровать систему.
        </Text>
      </Card>
    </ScrollView>
  );
}

function Stat({ num, cap, accent, bar }: { num: number | string; cap: string; accent?: boolean; bar?: number }) {
  return (
    <Card style={styles.stat}>
      <Text style={[styles.statNum, accent && { color: colors.gold }]}>{num}</Text>
      <Text style={styles.statCap}>{cap}</Text>
      {bar !== undefined ? (
        <View style={{ marginTop: 8 }}>
          <Bar value={bar} variant="info" />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.textMain, fontSize: 28, fontWeight: '700' },
  h3: { color: colors.textMain, fontSize: 18, fontWeight: '600' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' },
  name: { color: colors.textMain, fontSize: 22, fontWeight: '700' },
  sub: { color: colors.textSub, fontSize: 14 },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  pillInfo: { backgroundColor: colors.infoBg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  pillInfoText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  pillPrimary: { backgroundColor: colors.infoBg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  pillPrimaryText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: 150, alignItems: 'center', padding: spacing.lg },
  statNum: { color: colors.accent, fontSize: 28, fontWeight: '700', fontFamily: fontMono },
  statCap: { color: colors.textSub, fontSize: 12, marginTop: 4, textAlign: 'center' },
  rank: {
    borderWidth: 1,
    borderColor: 'rgba(245,165,36,0.32)',
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: 0,
  },
  rankTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  rankIc: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,165,36,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245,165,36,0.40)',
  },
  rankName: { color: colors.textMain, fontSize: 19, fontWeight: '700' },
  rankSub: { color: colors.meta, fontSize: 11.5, fontFamily: fontMono, marginTop: 2 },
  rankElo: { color: colors.gold, fontSize: 32, fontWeight: '800', fontFamily: fontMono },
  rankLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  rankLabelText: { color: colors.textSub, fontSize: 11, fontFamily: fontMono },
  photoDrop: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 24,
    alignItems: 'center',
  },
  photoDropText: { color: colors.textSub, fontSize: 14, textAlign: 'center' },
  body: { color: colors.textSub, fontSize: 14, lineHeight: 20 },
});
