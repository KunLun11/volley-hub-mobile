import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { api } from '../api/client';
import { AuthLayout } from '../components/AuthLayout';
import { Banner, Btn, Modal } from '../components/ui';
import { CheckboxRow, Field, Input } from '../components/form';
import { useAuth, useToast } from '../store';
import { colors } from '../theme';

/** A1. Вход: email+password -> POST /auth/login/ (TokenPair) */
export default function LoginScreen() {
  const nav = useNavigation<any>();
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disableModal, setDisableModal] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!/.+@.+\..+/.test(email)) return setError('Введите корректный email');
    if (!password) return setError('Введите пароль');
    setLoading(true);
    try {
      await api.login({ email, password });
      login(email.split('@')[0], 'player');
      toast.push('Добро пожаловать!', 'success');
      if (nav.canGoBack()) nav.goBack();
      else nav.navigate('Tabs');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка входа';
      if (/не подтверждён|верифицирован/i.test(msg)) setDisableModal(true);
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="С возвращением" subtitle="Войдите, чтобы записаться на игру">
      {error ? (
        <Banner kind="error" icon="⚠️">
          {error}
        </Banner>
      ) : null}

      <View style={styles.form}>
        <Field label="Email">
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            invalid={Boolean(error) && !/.+@.+\..+/.test(email)}
          />
        </Field>

        <Field label="Пароль">
          <View>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Минимум 8 символов"
              secureTextEntry={!showPass}
              autoCapitalize="none"
              style={{ paddingRight: 52 }}
            />
            <Pressable style={styles.eye} onPress={() => setShowPass((s) => !s)}>
              <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
            </Pressable>
          </View>
        </Field>

        <View style={styles.rowBetween}>
          <CheckboxRow checked={remember} onToggle={() => setRemember((r) => !r)}>
            Запомнить меня
          </CheckboxRow>
          <Pressable onPress={() => toast.push('Ссылка сброса пароля будет доступна позже', 'info')}>
            <Text style={styles.link}>Забыли пароль?</Text>
          </Pressable>
        </View>

        <Btn onPress={onSubmit} loading={loading} block>
          Войти
        </Btn>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Нет аккаунта?{' '}
          <Text style={styles.link} onPress={() => nav.navigate('Register')}>
            Зарегистрироваться
          </Text>
        </Text>
      </View>

      <Modal visible={disableModal} onClose={() => setDisableModal(false)}>
        <Text style={styles.modalIcon}>📭</Text>
        <Text style={styles.modalTitle}>Аккаунт не подтверждён</Text>
        <Text style={styles.modalText}>
          Проверьте почту — мы отправили код подтверждения. Без активации вход невозможен.
        </Text>
        <View style={styles.modalActions}>
          <Btn kind="secondary" onPress={() => setDisableModal(false)}>
            Понятно
          </Btn>
          <Btn
            onPress={() => {
              setDisableModal(false);
              nav.navigate('Verify', { email });
            }}
          >
            Ввести код
          </Btn>
        </View>
      </Modal>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  eye: { position: 'absolute', right: 6, top: 4, padding: 10 },
  eyeText: { fontSize: 18 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  link: { color: colors.accent, fontWeight: '600' },
  footer: { alignItems: 'center' },
  footerText: { color: colors.textSub, fontSize: 15 },
  modalIcon: { fontSize: 44, textAlign: 'center' },
  modalTitle: { color: colors.textMain, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  modalText: { color: colors.textSub, textAlign: 'center', marginTop: 8 },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 20 },
});
