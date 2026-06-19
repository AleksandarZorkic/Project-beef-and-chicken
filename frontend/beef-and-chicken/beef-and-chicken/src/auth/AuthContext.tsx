import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearStoredAuth, getStoredAuth, saveStoredAuth } from "./auth.storage";
import { mapTokenToUser } from "./auth.jwt";
import type {
  AuthUser,
  LoginRequestDto,
  RegisterRequestDto,
} from "./auth.types";
import { login as loginApi, register as registerApi } from "../api/authApi";
import { setAuthToken } from "../api/http";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginRequestDto) => Promise<void>;
  register: (data: RegisterRequestDto) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = getStoredAuth();
    if (!stored?.token) return;

    const mappedUser = mapTokenToUser(stored.token);
    if (!mappedUser) {
      clearStoredAuth();
      setAuthToken(undefined);
      return;
    }

    setToken(stored.token);
    setUser(mappedUser);
    setAuthToken(stored.token);
  }, []);

  async function login(data: LoginRequestDto) {
    const result = await loginApi(data);

    const mappedUser = mapTokenToUser(result.token);
    if (!mappedUser) {
      throw new Error("Token ne sadrži validne podatke o korisniku.");
    }

    saveStoredAuth(result.token);
    setAuthToken(result.token);
    setToken(result.token);
    setUser(mappedUser);
  }

  async function register(data: RegisterRequestDto) {
    await registerApi(data);
  }

  function logout() {
    clearStoredAuth();
    setAuthToken(undefined);
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      login,
      register,
      logout,
    }),
    [user, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth mora biti korišćen unutar AuthProvider.");
  return ctx;
}
