import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { hasTokens, loadTokens, setTokens } from '../api/client';

export type Role = 'player' | 'organizer';

interface AuthState {
  /** true после чтения токенов из AsyncStorage — до этого показываем сплэш. */
  ready: boolean;
  isAuth: boolean;
  role: Role;
  name: string;
  login: (name?: string, role?: Role) => void;
  logout: () => void;
  setRole: (role: Role) => void;
}

const Ctx = createContext<AuthState>({
  ready: false,
  isAuth: false,
  role: 'player',
  name: '',
  login: () => undefined,
  logout: () => undefined,
  setRole: () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [role, setRoleState] = useState<Role>('player');
  const [name, setName] = useState('Михаил');

  // Гидратация сессии из хранилища при старте.
  useEffect(() => {
    (async () => {
      await loadTokens();
      const pairs = await AsyncStorage.multiGet(['va_logged', 'va_role', 'va_name']);
      const logged = pairs[0][1] === '1' && hasTokens();
      const storedRole = (pairs[1][1] as Role) || 'player';
      const storedName = pairs[2][1] || 'Михаил';
      setIsAuth(logged);
      setRoleState(storedRole);
      setName(storedName);
      setReady(true);
    })().catch(() => setReady(true));
  }, []);

  const login = useCallback((n?: string, r?: Role) => {
    setIsAuth(true);
    void AsyncStorage.setItem('va_logged', '1');
    if (n) {
      setName(n);
      void AsyncStorage.setItem('va_name', n);
    }
    if (r) {
      setRoleState(r);
      void AsyncStorage.setItem('va_role', r);
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuth(false);
    setTokens(null);
    void AsyncStorage.multiRemove(['va_logged', 'va_access', 'va_refresh']);
  }, []);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    void AsyncStorage.setItem('va_role', r);
  }, []);

  const value = useMemo(
    () => ({ ready, isAuth, role, name, login, logout, setRole }),
    [ready, isAuth, role, name, login, logout, setRole],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
