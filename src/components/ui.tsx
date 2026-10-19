import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  type GestureResponderEvent,
  Image,
  Modal as RNModal,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import {
  GAME_STATUS,
  GENDER_RESTRICTION,
  PARTICIPANT_STATUS,
  SKILL_LEVELS,
  type GameList,
} from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  avatarHue,
  colors,
  fontDisplay,
  fontMono,
  gradients,
  LEVEL_COLORS,
  radius,
  shadows,
  spacing,
} from '../theme';
import { useAuth } from '../store';
import { api } from '../api/client';

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

/* ---------------- Иконки (монолиния) ---------------- */

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export function Icon({
  name,
  size = 18,
  color = colors.muted,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

/* ---------------- Базовые контейнеры ---------------- */

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.appBg} pointerEvents="none" />
      <LinearGradient
        colors={gradients.glow}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.15, y: 0.72 }}
        style={styles.appGlow}
        pointerEvents="none"
      />
      {children}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

/* ---------------- Кнопка ---------------- */

const BTN: Record<string, { bg: string; border: string; fg: string }> = {
  primary: { bg: 'transparent', border: 'rgba(255,255,255,0.10)', fg: colors.accentInk },
  secondary: { bg: colors.surface2, border: colors.border2, fg: colors.textMain },
  ghost: { bg: 'transparent', border: 'transparent', fg: colors.textSub },
  danger: { bg: colors.dangerBg, border: 'rgba(251,113,133,0.38)', fg: colors.danger },
  success: { bg: colors.successBg, border: 'rgba(52,211,153,0.38)', fg: colors.success },
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
        pressed && !inactive && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {kind === 'primary' && !inactive ? (
        <LinearGradient
          colors={gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
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
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.fg + '55' }]}>
      <Text style={[styles.badgeText, { color: c.fg }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

/** Иконки уровней как в вебе: шевроны → звезда → молния → медаль → кубок → корона. */
const LEVEL_ICON: Record<number, IconName> = {
  1: 'chevron-up',
  2: 'chevron-double-up',
  3: 'chevron-triple-up',
  4: 'star-outline',
  5: 'star',
  6: 'lightning-bolt',
  7: 'medal-outline',
  8: 'trophy-outline',
  9: 'crown-outline',
};

export function levelIcon(level: number): IconName {
  return LEVEL_ICON[level] ?? 'star-outline';
}

export function LevelBadge({ level }: { level: number }) {
  const c = LEVEL_COLORS[level] ?? LEVEL_COLORS[4];
  return (
    <View style={[styles.badge, styles.levelBadge, { borderColor: c.fg + '55', backgroundColor: c.bg }]}>
      <Icon name={LEVEL_ICON[level] ?? 'star-outline'} size={13} color={c.fg} />
      <Text style={[styles.badgeText, { color: c.fg }]} numberOfLines={1}>
        {SKILL_LEVELS[level as keyof typeof SKILL_LEVELS] ?? `Уровень ${level}`}
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

export function Avatar({ name, size = 40, src }: { name: string; size?: number; src?: string | null }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const hue = avatarHue(name);

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surface3,
          borderWidth: 1,
          borderColor: colors.border2,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `hsl(${hue}, 58%, 42%)`,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
      }}
    >
      <Text style={{ color: colors.accentInk, fontWeight: '700', fontSize: size * 0.38 }}>
        {initials || '?'}
      </Text>
    </View>
  );
}

/* ---------------- Прогресс-бар / вместимость ---------------- */

export function Bar({
  value,
  max = 100,
  variant = 'sky',
}: {
  value: number;
  max?: number;
  variant?: 'sky' | 'accent' | 'info' | 'gold' | 'success' | 'danger';
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  const fill: Record<string, [string, string]> = {
    sky: [colors.accent, colors.accent2],
    accent: [colors.accent, colors.accent2],
    info: [colors.accent, colors.accent2],
    gold: ['#f5a524', '#ffd27a'],
    success: ['#34d399', '#6ee7d0'],
    danger: ['#fb7185', '#fda4af'],
  };
  const c = fill[variant] ?? fill.sky;
  return (
    <View style={styles.progress}>
      <LinearGradient
        colors={c}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.progressFill, { width: `${pct}%` }]}
      />
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
      <Icon name="volleyball" size={56} color={colors.meta} />
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
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
        <Pressable style={styles.modalShell} onPress={() => undefined}>
          <ScrollView
            contentContainerStyle={styles.modalCard}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
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
  icon?: IconName;
  children: React.ReactNode;
}) {
  const c = BANNER[kind];
  return (
    <View style={[styles.banner, { backgroundColor: c.bg, borderColor: c.fg + '66' }]}>
      {icon ? <Icon name={icon} size={16} color={c.fg} /> : null}
      <Text style={[styles.bannerText, { color: c.fg }]}>{children}</Text>
    </View>
  );
}

/* ---------------- Ключ-значение ---------------- */

export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal} numberOfLines={2}>
        {v}
      </Text>
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsRow}
      style={styles.tabsScroll}
    >
      {items.map((it) => {
        const active = it.value === value;
        return (
          <Pressable
            key={String(it.value)}
            onPress={() => onChange(it.value)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ---------------- Хедер приложения ---------------- */

export function AppHeader() {
  const nav = useNavigation<any>();
  const { isAuth, role, name, logout } = useAuth();
  const [open, setOpen] = React.useState(false);

  return (
    <View style={styles.header}>
      <LinearGradient
        colors={['#111318', '#0b0c10']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.headerInner}>
        <Pressable onPress={() => nav.navigate('Tabs')} style={styles.logo}>
          <Icon name="volleyball" size={23} color={colors.accent} />
          <Text style={styles.logoText} numberOfLines={1}>
            Volley<Text style={styles.logoAccent}>Hub</Text>
          </Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {isAuth ? (
          <Pressable onPress={() => setOpen(true)} style={styles.headerAvatar} accessibilityLabel="Меню профиля">
            <Text style={styles.headerAvatarText}>{name ? name[0].toUpperCase() : '?'}</Text>
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
            <MenuItem
              icon="account-outline"
              label="Профиль и ELO"
              onPress={() => {
                setOpen(false);
                nav.navigate('Tabs', { screen: 'Profile' });
              }}
            />
            <MenuItem
              icon="calendar-blank-outline"
              label="Мои игры"
              onPress={() => {
                setOpen(false);
                nav.navigate('Tabs', { screen: 'MyGames' });
              }}
            />
            {role === 'organizer' && (
              <>
                <MenuItem
                  icon="view-grid-outline"
                  label="Кабинет организатора"
                  onPress={() => {
                    setOpen(false);
                    nav.navigate('Organizer');
                  }}
                />
                <MenuItem
                  icon="plus"
                  label="Создать игру"
                  onPress={() => {
                    setOpen(false);
                    nav.navigate('CreateGame');
                  }}
                />
              </>
            )}
            <Divider />
            <MenuItem
              icon="logout"
              label="Выйти"
              danger
              onPress={() => {
                setOpen(false);
                // Best-effort отзыв токенов; локально выходим сразу.
                void api.logout();
                logout();
                nav.navigate('Tabs', { screen: 'Games' });
              }}
            />
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
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Icon name={icon} size={18} color={danger ? colors.danger : colors.muted} />
      <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

/* ---------------- Карточка игры ---------------- */

export function GameCard({ game, onPress }: { game: GameList; onPress: () => void }) {
  const free = Math.max(0, game.capacity - game.booked_count);
  const full = free === 0;
  const few = free > 0 && free <= 2;
  const capTxt = full
    ? 'Мест нет'
    : few
      ? `Мало мест · ${free} из ${game.capacity}`
      : `Свободно ${free} из ${game.capacity}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, styles.gameCard, pressed && styles.gameCardPressed]}
    >
      <LinearGradient
        colors={gradients.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.priceBadge}>
        <Text style={styles.priceBadgeText} numberOfLines={1}>
          {formatMoney(game.price)}
        </Text>
      </View>

      <View style={styles.gameTop}>
        <View style={styles.gameTopMain}>
          <Text style={styles.gameTitle} numberOfLines={2}>
            {game.title}
          </Text>
          <View style={styles.gameWhen}>
            <Icon name="clock-outline" size={13} color={colors.meta} />
            <Text style={styles.gameWhenText} numberOfLines={1}>
              {formatDate(game.date_time)} · {game.duration_minutes} мин
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.gameMeta}>
        <View style={styles.gameMetaRow}>
          <Icon name="map-marker-outline" size={15} color={colors.meta} />
          <Text style={styles.gameMetaText} numberOfLines={1}>
            {game.location.name}
            {game.location.address ? ` · ${game.location.address}` : ''}
          </Text>
        </View>
        <View style={styles.gameMetaRow}>
          <Icon name="account-group-outline" size={15} color={colors.meta} />
          <Text style={styles.gameMetaText} numberOfLines={1}>
            <GenderText gender={game.gender} />
          </Text>
        </View>
      </View>

      <View style={styles.capBlock}>
        <Bar value={game.booked_count} max={game.capacity} variant={full ? 'danger' : few ? 'gold' : 'sky'} />
        <Text
          style={[
            styles.capTxt,
            few && { color: colors.warning, fontWeight: '600' },
            full && { color: colors.danger, fontWeight: '600' },
          ]}
          numberOfLines={1}
        >
          {capTxt}
        </Text>
      </View>

      <View style={styles.gameFoot}>
        <View style={styles.gameFootLevel}>
          <LevelBadge level={game.skill_level} />
        </View>
        <View style={[styles.miniBtn, full ? styles.miniBtnGhost : styles.miniBtnPrimary]}>
          {full ? <Icon name="clock-outline" size={15} color={colors.textMain} /> : null}
          <Text
            style={[styles.miniBtnText, { color: full ? colors.textMain : colors.accentInk }]}
            numberOfLines={1}
          >
            {full ? 'Лист ожидания' : 'Подробнее'}
          </Text>
          {full ? null : <Icon name="arrow-right" size={15} color={colors.accentInk} />}
        </View>
      </View>
    </Pressable>
  );
}

/* ---------------- Стили ---------------- */

export const contentStyle: StyleProp<ViewStyle> = {
  padding: spacing.lg,
  paddingBottom: 40,
  gap: spacing.lg,
};

/** Контент экранов с нижней панелью: учитывает safe-area + высоту дока. */
export function useTabContentStyle() {
  const insets = useSafeAreaInsets();
  return useMemo(
    () => ({
      padding: spacing.lg,
      paddingBottom: 56 + insets.bottom + 24,
      gap: spacing.lg,
    }),
    [insets.bottom],
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgDeep },
  appBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bgDeep },
  appGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },

  btn: {
    minHeight: 46,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  btnSm: { minHeight: 36, paddingVertical: 6, paddingHorizontal: spacing.md },
  btnBlock: { alignSelf: 'stretch' },
  btnText: { fontSize: 15.5, fontWeight: '600' },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
    alignSelf: 'flex-start',
    flexShrink: 1,
    maxWidth: '100%',
  },
  levelBadge: { borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },

  progress: { height: 7, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },

  skeleton: { backgroundColor: colors.surface3, borderRadius: radius.md },

  empty: { alignItems: 'center', paddingVertical: 56, gap: spacing.lg },
  emptyText: { color: colors.textSub, fontSize: 15, textAlign: 'center' },

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalShell: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.pop,
  },
  modalCard: { padding: spacing.xl, gap: spacing.sm },

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
    borderBottomColor: colors.border,
  },
  kvKey: { color: colors.textSub, fontSize: 14, flexShrink: 1 },
  kvVal: { color: colors.textMain, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  tabsScroll: { flexGrow: 0 },
  tabsRow: { gap: spacing.sm, paddingVertical: 2 },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  tabActive: { backgroundColor: colors.surface2, borderColor: colors.border2 },
  tabText: { color: colors.textSub, fontSize: 13.5, fontWeight: '600' },
  tabTextActive: { color: colors.accent },

  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
    zIndex: 20,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    height: 56,
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  logoText: { color: colors.textMain, fontSize: 18, fontWeight: '700', letterSpacing: -0.3, fontFamily: fontDisplay },
  logoAccent: { color: colors.accent2 },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  headerAvatarText: { color: colors.accentInk, fontWeight: '700', fontSize: 14 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(10,11,14,0.45)' },
  menu: {
    position: 'absolute',
    top: 64,
    right: spacing.lg,
    width: 260,
    maxWidth: '86%',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: radius.md,
    padding: spacing.sm,
    ...shadows.pop,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  menuIcon: { fontSize: 16 },
  menuLabel: { color: colors.textMain, fontSize: 15, flexShrink: 1 },

  gameCard: {
    gap: spacing.md,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  gameCardPressed: { borderColor: 'rgba(59,130,246,0.45)' },
  gameTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  gameTopMain: { flex: 1, minWidth: 0, paddingRight: 92 },
  gameTitle: { color: colors.textMain, fontSize: 17, fontWeight: '700', letterSpacing: -0.2, lineHeight: 22 },
  gameWhen: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  gameWhenText: { color: colors.meta, fontSize: 11.5, fontFamily: fontMono, flexShrink: 1 },
  priceBadge: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 2,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(245,165,36,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245,165,36,0.38)',
    maxWidth: 88,
  },
  priceBadgeText: { color: colors.gold, fontSize: 12.5, fontWeight: '700', fontFamily: fontMono },
  gameMeta: { gap: 7 },
  gameMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  gameMetaText: { color: colors.muted, fontSize: 13, flexShrink: 1, minWidth: 0 },
  capBlock: { gap: 6 },
  capTxt: { color: colors.muted, fontSize: 11.5, fontFamily: fontMono },
  gameFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  gameFootLevel: { flexShrink: 1, maxWidth: '42%', minWidth: 0 },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: radius.sm,
    flexShrink: 0,
    overflow: 'hidden',
  },
  miniBtnPrimary: { backgroundColor: colors.accent },
  miniBtnGhost: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  miniBtnText: { fontSize: 13, fontWeight: '600' },
});

/** Хелпер для остановки всплытия нажатия (аналог e.stopPropagation()). */
export function stopPress(e: GestureResponderEvent) {
  e.stopPropagation();
}
