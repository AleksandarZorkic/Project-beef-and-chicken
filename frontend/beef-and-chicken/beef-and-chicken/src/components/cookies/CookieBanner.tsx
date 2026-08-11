import { useEffect, useState } from "react";
import {
  getCookieConsent,
  setCookieConsent,
  type CookieConsentValue,
} from "../../utils/cookieConsent";

export default function CookieBanner() {
  const [consent, setConsent] = useState<CookieConsentValue | null>(() =>
    getCookieConsent(),
  );

  useEffect(() => {
    setConsent(getCookieConsent());
  }, []);

  function handleAccept() {
    setCookieConsent("accepted");
    setConsent("accepted");
  }

  function handleReject() {
    setCookieConsent("rejected");
    setConsent("rejected");
  }

  if (consent !== null) {
    return null;
  }

  return (
    <aside
      className="cookie-banner"
      role="dialog"
      aria-live="polite"
      aria-label="Podešavanja kolačića"
    >
      <div className="cookie-banner__content">
        <span className="cookie-banner__eyebrow">Privatnost</span>

        <h2 className="cookie-banner__title">
          Koristimo osnovnu analitiku poseta
        </h2>

        <p className="cookie-banner__text">
          Neophodni podaci se koriste da aplikacija radi pravilno. Uz vašu
          saglasnost beležimo osnovne posete stranicama kako bismo poboljšali
          meni, poručivanje i korisničko iskustvo.
        </p>
      </div>

      <div className="cookie-banner__actions">
        <button
          type="button"
          className="cookie-banner__button cookie-banner__button--secondary"
          onClick={handleReject}
        >
          Odbij
        </button>

        <button
          type="button"
          className="cookie-banner__button cookie-banner__button--primary"
          onClick={handleAccept}
        >
          Prihvatam
        </button>
      </div>
    </aside>
  );
}
