import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { api } from '../api/client';
import { AuthLayout } from '../components/AuthLayout';
import { Banner, Btn } from '../components/ui';
import { Field, Input } from '../components/form';
import { colors, radius, spacing } from '../theme';

/** A2. Регистрация шаг 1 -> POST /register/user/ */
export default function RegisterScreen() {
  const nav = useNavigation<any>();
  const [role, setRole] = useState<'player' | 'organizer'>('player');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  function maskPhone(raw: string): string {
    let d = raw.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (!d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    let out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ') ' + d.slice(4, 7);
    if (d.length >= 7) out += '-' + d.slice(7, 9);
    if (d.length >= 9) out += '-' + d.slice(9, 11);
    return out;
  }

  function validate(): string | null {
    if (!/.+@.+\..+/.test(email)) return 'Введите корректный email';
    if (phone.replace(/\D/g, '').length !== 11) return 'Телефон: +7 (999) 999-99-99';
    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Zа-яА-Я]/.test(password))
      return 'Пароль: минимум 8 символов, 1 цифра и 1 буква';
    if (password !== confirm) return 'Пароли не совпадают';
    return null;
  }

  async function onSubmit() {
    setEmailError(null);
    setGeneralError(null);
    const v = validate();
    if (v) return setGeneralError(v);
    setLoading(true);
    try {
      await api.register({ email, password, role, phone });
      await AsyncStorage.setItem('va_reg_email', email);
      nav.navigate('Verify', { email });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка регистрации';
      if (/занят|already|unique|409/i.test(msg)) setEmailError('Этот email уже зарегистрирован');
      else setGeneralError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Регистрация" subtitle="Шаг 1 из 3 — аккаунт">
      {generalError ? (
        <Banner kind="error" icon="⚠️">
          {generalError}
        </Banner>
      ) : null}

      <View style={styles.form}>
        <Field label="Кто вы?">
          <View style={styles.roleRow}>
            <RoleCard
              icon="🏐"
              title="Игрок"
              caption="Хочу играть по уровню"
              selected={role === 'player'}
              onPress={() => setRole('player')}
            />
            <RoleCard
              icon="📋"
              title="Организатор"
              caption="Создаю игры, собираю деньги"
              selected={role === 'organizer'}
              onPress={() => setRole('organizer')}
            />
          </View>
        </Field>

        <Field label="Email" error={emailError}>
          <Input
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setEmailError(null);
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            invalid={Boolean(emailError)}
          />
        </Field>

        <Field label="Телефон">
          <Input
            value={phone}
            onFocus={() => !phone && setPhone('+7 (')}
            onChangeText={(t) => setPhone(maskPhone(t))}
            placeholder="+7 (___) ___-__-__"
            keyboardType="phone-pad"
          />
        </Field>

        <Field label="Пароль">
          <View>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="8+ символов, цифра и буква"
              secureTextEntry={!showPass}
              autoCapitalize="none"
              style={{ paddingRight: 52 }}
            />
            <Pressable style={styles.eye} onPress={() => setShowPass((s) => !s)}>
              <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
            </Pressable>
          </View>
        </Field>

        <Field label="Повторите пароль">
          <Input value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />
        </Field>

        <Btn onPress={onSubmit} loading={loading} block>
          Создать аккаунт
        </Btn>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Уже есть аккаунт?{' '}
          <Text style={styles.link} onPress={() => nav.navigate('Login')}>
            Войти
          </Text>
        </Text>
      </View>
    </AuthLayout>
  );
}

function RoleCard({
  icon,
  title,
  caption,
  selected,
  onPress,
}: {
  icon: string;
  title: string;
  caption: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.roleCard, selected && styles.roleCardOn]} onPress={onPress}>
      <Text style={styles.roleIcon}>{icon}</Text>
      <Text style={styles.roleTitle}>{title}</Text>
      <Text style={styles.roleCaption}>{caption}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  roleRow: { flexDirection: 'row', gap: spacing.md },
  roleCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 2,
  },
  roleCardOn: { borderColor: colors.primary, backgroundColor: colors.infoBg },
  roleIcon: { fontSize: 26, marginBottom: 4 },
  roleTitle: { color: colors.textMain, fontWeight: '700' },
  roleCaption: { color: colors.textSub, fontSize: 12, textAlign: 'center' },
  eye: { position: 'absolute', right: 6, top: 4, padding: 10 },
  eyeText: { fontSize: 18 },
  footer: { alignItems: 'center' },
  footerText: { color: colors.textSub, fontSize: 15 },
  link: { color: colors.accent, fontWeight: '600' },
});
