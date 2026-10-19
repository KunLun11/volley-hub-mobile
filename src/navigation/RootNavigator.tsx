import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gradients } from '../theme';
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
   Нижнее меню — как в референсе (Telegram): плоская полоса во всю
   ширину, пункт = иконка + подпись, активный пункт подсвечен небом.
   Игрок видит Игры · Мои игры · Профиль, организатор —
   Игры · Кабинет · Профиль, а «Создать игру» — плавающая кнопка (FAB).
   ============================================================ */
const BAR_HEIGHT = 56;
const FAB_SIZE = 56;

type BarItem = { key: string; label: string; icon: IconName; active: boolean; onPress: () => void };

function Dock({ state, navigation }: { state: BottomTabBarProps['state']; navigation: any }) {
  const { isAuth, role } = useAuth();
  const insets = useSafeAreaInsets();
  const parent = navigation.getParent();
  const focused = state.routes[state.index]?.name;
  const isOrganizer = isAuth && role === 'organizer';

  const items: BarItem[] = [
    {
      key: 'Games',
      label: 'Игры',
      icon: 'volleyball',
      active: focused === 'Games',
      onPress: () => navigation.navigate('Games'),
    },
  ];

  if (isOrganizer) {
    items.push({
      key: 'Organizer',
      label: 'Кабинет',
      icon: 'view-grid-outline',
      active: false,
      onPress: () => parent?.navigate('Organizer'),
    });
  } else {
    items.push({
      key: 'MyGames',
      label: 'Мои игры',
      icon: 'calendar-blank-outline',
      active: focused === 'MyGames',
      onPress: () => navigation.navigate('MyGames'),
    });
  }

  items.push({
    key: 'Profile',
    label: 'Профиль',
    icon: 'account-outline',
    active: focused === 'Profile',
    onPress: () => navigation.navigate('Profile'),
  });

  const barHeight = BAR_HEIGHT + insets.bottom;

  return (
    <>
      <View style={[styles.bar, { height: barHeight, paddingBottom: insets.bottom }]}>
        <BlurView
          intensity={50}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.barTint} pointerEvents="none" />
        <View style={styles.barHairline} pointerEvents="none" />
        {items.map((it) => (
          <Pressable
            key={it.key}
            onPress={it.onPress}
            style={styles.barItem}
            accessibilityRole="button"
            accessibilityState={{ selected: it.active }}
            accessibilityLabel={it.label}
          >
            <View style={[styles.barIconWrap, it.active && styles.barIconWrapActive]}>
              <Icon name={it.icon} size={23} color={it.active ? colors.accent : colors.muted} />
            </View>
            <Text style={[styles.barLabel, it.active && styles.barLabelActive]} numberOfLines={1}>
              {it.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isOrganizer ? (
        <Pressable
          onPress={() => parent?.navigate('CreateGame')}
          style={({ pressed }) => [
            styles.fab,
            { bottom: barHeight + 16 },
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
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
    zIndex: 90,
  },
  barTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,11,14,0.30)',
  },
  barHairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  barItem: {
    flex: 1,
    minWidth: 0,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  barIconWrap: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barIconWrapActive: { backgroundColor: 'rgba(59,130,246,0.14)' },
  barLabel: { color: colors.muted, fontSize: 10.5, fontWeight: '600', maxWidth: '96%' },
  barLabelActive: { color: colors.accent },
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
