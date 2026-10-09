import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputKeyPressEventData,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { api } from '../api/client';
import { AuthLayout } from '../components/AuthLayout';
import { Banner, Btn } from '../components/ui';
import { formatMMSS, useAuth, useToast } from '../store';
import { colors, radius, spacing } from '../theme';

/** A3. Подтверждение email -> POST /register/verify-email/ */
const CODE_LEN = 6;
const WINDOW_SEC = 10 * 60;

export default function VerifyScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState<string>(route.params?.email ?? 'player@volley.app');
  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(WINDOW_SEC * 1000);
  const refs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (!route.params?.email) {
      AsyncStorage.getItem('va_reg_email').then((v) => v && setEmail(v)).catch(() => undefined);
    }
  }, [route.params?.email]);

  useEffect(() => {
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const expired = left === 0;

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, '').slice(-1);
    setDigits((d) => d.map((x, idx) => (idx === i ? clean : x)));
    setError(null);
    if (clean && i < CODE_LEN - 1) refs.current[i + 1]?.focus();
  }

  function onKeyPress(i: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }

  async function submit() {
    const code = digits.join('');
    if (code.length < CODE_LEN) return setError('Введите все 6 цифр');
    if (expired) return setError('Код истёк — запросите новый');
    setLoading(true);
    try {
      const res = await api.verifyEmail({ email, code });
      login(email.split('@')[0], res.role === 'organizer' ? 'organizer' : 'player');
      toast.push('Email подтверждён 🎉', 'success');
      const profile = await api.me().catch(() => null);
      nav.reset({ index: 0, routes: [{ name: profile?.id ? 'Tabs' : 'Onboarding' }] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка';
      if (/час|попыт|rate/i.test(msg)) setRateLimited(true);
      else {
        setError(msg || 'Неверный код подтверждения');
        setDigits(Array(CODE_LEN).fill(''));
        refs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    try {
      await api.resendCode(email);
      toast.push('Новый код отправлен', 'success');
    } catch {
      toast.push('Не более 3 попыток в час. Попробуйте через 45 мин', 'error');
    } finally {
      setDigits(Array(CODE_LEN).fill(''));
      setLeft(WINDOW_SEC * 1000);
      setError(null);
      setRateLimited(false);
      refs.current[0]?.focus();
    }
  }

  return (
    <AuthLayout
      title="Код подтверждения"
      subtitle={
        <>
          Мы отправили 6-значный код на{' '}
          <Text style={{ color: colors.textMain, fontWeight: '700' }}>{email}</Text>
        </>
      }
    >
      {rateLimited ? (
        <Banner kind="warning" icon="⏳">
          Не более 3 попыток в час. Попробуйте через 45 мин.
        </Banner>
      ) : error ? (
        <Banner kind="error" icon="⚠️">
          {error}
        </Banner>
      ) : null}

      <View style={styles.otpRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            onChangeText={(t) => setDigit(i, t)}
            onKeyPress={(e) => onKeyPress(i, e)}
            keyboardType="number-pad"
            maxLength={1}
            editable={!expired}
            style={[
              styles.otpCell,
              Boolean(d) && { borderColor: colors.primary },
              Boolean(error) && { borderColor: colors.danger },
            ]}
            accessibilityLabel={`Цифра ${i + 1}`}
          />
        ))}
      </View>

      <View style={styles.rowBetween}>
        <Text style={[styles.timer, expired && { color: colors.danger, fontWeight: '700' }]}>
          {expired ? 'Код истёк' : `Код действителен ${formatMMSS(left)}`}
        </Text>
        <Pressable onPress={resend}>
          <Text style={styles.link}>Отправить ещё раз</Text>
        </Pressable>
      </View>

      <Btn onPress={submit} loading={loading} block>
        Подтвердить
      </Btn>

      <Pressable onPress={() => nav.navigate('Login')} style={styles.back}>
        <Text style={styles.link}>← Вернуться ко входу</Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  otpRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  otpCell: {
    flex: 1,
    maxWidth: 52,
    height: 56,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMain,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  timer: { color: colors.textSub, fontSize: 14 },
  link: { color: colors.accent, fontWeight: '600' },
  back: { alignItems: 'center' },
});
