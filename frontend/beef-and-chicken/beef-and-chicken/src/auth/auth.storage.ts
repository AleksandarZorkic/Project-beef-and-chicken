const AUTH_KEY = "auth";

export type StoredAuth = {
  token: string;
};

export function getStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
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
