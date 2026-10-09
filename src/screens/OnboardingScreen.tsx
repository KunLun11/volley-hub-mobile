import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { api } from '../api/client';
import { POSITIONS, SKILL_LEVELS } from '../types';
import { AppHeader, Bar, Btn, Screen, contentStyle } from '../components/ui';
import { Field, Input, RadioPills, Select } from '../components/form';
import { pickImageDataUri } from '../lib/image';
import { useAuth, useToast } from '../store';
import { colors, radius, spacing } from '../theme';

/** A4. Онбординг: заполнение профиля игрока (профиль + обязательное фото). */
export default function OnboardingScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const { login } = useAuth();

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
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filled = useMemo(() => {
    const checks = [
      form.first_name.trim() !== '',
      form.last_name.trim() !== '',
      form.birth_date !== '',
      form.gender !== '',
      form.city.trim() !== '',
      form.skill_level !== '',
      form.position !== '',
      photo !== null,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, photo]);

  async function choosePhoto() {
    const { dataUri, error } = await pickImageDataUri();
    if (error) setPhotoError(error);
    if (dataUri) {
      setPhotoError(null);
      setPhoto(dataUri);
    }
  }

  async function save(asSkip = false) {
    if (asSkip) {
      login(form.first_name || 'Михаил', 'player');
      toast.push('Профиль можно дозаполнить позже', 'info');
      nav.reset({ index: 0, routes: [{ name: 'Tabs' }] });
      return;
    }
    if (!photo) {
      setPhotoError('Загрузите фото профиля — это обязательное поле');
      toast.push('Загрузите фото профиля', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.createProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        middle_name: form.middle_name,
        birth_date: form.birth_date || undefined,
        gender: form.gender,
        city: form.city,
        skill_level: Number(form.skill_level),
        position: Number(form.position),
        photo,
      });
      login(form.first_name || 'Михаил', 'player');
      toast.push('Профиль сохранён 🎉', 'success');
      nav.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось сохранить профиль';
      if (/уже существует|already/i.test(msg)) {
        toast.push('Профиль уже создан — открыли его', 'info');
        nav.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Profile' } }] });
      } else {
        toast.push(msg, 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppHeader />
      <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.h1}>Заполните профиль</Text>
          <View style={{ marginTop: 12 }}>
            <Bar value={filled} variant="info" />
            <Text style={styles.sub}>
              Чем полнее профиль — тем точнее подбор игр по уровню и соперников по ELO. Заполнено {filled}%.
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <Field label="Фото профиля *" error={photoError}>
            <Pressable style={styles.photoDrop} onPress={choosePhoto}>
              <Text style={styles.photoDropText}>
                {photo ? '✓ Фото выбрано — нажмите, чтобы заменить' : '📷 Выбрать фото · jpg, png, webp · до 5 МБ'}
              </Text>
            </Pressable>
          </Field>

          <Field label="Имя *">
            <Input value={form.first_name} onChangeText={(t) => setForm({ ...form, first_name: t })} placeholder="Михаил" />
          </Field>
          <Field label="Фамилия *">
            <Input value={form.last_name} onChangeText={(t) => setForm({ ...form, last_name: t })} placeholder="Волейбалов" />
          </Field>
          <Field label="Отчество (необязательно)">
            <Input value={form.middle_name} onChangeText={(t) => setForm({ ...form, middle_name: t })} />
          </Field>
          <Field label="Дата рождения" hint="Формат: ГГГГ-ММ-ДД">
            <Input value={form.birth_date} onChangeText={(t) => setForm({ ...form, birth_date: t })} placeholder="1995-05-20" />
          </Field>
          <Field label="Город">
            <Input value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} placeholder="Москва" />
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
            <RadioPills
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

          <Btn
            onPress={() => save()}
            loading={saving}
            disabled={!form.first_name || !form.last_name || !photo}
            block
          >
            Сохранить и продолжить
          </Btn>
          <Btn kind="ghost" onPress={() => save(true)} block>
            Пропустить
          </Btn>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.textMain, fontSize: 26, fontWeight: '700' },
  sub: { color: colors.textSub, fontSize: 13, marginTop: 8 },
  form: { gap: spacing.lg },
  photoDrop: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 24,
    alignItems: 'center',
  },
  photoDropText: { color: colors.textSub, fontSize: 14, textAlign: 'center' },
});
