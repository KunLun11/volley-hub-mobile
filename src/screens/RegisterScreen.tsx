import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { useNavigation } from '@react-navigation/native';

import { api } from '../api/client';
import { AuthLayout } from '../components/AuthLayout';
import { Banner, Btn, Icon, type IconName } from '../components/ui';
import { Field, Input } from '../components/form';
import { CONSENT_VERSION, legalUrl } from '../lib/legal';
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
  const [pdConsent, setPdConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

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
    setConsentError(null);
    const v = validate();
    if (v) return setGeneralError(v);
    // Согласие на обработку ПДн — обязательное условие регистрации.
    if (!pdConsent) {
      return setConsentError('Отметьте согласие на обработку персональных данных');
    }
    setLoading(true);
    try {
      await api.register({
        email,
        password,
        role,
        phone,
        personal_data_consent: true,
        personal_data_consent_version: CONSENT_VERSION,
        marketing_consent: marketingConsent,
      });
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
        <Banner kind="error" icon="alert-outline">
          {generalError}
        </Banner>
      ) : null}

      <View style={styles.form}>
        <Field label="Кто вы?">
          <View style={styles.roleRow}>
            <RoleCard
              icon="volleyball"
              title="Игрок"
              caption="Хочу играть по уровню"
              selected={role === 'player'}
              onPress={() => setRole('player')}
            />
            <RoleCard
              icon="calendar-check-outline"
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
              <Icon name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
            </Pressable>
          </View>
        </Field>

        <Field label="Повторите пароль">
          <Input value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />
        </Field>

        <View style={styles.consentBlock}>
          <ConsentCheckbox
            checked={pdConsent}
            onToggle={() => {
              setPdConsent((v) => !v);
              setConsentError(null);
            }}
            error={Boolean(consentError)}
          >
            Я принимаю{' '}
            <Text style={styles.consentLink} onPress={() => Linking.openURL(legalUrl('/legal/terms'))}>
              Пользовательское соглашение
            </Text>{' '}
            и даю{' '}
            <Text style={styles.consentLink} onPress={() => Linking.openURL(legalUrl('/legal/consent'))}>
              согласие на обработку персональных данных
            </Text>{' '}
            в соответствии с{' '}
            <Text style={styles.consentLink} onPress={() => Linking.openURL(legalUrl('/legal/privacy'))}>
              Политикой
            </Text>
            .
          </ConsentCheckbox>
          {consentError ? (
            <Text style={styles.consentError}>
              {consentError}
            </Text>
          ) : null}
          <ConsentCheckbox checked={marketingConsent} onToggle={() => setMarketingConsent((v) => !v)}>
            Согласен получать информационные и рекламные сообщения (необязательно).
          </ConsentCheckbox>
        </View>

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
  icon: IconName;
  title: string;
  caption: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.roleCard, selected && styles.roleCardOn]} onPress={onPress}>
      <View style={styles.roleIcon}>
        <Icon name={icon} size={26} color={selected ? colors.primary : colors.muted} />
      </View>
      <Text style={styles.roleTitle}>{title}</Text>
      <Text style={styles.roleCaption}>{caption}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleCard: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 2,
  },
  roleCardOn: { borderColor: 'rgba(59,130,246,0.55)', backgroundColor: colors.infoBg },
  roleIcon: { marginBottom: 4 },
  roleTitle: { color: colors.textMain, fontWeight: '700', fontSize: 14 },
  roleCaption: { color: colors.textSub, fontSize: 11.5, textAlign: 'center', lineHeight: 15 },
  eye: { position: 'absolute', right: 6, top: 4, padding: 10 },
  footer: { alignItems: 'center' },
  consentBlock: { gap: 10 },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  consentBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  consentBoxOn: { borderColor: colors.accent, backgroundColor: colors.infoBg },
  consentBoxError: { borderColor: colors.danger },
  consentText: { flex: 1, color: colors.textSub, fontSize: 12.5, lineHeight: 18 },
  consentLink: { color: colors.accent, fontWeight: '600' },
  consentError: { color: colors.danger, fontSize: 12 },
  footerText: { color: colors.textSub, fontSize: 15 },
  link: { color: colors.accent, fontWeight: '600' },
});

/** Чекбокс для юридических согласий (текст с интерактивными ссылками). */
function ConsentCheckbox({
  checked,
  onToggle,
  error,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.consentRow}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        style={[styles.consentBox, checked && styles.consentBoxOn, error && styles.consentBoxError]}
      >
        {checked ? <Icon name="check" size={14} color={colors.accentInk} /> : null}
      </Pressable>
      <Text style={styles.consentText}>{children}</Text>
    </View>
  );
}
