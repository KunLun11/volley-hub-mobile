import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../theme';

export interface ToastItem {
  id: number;
  text: string;
  kind: 'info' | 'success' | 'error';
}

interface ToastCtx {
  push: (text: string, kind?: ToastItem['kind']) => void;
}

const Ctx = createContext<ToastCtx>({ push: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();

  const push = useCallback((text: string, kind: ToastItem['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <View style={[styles.stack, { bottom: insets.bottom + 92 }]} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} />
        ))}
      </View>
    </Ctx.Provider>
  );
}

function ToastView({ toast }: { toast: ToastItem }) {
  const anim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [anim]);
  const icon =
    toast.kind === 'success' ? 'check' : toast.kind === 'error' ? 'alert-outline' : 'information-outline';
  const accent = toast.kind === 'success' ? colors.success : toast.kind === 'error' ? colors.danger : colors.accent;
  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={17} color={accent} />
      <Text style={styles.text}>{toast.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border2,
  },
  text: { color: colors.textMain, fontSize: 14, flex: 1 },
});

export const useToast = () => useContext(Ctx);
