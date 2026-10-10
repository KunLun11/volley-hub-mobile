import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme';
import { AppHeader, Screen, type IconName } from '../components/ui';
import { useAuth } from '../store';
import GamesListScreen from '../screens/GamesListScreen';
import MyGamesScreen from '../screens/MyGamesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyScreen from '../screens/VerifyScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import GameDetailsScreen from '../screens/GameDetailsScreen';
import CreateGameScreen from '../screens/CreateGameScreen';
import OrganizerCabinetScreen from '../screens/OrganizerCabinetScreen';
import ManageGameScreen from '../screens/ManageGameScreen';

export type RootStackParamList = {
  Tabs: undefined;
  Login: undefined;
  Register: undefined;
  Verify: { email?: string } | undefined;
  Onboarding: undefined;
  GameDetails: { id: number };
  CreateGame: undefined;
  Organizer: undefined;
  ManageGame: { id: number };
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
   Плавающий док — signature-элемент мобильного прототипа.
   Пункт «Создать» показывается ТОЛЬКО организатору; игрок видит
   Игры · Мои игры · Профиль, организатор — Игры · Кабинет · Профиль + Создать.
   ============================================================ */
type DockItem = { key: string; label: string; icon: IconName; active: boolean; onPress: () => void };

function Dock({ state, navigation }: { state: BottomTabBarProps['state']; navigation: any }) {
  const { isAuth, role } = useAuth();
  const insets = useSafeAreaInsets();
  const parent = navigation.getParent();
  const focused = state.routes[state.index]?.name;

  const items: DockItem[] = [
    {
      key: 'Games',
      label: 'Игры',
      icon: 'volleyball',
      active: focused === 'Games',
      onPress: () => navigation.navigate('Games'),
    },
  ];

  if (isAuth && role === 'organizer') {
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

  return (
    <View pointerEvents="box-none" style={[styles.dockWrap, { paddingBottom: Math.max(insets.bottom, 15) }]}>
      <View style={styles.dock}>
        {items.map((it) => (
          <Pressable
            key={it.key}
            onPress={it.onPress}
            style={styles.dockItem}
            accessibilityRole="button"
            accessibilityLabel={it.label}
          >
            <MaterialCommunityIcons
              name={it.icon}
              size={21}
              color={it.active ? colors.accent : colors.muted}
            />
            <Text style={[styles.dockLabel, it.active && styles.dockLabelActive]}>{it.label}</Text>
            {it.active ? <View style={styles.dockDot} /> : null}
          </Pressable>
        ))}

        {isAuth && role === 'organizer' ? (
          <Pressable
            onPress={() => parent?.navigate('CreateGame')}
            style={({ pressed }) => [styles.dockCreate, pressed && { transform: [{ translateY: 1 }] }]}
            accessibilityRole="button"
            accessibilityLabel="Создать игру"
          >
            <MaterialCommunityIcons name="plus" size={18} color={colors.accentInk} />
            <Text style={styles.dockCreateText}>Создать</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
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
      <Stack.Screen name="CreateGame" component={CreateGameScreen} />
      <Stack.Screen name="Organizer" component={OrganizerCabinetScreen} />
      <Stack.Screen name="ManageGame" component={ManageGameScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 15,
    zIndex: 90,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 7,
    borderRadius: 26,
    backgroundColor: 'rgba(20, 28, 46, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.10)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  dockItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 19,
  },
  dockLabel: { color: colors.muted, fontSize: 10.5, fontWeight: '600' },
  dockLabelActive: { color: colors.accent },
  dockDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent, marginTop: 1 },
  dockCreate: {
    flex: 1.65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 19,
    backgroundColor: colors.accent,
  },
  dockCreateText: { color: colors.accentInk, fontSize: 13.5, fontWeight: '700' },
});
