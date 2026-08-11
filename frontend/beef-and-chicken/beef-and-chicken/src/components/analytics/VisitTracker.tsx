import { useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackVisit } from "../../api/visitTrackingApi";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  getOrCreateVisitorId,
  hasAnalyticsConsent,
} from "../../utils/cookieConsent";

const VISIT_THROTTLE_MS = 10_000;

function getVisitSessionKey(path: string) {
  return `bnc_visit_sent:${path}`;
}

export default function VisitTracker() {
  const location = useLocation();

  const sendVisit = useCallback(async () => {
    if (!hasAnalyticsConsent()) {
      return;
    }

    const path = `${location.pathname}${location.search}`;

    const sessionKey = getVisitSessionKey(path);
    const lastSentAt = Number(sessionStorage.getItem(sessionKey));
    const now = Date.now();

    if (Number.isFinite(lastSentAt) && now - lastSentAt < VISIT_THROTTLE_MS) {
      return;
    }

    sessionStorage.setItem(sessionKey, String(now));

    try {
      await trackVisit({
        path,
        visitorId: getOrCreateVisitorId(),
      });
    } catch {
      // Tracking must never break the user experience.
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    void sendVisit();
  }, [sendVisit]);

  useEffect(() => {
    function handleConsentChanged() {
      void sendVisit();
    }

    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, handleConsentChanged);

    return () => {
      window.removeEventListener(
        COOKIE_CONSENT_CHANGED_EVENT,
        handleConsentChanged,
      );
    };
  }, [sendVisit]);

  return null;
}
