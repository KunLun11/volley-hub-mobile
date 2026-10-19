import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';

import { colors, fontDisplay, spacing } from '../theme';
import { Icon, Screen } from './ui';

/**
 * Общий каркас экранов авторизации (эквивалент .auth-layout/.auth-wrapper в вебе):
 * логотип + заголовок + форма, с прокруткой и подъёмом над клавиатурой.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.brand}>
            <Icon name="volleyball" size={40} color={colors.accent} />
            <Text style={styles.brandText}>
              Volley<Text style={styles.brandAccent}>Hub</Text>
            </Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: 56, gap: spacing.lg },
  brand: { alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  brandText: { color: colors.textMain, fontSize: 22, fontWeight: '700', fontFamily: fontDisplay },
  brandAccent: { color: colors.accent2 },
  title: {
    color: colors.textMain,
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontFamily: fontDisplay,
  },
  subtitle: { color: colors.textSub, fontSize: 14, marginTop: -spacing.md, lineHeight: 20 },
});
