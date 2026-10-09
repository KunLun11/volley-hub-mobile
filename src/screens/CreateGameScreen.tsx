import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { api } from '../api/client';
import { GENDER_RESTRICTION, SKILL_LEVELS, type ApiLocation, type CreateGame } from '../types';
import {
  AppHeader,
  Btn,
  Card,
  GenderText,
  LevelBadge,
  Screen,
  Skeleton,
  contentStyle,
  formatDate,
  formatMoney,
} from '../components/ui';
import { Field, Input, RadioPills, Select, TextArea } from '../components/form';
import { useToast } from '../store';
import { colors, spacing } from '../theme';

/** В1. Создание игры -> POST /games/ */
export default function CreateGameScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    title: '',
    date: today,
    time: '19:30',
    location_id: 0,
    capacity: 12,
    price: 600,
    skill_level: 4,
    gender: 0,
    duration_minutes: 120,
    description: '',
  });
  const [busy, setBusy] = useState<'draft' | 'publish' | null>(null);
  const [locations, setLocations] = useState<ApiLocation[]>([]);
  const [locLoading, setLocLoading] = useState(true);

  useEffect(() => {
    api
      .locations()
      .then((list) => {
        setLocations(list);
        if (list.length) setForm((f) => (f.location_id ? f : { ...f, location_id: list[0].id }));
      })
      .catch(() => toast.push('Не удалось загрузить список залов', 'error'))
      .finally(() => setLocLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(statusDraft: boolean) {
    if (!form.title.trim()) return toast.push('Укажите название игры', 'error');
    if (!form.location_id) return toast.push('Выберите зал', 'error');
    setBusy(statusDraft ? 'draft' : 'publish');
    const payload: CreateGame = {
      location_id: Number(form.location_id),
      title: form.title,
      date_time: new Date(`${form.date}T${form.time}:00`).toISOString(),
      duration_minutes: Number(form.duration_minutes),
      capacity: Number(form.capacity),
      price: Number(form.price),
      skill_level: Number(form.skill_level),
      gender: Number(form.gender),
      status: statusDraft ? 0 : 1,
      is_tournament: false,
      description: form.description,
    };
    try {
      const g = await api.createGame(payload);
      toast.push(statusDraft ? 'Черновик сохранён' : 'Игра опубликована 🎉', 'success');
      if (statusDraft) nav.navigate('Organizer');
      else nav.replace('GameDetails', { id: g.id });
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Не удалось создать игру', 'error');
    } finally {
      setBusy(null);
    }
  }

  const selectedLoc = locations.find((l) => l.id === form.location_id);

  return (
    <Screen>
      <AppHeader />
      <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Новая игра</Text>

        <Card style={{ gap: spacing.lg }}>
          <Field label="Название">
            <Input
              value={form.title}
              onChangeText={(t) => setForm({ ...form, title: t })}
              placeholder="Вечерний микст 6×6"
            />
          </Field>

          <View style={styles.grid2}>
            <View style={{ flex: 1 }}>
              <Field label="Дата" hint="ГГГГ-ММ-ДД">
                <Input value={form.date} onChangeText={(t) => setForm({ ...form, date: t })} autoCapitalize="none" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Время" hint="ЧЧ:ММ">
                <Input value={form.time} onChangeText={(t) => setForm({ ...form, time: t })} autoCapitalize="none" />
              </Field>
            </View>
          </View>

          <Field label="Зал">
            {locLoading ? (
              <Skeleton height={48} />
            ) : locations.length === 0 ? (
              <Input editable={false} value="" placeholder="Локации не найдены — добавьте их в админке Django" />
            ) : (
              <Select
                value={form.location_id}
                onChange={(v) => setForm({ ...form, location_id: Number(v) })}
                options={locations.map((l) => ({
                  label: `${l.name} — ${l.city || 'город не указан'}, ${l.address || 'адрес не указан'}`,
                  value: l.id,
                }))}
              />
            )}
          </Field>

          <View style={styles.grid3}>
            <View style={{ flex: 1 }}>
              <Field label="Лимит игроков">
                <Input
                  value={String(form.capacity)}
                  onChangeText={(t) => setForm({ ...form, capacity: Number(t.replace(/\D/g, '')) || 0 })}
                  keyboardType="number-pad"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Цена, ₽">
                <Input
                  value={String(form.price)}
                  onChangeText={(t) => setForm({ ...form, price: Number(t.replace(/\D/g, '')) || 0 })}
                  keyboardType="number-pad"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Длит., мин">
                <Input
                  value={String(form.duration_minutes)}
                  onChangeText={(t) => setForm({ ...form, duration_minutes: Number(t.replace(/\D/g, '')) || 0 })}
                  keyboardType="number-pad"
                />
              </Field>
            </View>
          </View>

          <Field label="Уровень игры">
            <Select
              value={form.skill_level}
              onChange={(v) => setForm({ ...form, skill_level: Number(v) })}
              options={Object.entries(SKILL_LEVELS).map(([v, l]) => ({ label: `${v}. ${l}`, value: Number(v) }))}
            />
          </Field>

          <Field label="Формат">
            <RadioPills
              value={form.gender}
              onChange={(v) => setForm({ ...form, gender: Number(v) })}
              options={Object.entries(GENDER_RESTRICTION).map(([v, l]) => ({ label: l, value: Number(v) }))}
            />
          </Field>

          <Field label="Описание">
            <TextArea
              value={form.description}
              onChangeText={(t) => setForm({ ...form, description: t })}
              placeholder="Мячи наши. Приходите за 10 минут до начала."
            />
          </Field>

          {/* Превью карточки */}
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.label}>Так игру увидят игроки:</Text>
            <Card style={styles.preview}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewTitle}>{form.title || 'Название игры'}</Text>
                  <Text style={styles.previewMeta}>
                    {formatDate(new Date(`${form.date}T${form.time}:00`).toISOString())} · {form.duration_minutes} мин
                  </Text>
                </View>
                <LevelBadge level={Number(form.skill_level)} />
              </View>
              <Text style={styles.previewMeta} numberOfLines={1}>
                📍 {selectedLoc ? `${selectedLoc.name}, ${selectedLoc.address || ''}` : 'Зал не выбран'}
              </Text>
              <View style={styles.rowBetween}>
                <Text style={styles.previewMeta}>
                  Свободно {form.capacity} из {form.capacity}
                </Text>
                <Text style={styles.price}>{formatMoney(Number(form.price))}</Text>
              </View>
              <Text style={styles.previewMeta}>
                Формат: <GenderText gender={Number(form.gender)} />
              </Text>
            </Card>
          </View>

          <Btn onPress={() => submit(false)} loading={busy === 'publish'} disabled={busy !== null} block>
            Опубликовать
          </Btn>
          <Btn
            kind="secondary"
            onPress={() => submit(true)}
            loading={busy === 'draft'}
            disabled={busy !== null}
            block
          >
            Сохранить как черновик
          </Btn>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.textMain, fontSize: 26, fontWeight: '700' },
  grid2: { flexDirection: 'row', gap: spacing.md },
  grid3: { flexDirection: 'row', gap: spacing.md },
  label: { color: colors.textSub, fontSize: 12, fontWeight: '500' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  preview: { gap: spacing.sm, padding: spacing.lg },
  previewTitle: { color: colors.textMain, fontSize: 17, fontWeight: '600' },
  previewMeta: { color: colors.textSub, fontSize: 13 },
  price: { color: colors.accent, fontSize: 18, fontWeight: '700' },
});
