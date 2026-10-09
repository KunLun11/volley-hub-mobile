import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  type GestureResponderEvent,
  Modal as RNModal,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import {
  GAME_STATUS,
  GENDER_RESTRICTION,
  PARTICIPANT_STATUS,
  SKILL_LEVELS,
  type GameList,
} from '../types';
import { avatarHue, colors, LEVEL_COLORS, radius, spacing } from '../theme';
import { useAuth, useToast } from '../store';

/* ---------------- Форматирование (копия веб-хелперов) ---------------- */

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (same(d, today)) return `Сегодня, ${time}`;
  if (same(d, tomorrow)) return `Завтра, ${time}`;
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, ${time}`;
}

export function formatMoney(p?: number | null): string {
  if (p === null || p === undefined) return 'Бесплатно';
  return `${p.toLocaleString('ru-RU')} ₽`;
}

/* ---------------- Базовые контейнеры ---------------- */

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.appBg} pointerEvents="none" />
      {children}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

/* ---------------- Кнопка ---------------- */

const BTN: Record<string, { bg: string; border: string; fg: string }> = {
  primary: { bg: colors.accent, border: 'transparent', fg: '#ffffff' },
  secondary: { bg: colors.surface, border: colors.border, fg: colors.textMain },
  ghost: { bg: 'transparent', border: 'transparent', fg: colors.textSub },
  danger: { bg: colors.dangerBg, border: 'rgba(239,68,68,0.35)', fg: colors.danger },
  success: { bg: colors.successBg, border: 'rgba(34,197,94,0.35)', fg: colors.success },
};

export function Btn({
  kind = 'primary',
  loading,
  disabled,
  onPress,
  children,
  small,
  block,
  style,
}: {
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  small?: boolean;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = BTN[kind];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
        small && styles.btnSm,
        block && styles.btnBlock,
        inactive && { opacity: 0.5 },
        pressed && !inactive && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <Text style={[styles.btnText, { color: palette.fg }]} numberOfLines={1}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

/* ---------------- Бейджи ---------------- */

export function Badge({
  variant = 'muted',
  children,
}: {
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'muted' | 'primary';
  children: React.ReactNode;
}) {
  const map: Record<string, { bg: string; fg: string }> = {
    info: { bg: colors.infoBg, fg: colors.info },
    success: { bg: colors.successBg, fg: colors.success },
    warning: { bg: colors.warningBg, fg: colors.warning },
    danger: { bg: colors.dangerBg, fg: colors.danger },
    muted: { bg: 'rgba(100,116,139,0.18)', fg: colors.muted },
    primary: { bg: colors.primaryGlow, fg: colors.primary },
  };
  const c = map[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{children}</Text>
    </View>
  );
}

export function LevelBadge({ level }: { level: number }) {
  const c = LEVEL_COLORS[level] ?? LEVEL_COLORS[4];
  const dots = '●'.repeat(Math.min(3, Math.max(1, Math.ceil(level / 3))));
  return (
    <View style={[styles.badge, styles.levelBadge, { borderColor: c.fg + '55', backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>
        {dots} {SKILL_LEVELS[level as keyof typeof SKILL_LEVELS] ?? `Уровень ${level}`}
      </Text>
    </View>
  );
}

const GAME_STATUS_VARIANT: Record<number, 'warning' | 'info' | 'muted' | 'primary' | 'success' | 'danger'> = {
  0: 'warning',
  1: 'info',
  2: 'muted',
  3: 'primary',
  4: 'success',
  5: 'danger',
};

export function GameStatusBadge({ status }: { status: number }) {
  return (
    <Badge variant={GAME_STATUS_VARIANT[status] ?? 'muted'}>
      {GAME_STATUS[status as keyof typeof GAME_STATUS] ?? '—'}
    </Badge>
  );
}

const P_STATUS_VARIANT: Record<number, 'info' | 'success' | 'primary' | 'danger'> = {
  1: 'info',
  2: 'success',
  3: 'primary',
  4: 'danger',
};

export function ParticipantStatusBadge({ status }: { status: number }) {
  return (
    <Badge variant={P_STATUS_VARIANT[status] ?? 'muted'}>
      {PARTICIPANT_STATUS[status as keyof typeof PARTICIPANT_STATUS] ?? '—'}
    </Badge>
  );
}

export function GenderText({ gender }: { gender: number }) {
  return <>{GENDER_RESTRICTION[gender as keyof typeof GENDER_RESTRICTION] ?? '—'}</>;
}

/* ---------------- Аватар ---------------- */

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const hue = avatarHue(name);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `hsl(${hue}, 70%, 50%)`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>{initials || '?'}</Text>
    </View>
  );
}

/* ---------------- Прогресс-бар ---------------- */

export function Bar({
  value,
  max = 100,
  variant = 'accent',
}: {
  value: number;
  max?: number;
  variant?: 'accent' | 'info' | 'success' | 'danger';
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  const fill: Record<string, string> = {
    accent: colors.accent,
    info: colors.primary,
    success: colors.success,
    danger: colors.danger,
  };
  return (
    <View style={styles.progress}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: fill[variant] }]} />
    </View>
  );
}

/* ---------------- Скелетон ---------------- */

export function Skeleton({ height, style }: { height: number; style?: StyleProp<ViewStyle> }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return <Animated.View style={[styles.skeleton, { height, opacity: anim }, style]} />;
}

/* ---------------- Пустое состояние ---------------- */

export function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🏐</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {action}
    </View>
  );
}

/* ---------------- Модалка ---------------- */

export function Modal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

/* ---------------- Баннер ---------------- */

const BANNER: Record<string, { bg: string; fg: string }> = {
  error: { bg: colors.dangerBg, fg: colors.danger },
  warning: { bg: colors.warningBg, fg: colors.warning },
  success: { bg: colors.successBg, fg: colors.success },
  info: { bg: colors.infoBg, fg: colors.info },
};

export function Banner({
  kind = 'info',
  icon,
  children,
}: {
  kind?: 'error' | 'warning' | 'success' | 'info';
  icon?: string;
  children: React.ReactNode;
}) {
  const c = BANNER[kind];
  return (
    <View style={[styles.banner, { backgroundColor: c.bg, borderColor: c.fg }]}>
      {icon ? <Text>{icon}</Text> : null}
      <Text style={[styles.bannerText, { color: c.fg }]}>{children}</Text>
    </View>
  );
}

/* ---------------- Ключ-значение ---------------- */

export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal}>{v}</Text>
    </View>
  );
}

/* ---------------- Табы ---------------- */

export function Tabs<T extends string | number>({
  value,
  items,
  onChange,
}: {
  value: T;
  items: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <Pressable key={String(it.value)} onPress={() => onChange(it.value)} style={styles.tab}>
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{it.label}</Text>
            <View style={[styles.tabUnderline, active && { backgroundColor: colors.primary }]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ---------------- Хедер приложения ---------------- */

export function AppHeader() {
  const nav = useNavigation<any>();
  const { isAuth, role, name, logout, setRole } = useAuth();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);

  return (
    <View style={styles.header}>
      <View style={styles.headerInner}>
        <Pressable onPress={() => nav.navigate('Tabs')} style={styles.logo}>
          <Text style={styles.logoBall}>🏐</Text>
          <Text style={styles.logoText}>VolleyApp</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {isAuth ? (
          <Pressable onPress={() => setOpen(true)} style={styles.headerAvatar} accessibilityLabel="Меню профиля">
            <Text style={styles.headerAvatarText}>{name[0]?.toUpperCase() ?? '?'}</Text>
          </Pressable>
        ) : (
          <Btn kind="secondary" small onPress={() => nav.navigate('Login')}>
            Войти
          </Btn>
        )}
      </View>

      <RNModal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            <MenuItem icon="👤" label="Профиль и ELO" onPress={() => { setOpen(false); nav.navigate('Tabs', { screen: 'Profile' }); }} />
            <MenuItem icon="📅" label="Мои игры" onPress={() => { setOpen(false); nav.navigate('Tabs', { screen: 'MyGames' }); }} />
            {role === 'organizer' && (
              <>
                <MenuItem icon="📋" label="Кабинет организатора" onPress={() => { setOpen(false); nav.navigate('Organizer'); }} />
                <MenuItem icon="➕" label="Создать игру" onPress={() => { setOpen(false); nav.navigate('CreateGame'); }} />
              </>
            )}
            <MenuItem
              icon={role === 'organizer' ? '🏐' : '📋'}
              label={role === 'organizer' ? 'Демо: стать игроком' : 'Демо: стать организатором'}
              onPress={() => {
                setOpen(false);
                const next = role === 'organizer' ? 'player' : 'organizer';
                setRole(next);
                toast.push(next === 'organizer' ? 'Демо: вы теперь организатор 📋' : 'Демо: вы снова игрок 🏐', 'info');
                if (next === 'organizer') nav.navigate('Organizer');
              }}
            />
            <Divider />
            <MenuItem icon="🚪" label="Выйти" danger onPress={() => { setOpen(false); logout(); nav.navigate('Tabs', { screen: 'Games' }); }} />
          </View>
        </Pressable>
      </RNModal>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

/* ---------------- Карточка игры ---------------- */

export function GameCard({ game, onPress }: { game: GameList; onPress: () => void }) {
  const free = Math.max(0, game.capacity - game.booked_count);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, styles.gameCard, pressed && { borderColor: colors.borderHover }]}>
      <View style={styles.gameTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.gameTitle} numberOfLines={2}>{game.title}</Text>
          <Text style={styles.gameDate}>{formatDate(game.date_time)}</Text>
        </View>
        <LevelBadge level={game.skill_level} />
      </View>
      <Text style={styles.gameMeta} numberOfLines={1}>📍 {game.location.name}</Text>
      <Bar value={game.booked_count} max={game.capacity} variant={free === 0 ? 'danger' : 'info'} />
      <View style={styles.gameBottom}>
        <Text style={styles.slots}>{free === 0 ? 'Мест нет' : `Свободно ${free} из ${game.capacity}`}</Text>
        <Text style={styles.price}>{formatMoney(game.price)}</Text>
      </View>
    </Pressable>
  );
}

/* ---------------- Стили ---------------- */

export const contentStyle: StyleProp<ViewStyle> = { padding: spacing.lg, paddingBottom: 48, gap: spacing.lg };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgDeep },
  appBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bgDeep },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },

  btn: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  btnSm: { minHeight: 34, paddingVertical: 6, paddingHorizontal: spacing.md },
  btnBlock: { alignSelf: 'stretch' },
  btnText: { fontSize: 16, fontWeight: '600' },

  badge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  levelBadge: { borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  progress: { height: 8, borderRadius: radius.full, backgroundColor: 'rgba(148,163,184,0.15)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },

  skeleton: { backgroundColor: colors.surfaceHover, borderRadius: radius.md },

  empty: { alignItems: 'center', paddingVertical: 56, gap: spacing.lg },
  emptyIcon: { fontSize: 52 },
  emptyText: { color: colors.textSub, fontSize: 15, textAlign: 'center' },

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.bgScreen,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    gap: spacing.sm,
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  bannerText: { fontSize: 14, flex: 1 },

  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.12)',
  },
  kvKey: { color: colors.textSub, fontSize: 14 },
  kvVal: { color: colors.textMain, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  tabsRow: { gap: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: 10, alignItems: 'center' },
  tabText: { color: colors.textSub, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
  tabUnderline: { height: 2, alignSelf: 'stretch', marginTop: 8, borderRadius: 2, backgroundColor: 'transparent' },

  header: {
    backgroundColor: colors.bgScreen,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    height: 60,
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoBall: { fontSize: 20 },
  logoText: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(11,17,32,0.4)' },
  menu: {
    position: 'absolute',
    top: 70,
    right: spacing.lg,
    width: 260,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12, paddingHorizontal: spacing.md, borderRadius: radius.md },
  menuIcon: { fontSize: 16 },
  menuLabel: { color: colors.textMain, fontSize: 15 },

  gameCard: { gap: spacing.md },
  gameTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  gameTitle: { color: colors.textMain, fontSize: 18, fontWeight: '600' },
  gameDate: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  gameMeta: { color: colors.textSub, fontSize: 14 },
  gameBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slots: { color: colors.textSub, fontSize: 13 },
  price: { color: colors.accent, fontSize: 18, fontWeight: '700' },
});

/** Хелпер для остановки всплытия нажатия (аналог e.stopPropagation()). */
export function stopPress(e: GestureResponderEvent) {
  e.stopPropagation();
}
