const AUTH_KEY = "auth";

export type StoredAuth = {
  token: string;
};

export function getStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed.token !== "string" || !parsed.token.trim()) {
      return null;
    }

    return {
      token: parsed.token,
    };
  } catch {
    return null;
  }
}

export function saveStoredAuth(token: string) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ token }));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_KEY);
}
