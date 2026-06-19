type JwtPayload = Record<string, unknown>;

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
    if (parts.length !== 3) return null;

    const json = decodeBase64Url(parts[1]);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function mapTokenToUser(token: string) {
  const payload = parseJwt(token);
  if (!payload) return null;

  const idRaw =
    payload["nameid"] ??
    payload["sub"] ??
    payload[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
    ];

  const username =
    (payload["username"] as string | undefined) ??
    (payload["unique_name"] as string | undefined) ??
    (payload["name"] as string | undefined) ??
    (payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] as
      | string
      | undefined);

  const roleRaw =
    payload["role"] ??
    payload["roles"] ??
    payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

  const roles = Array.isArray(roleRaw)
    ? roleRaw.map(String)
    : roleRaw
      ? [String(roleRaw)]
      : [];

  const id = Number(idRaw);
  if (!Number.isFinite(id)) return null;

  return {
    id,
    username,
    roles,
  };
}
