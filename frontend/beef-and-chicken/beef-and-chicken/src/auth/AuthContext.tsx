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
import type {
  LoginRequestDto,
  RegisterRequestDto,
  UserProfileDto,
} from "./auth.types";
import type { AppRole } from "./roles";
import {
  getProfile as getProfileApi,
  googleLogin as googleLoginApi,
  login as loginApi,
  register as registerApi,
} from "../api/authApi";
import { setAuthToken } from "../api/https";

type AuthContextValue = {
  user: UserProfileDto | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginRequestDto) => Promise<void>;
  loginWithGoogle: (
    idToken: string,
    createAccountIfMissing: boolean,
  ) => Promise<void>;
  register: (data: RegisterRequestDto) => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUserProfile: (profile: UserProfileDto) => void;
  logout: () => void;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfileDto | null>(null);

  const logout = useCallback(() => {
    clearStoredAuth();
    setAuthToken(undefined);
    setToken(null);
    setUser(null);
  }, []);

  const applyAuthToken = useCallback(async (nextToken: string) => {
    if (isTokenExpired(nextToken)) {
      throw new Error("Token je istekao.");
    }

    const mappedUser = mapTokenToUser(nextToken);

    if (!mappedUser) {
      throw new Error("Token ne sadrži validne podatke o korisniku.");
    }

    saveStoredAuth(nextToken);
    setAuthToken(nextToken);
    setToken(nextToken);

    const profile = await getProfileApi();
    setUser(profile);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await getProfileApi();
    setUser(profile);
  }, []);

  const setUserProfile = useCallback((profile: UserProfileDto) => {
    setUser(profile);
  }, []);

  useEffect(() => {
    async function restoreAuth() {
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
      setAuthToken(stored.token);

      try {
        const profile = await getProfileApi();
        setUser(profile);
      } catch {
        logout();
      }
    }

    restoreAuth();
  }, [logout]);

  const login = useCallback(
    async (data: LoginRequestDto) => {
      const result = await loginApi(data);

      await applyAuthToken(result.token);
    },
    [applyAuthToken],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string, createAccountIfMissing: boolean) => {
      if (!idToken) {
        throw new Error("Google token nije pronađen.");
      }

      const result = await googleLoginApi(idToken, createAccountIfMissing);

      await applyAuthToken(result.token);
    },
    [applyAuthToken],
  );

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
      loginWithGoogle,
      register,
      refreshProfile,
      setUserProfile,
      logout,
      hasRole,
      hasAnyRole,
    }),
    [
      user,
      token,
      login,
      loginWithGoogle,
      register,
      refreshProfile,
      setUserProfile,
      logout,
      hasRole,
      hasAnyRole,
    ],
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
