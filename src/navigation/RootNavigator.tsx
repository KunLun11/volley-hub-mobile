import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../api/client';
import { colors, dock, fontMono, gradients, radius } from '../theme';
import { AppHeader, Icon, Screen, type IconName } from '../components/ui';
import { useAuth } from '../store';
import GamesListScreen from '../screens/GamesListScreen';
import MyGamesScreen from '../screens/MyGamesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyScreen from '../screens/VerifyScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import GameDetailsScreen from '../screens/GameDetailsScreen';
import MatchHistoryScreen from '../screens/MatchHistoryScreen';
import CreateGameScreen from '../screens/CreateGameScreen';
import OrganizerCabinetScreen from '../screens/OrganizerCabinetScreen';
import ManageGameScreen from '../screens/ManageGameScreen';
import UserProfileScreen from '../screens/UserProfileScreen';

export type RootStackParamList = {
  Tabs: undefined;
  Login: undefined;
  Register: undefined;
  Verify: { email?: string } | undefined;
  Onboarding: undefined;
  GameDetails: { id: number };
  MatchHistory: undefined;
  CreateGame: undefined;
  Organizer: undefined;
  ManageGame: { id: number };
  /** Чужой профиль: UUID пользователя (player | organizer). */
  UserProfile: { id: string };
};

export type TabParamList = {
  Games: undefined;
  MyGames: undefined;
  Profile: undefined;
};

/** Обёртка экрана таба: Screen + AppHeader + сам экран. */
const withHeader = (Comp: React.ComponentType) => () =>
  (
    <Screen>
      <AppHeader />
      <Comp />
    </Screen>
  );

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

/* ============================================================
   Нижняя панель — плавающий glassmorphism-док (Telegram-style):
   pill-shape, backdrop-blur, отступ от низа и краёв экрана.
   Ровно три пункта: иконка + подпись под ней.
   Активный пункт — синий (иконка и текст), у «Игр» — синий
   бейдж-счётчик. Игрок видит Игры · Мои игры · Профиль,
   организатор — Игры · Кабинет · Профиль, а «Создать игру» —
   плавающая кнопка (FAB) над доком.
   ============================================================ */
const FAB_SIZE = 56;

type BarItem = {
  key: string;
  label: string;
  icon: IconName;
  /** Залитый вариант иконки для активного состояния. */
  iconActive?: IconName;
  active: boolean;
  badge?: number;
  onPress: () => void;
};

/** Число открытых игр для бейджа. Перезапрашиваем при каждом
 *  возврате на вкладку «Игры», чтобы счётчик не устаревал. */
function useOpenGamesCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    api
      .gamesCount()
      .then((n) => alive && setCount(n))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [enabled]);
  return count;
}

