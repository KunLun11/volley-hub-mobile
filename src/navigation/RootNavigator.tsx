import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '../theme';
import { AppHeader, Screen } from '../components/ui';
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

const ICONS: Record<keyof TabParamList, string> = {
  Games: '🏐',
  MyGames: '📅',
  Profile: '👤',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSub,
        tabBarStyle: {
          backgroundColor: colors.bgScreen,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{ICONS[route.name as keyof TabParamList]}</Text>
        ),
      })}
    >
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
