import type { AppRole } from "./roles";

type JwtPayload = Record<string, unknown>;

const ROLE_CLAIM =
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

const NAME_ID_CLAIM =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";

const NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";

export type AuthUser = {
  id: number;
  username?: string;
  email?: string;
  roles: AppRole[];
};

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");

  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );

  return atob(padded);
}

export function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const json = decodeBase64Url(parts[1]);

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function normalizeRoles(value: unknown): AppRole[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .filter((role): role is string => typeof role === "string")
      .map((role) => role as AppRole);
  }

  if (typeof value === "string") {
    return [value as AppRole];
  }

  return [];
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);

  if (!payload) {
    return true;
  }

  const exp = payload["exp"];

  if (typeof exp !== "number") {
    return true;
  }

  const currentTimeInSeconds = Date.now() / 1000;

  return exp < currentTimeInSeconds;
}

export function mapTokenToUser(token: string): AuthUser | null {
  const payload = parseJwt(token);

  if (!payload) {
    return null;
  }

  const idRaw = payload["nameid"] ?? payload["sub"] ?? payload[NAME_ID_CLAIM];

  const username =
    (payload["username"] as string | undefined) ??
    (payload["unique_name"] as string | undefined) ??
    (payload["name"] as string | undefined) ??
    (payload[NAME_CLAIM] as string | undefined);

  const email = payload["email"] as string | undefined;

  const roleRaw = payload["role"] ?? payload["roles"] ?? payload[ROLE_CLAIM];

  const roles = normalizeRoles(roleRaw);

  const id = Number(idRaw);

  if (!Number.isFinite(id)) {
    return null;
  }

  return {
    id,
    username,
    email,
    roles,
  };
}