function Dock({ state, navigation }: { state: BottomTabBarProps['state']; navigation: any }) {
  const { isAuth, role } = useAuth();
  const insets = useSafeAreaInsets();
  const parent = navigation.getParent();
  const focused = state.routes[state.index]?.name;
  const isOrganizer = isAuth && role === 'organizer';
  const openGames = useOpenGamesCount(focused === 'Games');

  const items: BarItem[] = [
    {
      key: 'Games',
      label: 'Игры',
      icon: 'gamepad-variant-outline',
      iconActive: 'gamepad-variant',
      active: focused === 'Games',
      badge: openGames,
      onPress: () => navigation.navigate('Games'),
    },
  ];

  if (isOrganizer) {
    items.push({
      key: 'Organizer',
      label: 'Кабинет',
      icon: 'view-grid-outline',
      iconActive: 'view-grid',
      active: false,
      onPress: () => parent?.navigate('Organizer'),
    });
  } else {
    items.push({
      key: 'MyGames',
      label: 'Мои игры',
      icon: 'bookmark-multiple-outline',
      iconActive: 'bookmark-multiple',
      active: focused === 'MyGames',
      onPress: () => navigation.navigate('MyGames'),
    });
  }

  items.push({
    key: 'Profile',
    label: 'Профиль',
    icon: 'account-outline',
    iconActive: 'account',
    active: focused === 'Profile',
    onPress: () => navigation.navigate('Profile'),
  });

  const dockBottom = insets.bottom + dock.margin;

  return (
    <>
      <View style={[styles.dockShadow, { bottom: dockBottom }]}>
        <View style={styles.dock}>
          <BlurView
            intensity={70}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.dockTint} pointerEvents="none" />
          <View style={styles.dockOutline} pointerEvents="none" />
          {items.map((it) => (
            <Pressable
              key={it.key}
              onPress={it.onPress}
              style={styles.dockItem}
              accessibilityRole="button"
              accessibilityState={{ selected: it.active }}
              accessibilityLabel={it.badge ? `${it.label}, ${it.badge}` : it.label}
            >
              <View style={styles.dockIcon}>
                <Icon
                  name={it.active && it.iconActive ? it.iconActive : it.icon}
                  size={24}
                  color={it.active ? colors.accent : colors.muted}
                  style={it.active ? styles.dockIconGlow : undefined}
                />
                {it.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText} numberOfLines={1}>
                      {it.badge > 99 ? '99+' : it.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.dockLabel, it.active && styles.dockLabelActive]} numberOfLines={1}>
                {it.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isOrganizer ? (
        <Pressable
          onPress={() => parent?.navigate('CreateGame')}
          style={({ pressed }) => [
            styles.fab,
            { bottom: dockBottom + dock.height + 14 },
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Создать игру"
        >
          <LinearGradient
            colors={gradients.accentBright}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Icon name="plus" size={26} color={colors.accentInk} />
          </LinearGradient>
        </Pressable>
      ) : null}
    </>
  );
}

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <Dock state={props.state} navigation={props.navigation} />}>
      <Tab.Screen name="Games" component={withHeader(GamesListScreen)} options={{ title: 'Игры' }} />
      <Tab.Screen name="MyGames" component={withHeader(MyGamesScreen)} options={{ title: 'Мои игры' }} />
      <Tab.Screen name="Profile" component={withHeader(ProfileScreen)} options={{ title: 'Профиль' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgDeep },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Verify" component={VerifyScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="GameDetails" component={GameDetailsScreen} />
      <Stack.Screen name="MatchHistory" component={MatchHistoryScreen} />
      <Stack.Screen name="CreateGame" component={CreateGameScreen} />
      <Stack.Screen name="Organizer" component={OrganizerCabinetScreen} />
      <Stack.Screen name="ManageGame" component={ManageGameScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  /* Внешний слой держит тень (overflow:'hidden' у дочернего её срезает). */
  dockShadow: {
    position: 'absolute',
    left: dock.margin,
    right: dock.margin,
    height: dock.height,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 24,
    zIndex: 90,
  },
  /* Сам стеклянный док: полупрозрачный слой + blur. Обводку рисует
     отдельный слой поверх содержимого — иначе верхний блик + border
     давали «сверху толще, снизу тоньше». */
  dock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  dockTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,14,20,0.62)',
  },
  /* Ровная hairline-обводка одинаковой толщины со всех сторон. */
  dockOutline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  dockItem: {
    flex: 1,
    minWidth: 0,
    height: dock.height,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dockIcon: { width: 44, height: 26, alignItems: 'center', justifyContent: 'center' },
  /* Мягкое синее свечение активной иконки. В RN у Text нет box-shadow,
     поэтому используем его прямой аналог — textShadow с нулевым
     смещением и большим радиусом размытия: глиф остаётся чётким,
     а вокруг расходится синий ореол. */
  dockIconGlow: {
    textShadowColor: 'rgba(59,130,246,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  dockLabel: { color: colors.muted, fontSize: 10.5, fontWeight: '600' },
  dockLabelActive: { color: colors.accent },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: 'rgba(10,11,14,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.accentInk,
    fontSize: 10,
    lineHeight: 12,
    fontFamily: fontMono,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
    zIndex: 91,
  },
  fabGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
