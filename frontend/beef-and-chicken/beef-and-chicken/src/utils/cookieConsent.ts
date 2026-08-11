export type CookieConsentValue = "accepted" | "rejected";

const COOKIE_CONSENT_KEY = "bnc_cookie_consent_v1";
const VISITOR_ID_KEY = "bnc_visitor_id_v1";

export const COOKIE_CONSENT_CHANGED_EVENT = "bnc_cookie_consent_changed";

export function getCookieConsent(): CookieConsentValue | null {
  const value = localStorage.getItem(COOKIE_CONSENT_KEY);

  if (value === "accepted" || value === "rejected") {
    return value;
  }

  return null;
}

export function hasAnalyticsConsent() {
  return getCookieConsent() === "accepted";
}

export function setCookieConsent(value: CookieConsentValue) {
  localStorage.setItem(COOKIE_CONSENT_KEY, value);

  if (value === "rejected") {
    localStorage.removeItem(VISITOR_ID_KEY);
  }

  window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGED_EVENT));
}

export function getOrCreateVisitorId() {
  const existingVisitorId = localStorage.getItem(VISITOR_ID_KEY);

  if (existingVisitorId) {
    return existingVisitorId;
  }

  const visitorId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(VISITOR_ID_KEY, visitorId);

  return visitorId;
}
