import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { clearStoredAuth, getStoredAuth, saveStoredAuth } from "./auth.storage";
import { isTokenExpired, mapTokenToUser } from "./auth.jwt";
import type { LoginRequestDto, RegisterRequestDto } from "./auth.types";
import type { AppRole } from "./roles";
import { login as loginApi, register as registerApi } from "../api/authApi";
import { setAuthToken } from "../api/https";
import type { AuthUser } from "./auth.jwt";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginRequestDto) => Promise<void>;
  register: (data: RegisterRequestDto) => Promise<void>;
  logout: () => void;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const logout = useCallback(() => {
    clearStoredAuth();
    setAuthToken(undefined);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const stored = getStoredAuth();

    if (!stored?.token) {
      return;
    }

    if (isTokenExpired(stored.token)) {
      logout();
      return;
    }

    const mappedUser = mapTokenToUser(stored.token);

    if (!mappedUser) {
      logout();
      return;
    }

    setToken(stored.token);
    setUser(mappedUser);
    setAuthToken(stored.token);
  }, [logout]);

  const login = useCallback(async (data: LoginRequestDto) => {
    const result = await loginApi(data);

    if (isTokenExpired(result.token)) {
      throw new Error("Token je istekao.");
    }

    const mappedUser = mapTokenToUser(result.token);

    if (!mappedUser) {
      throw new Error("Token ne sadrži validne podatke o korisniku.");
    }

    saveStoredAuth(result.token);
    setAuthToken(result.token);
    setToken(result.token);
    setUser(mappedUser);
  }, []);

  const register = useCallback(async (data: RegisterRequestDto) => {
    await registerApi(data);
  }, []);

  const hasRole = useCallback(
    (role: AppRole) => {
      return user?.roles.includes(role) ?? false;
    },
    [user],
  );

  const hasAnyRole = useCallback(
    (roles: AppRole[]) => {
      return roles.some((role) => hasRole(role));
    },
    [hasRole],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      login,
      register,
      logout,
      hasRole,
      hasAnyRole,
    }),
    [user, token, login, register, logout, hasRole, hasAnyRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth mora biti korišćen unutar AuthProvider.");
  }

  return ctx;
}
