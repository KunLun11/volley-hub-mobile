import React, { useState } from 'react';
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { Text } from './Text';

import { colors, fontFor, radius, spacing } from '../theme';

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label?: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export const Input = React.forwardRef<TextInput, TextInputProps & { invalid?: boolean }>(
  ({ invalid, style, ...rest }, ref) => (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.textMuted}
      style={[styles.input, invalid && styles.inputInvalid, style]}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';

export function TextArea(props: TextInputProps & { invalid?: boolean }) {
  const { invalid, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      multiline
      textAlignVertical="top"
      style={[styles.input, styles.textarea, invalid && styles.inputInvalid, style]}
      {...rest}
    />
  );
}

export interface Option<T> {
  label: string;
  value: T;
}

/** Аналог <select>: открывает модальный список опций (в RN нет нативного селекта). */
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: T | null;
  options: Option<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <Pressable style={styles.select} onPress={() => setOpen(true)}>
        <Text style={[styles.selectText, !current && styles.placeholder]} numberOfLines={1}>
          {current ? current.label : placeholder ?? 'Выберите'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      <RNModal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <ScrollView>
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <Pressable
                    key={String(o.value)}
                    style={styles.optRow}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optText, active && styles.optActive]}>{o.label}</Text>
                    {active ? <Text style={styles.optCheck}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </RNModal>
    </>
  );
}

export function RadioPills<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.pillGroup}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CheckboxRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable style={styles.checkboxRow} onPress={onToggle}>
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
      </View>
      <Text style={styles.checkboxLabel}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: colors.textSub, fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: radius.md,
    color: colors.textMain,
    fontSize: 16,
    fontFamily: fontFor('body', '400'),
  },
  inputInvalid: { borderColor: colors.danger },
  textarea: { minHeight: 96, paddingTop: 12 },
  error: { color: colors.danger, fontSize: 12 },
  hint: { color: colors.textMuted, fontSize: 12 },
  select: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: radius.md,
  },
  selectText: { color: colors.textMain, fontSize: 16, flex: 1, fontFamily: fontFor('body', '400') },
  placeholder: { color: colors.textMuted },
  chevron: { color: colors.textSub, fontSize: 14, marginLeft: 8 },
  sheetOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.surface2,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border2,
    paddingVertical: spacing.sm,
  },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
  },
  optText: { color: colors.textMain, fontSize: 16 },
  optActive: { color: colors.primary, fontWeight: '700' },
  optCheck: { color: colors.primary, fontSize: 16 },
  pillGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { borderColor: 'rgba(59,130,246,0.55)', backgroundColor: colors.infoBg },
  pillText: { color: colors.textSub, fontSize: 13.5, fontWeight: '500' },
  pillTextActive: { color: colors.accent, fontWeight: '700' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.borderHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkboxMark: { color: colors.accentInk, fontSize: 13, fontWeight: '900' },
  checkboxLabel: { color: colors.textSub, fontSize: 14, flexShrink: 1 },
});
