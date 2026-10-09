import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';
import { Screen } from './ui';

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
            <Text style={styles.ball}>🏐</Text>
            <Text style={styles.brandText}>VolleyApp</Text>
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
  brand: { alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  ball: { fontSize: 40 },
  brandText: { color: colors.primary, fontSize: 22, fontWeight: '700' },
  title: { color: colors.textMain, fontSize: 26, fontWeight: '700' },
  subtitle: { color: colors.textSub, fontSize: 15, marginTop: -spacing.md },
});
