import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { updatePhoneNumber } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import "../styles/CustomerProfilePage.scss";

function validatePhoneNumber(phoneNumber: string) {
  const trimmed = phoneNumber.trim();

  if (!trimmed) {
    return "Broj telefona je obavezan.";
  }

  if (trimmed.length < 6 || trimmed.length > 20) {
    return "Broj telefona mora imati između 6 i 20 karaktera.";
  }

  if (!/^[0-9+\-/() ]+$/.test(trimmed)) {
    return "Broj telefona može sadržati samo brojeve, razmake i znakove + - / ( ).";
  }

  return null;
}

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";

  return `${first}${last}`.toUpperCase() || "BC";
}

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error ??
    error?.response?.data?.message ??
    error?.response?.data?.title ??
    error?.message ??
    fallback
  );
}

export default function CustomerProfilePage() {
  const { user, setUserProfile, refreshProfile } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setPhoneNumber(user?.phoneNumber ?? "");
  }, [user?.phoneNumber]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [successMessage]);

  async function onRefreshProfile() {
    try {
      setRefreshingProfile(true);
      setError(null);
      setSuccessMessage(null);

      await refreshProfile();

      setSuccessMessage("Profil je osvežen.");
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri osvežavanju profila."));
    } finally {
      setRefreshingProfile(false);
    }
  }

  async function onSavePhoneNumber() {
    const validationError = validatePhoneNumber(phoneNumber);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (phoneNumber.trim() === (user?.phoneNumber ?? "").trim()) {
      setEditingPhone(false);
      setError(null);
      setSuccessMessage(null);
      return;
    }

    try {
      setSavingPhone(true);
      setError(null);
      setSuccessMessage(null);

      const updatedProfile = await updatePhoneNumber({
        phoneNumber: phoneNumber.trim(),
      });

      setUserProfile(updatedProfile);
      setEditingPhone(false);
      setSuccessMessage("Broj telefona je uspešno promenjen.");
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri promeni broja telefona."));
    } finally {
      setSavingPhone(false);
    }
  }

  function cancelPhoneEdit() {
    setEditingPhone(false);
    setPhoneNumber(user?.phoneNumber ?? "");
    setError(null);
    setSuccessMessage(null);
  }

  function startPhoneEdit() {
    setPhoneNumber(user?.phoneNumber ?? "");
    setEditingPhone(true);
    setError(null);
    setSuccessMessage(null);
  }

  if (!user) {
    return (
      <main className="profile-guest-state">
        <section className="profile-guest-state__card">
          <span className="profile-guest-state__eyebrow">
            PRIJAVA JE POTREBNA
          </span>

          <h1 className="profile-guest-state__title">Niste prijavljeni</h1>

          <p className="profile-guest-state__text">
            Prijavite se kako biste pristupili podacima svog naloga.
          </p>

          <Link to="/login" className="profile-guest-state__link">
            Prijavi se
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="customer-profile-page">
      <header className="customer-profile-page__header">
        <div className="customer-profile-page__heading">
          <span className="customer-profile-page__eyebrow">
            KORISNIČKI NALOG
          </span>

          <h1 className="customer-profile-page__title">Moj profil</h1>

          <p className="customer-profile-page__description">
            Pregledajte podatke svog naloga, uredite kontakt telefon i brzo
            pristupite adresama, alergenima i porudžbinama.
          </p>
        </div>

        <button
          type="button"
          className="customer-profile-page__refresh-button"
          disabled={refreshingProfile}
          onClick={onRefreshProfile}
        >
          {refreshingProfile ? (
            <span
              className="customer-profile-page__refresh-spinner"
              aria-hidden="true"
            />
          ) : (
            <svg
              className="customer-profile-page__refresh-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M20 7v5h-5M4 17v-5h5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M18.2 9A7 7 0 0 0 6.4 6.4L4 9m16 6-2.4 2.6A7 7 0 0 1 5.8 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          <span>{refreshingProfile ? "Osvežavam..." : "Osveži profil"}</span>
        </button>
      </header>

      {error && (
        <div className="profile-alert profile-alert--error" role="alert">
          <span className="profile-alert__icon" aria-hidden="true">
            !
          </span>

          <div>
            <strong>Došlo je do greške</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          className="profile-alert profile-alert--success"
          role="status"
          aria-live="polite"
        >
          <span className="profile-alert__icon" aria-hidden="true">
            ✓
          </span>

          <div>
            <strong>Uspešno</strong>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      <div className="customer-profile-page__grid">
        <section className="profile-card">
          <header className="profile-card__header">
            <div className="profile-card__avatar" aria-hidden="true">
              {getInitials(user.firstName, user.lastName)}
            </div>

            <div className="profile-card__identity">
              <span className="profile-card__eyebrow">LIČNI PODACI</span>

              <h2 className="profile-card__name">
                {user.firstName} {user.lastName}
              </h2>

              <span className="profile-card__email">{user.email}</span>
            </div>
          </header>

          <div className="profile-card__details">
            <div className="profile-detail">
              <span className="profile-detail__label">Ime</span>

              <strong className="profile-detail__value">
                {user.firstName}
              </strong>
            </div>

            <div className="profile-detail">
              <span className="profile-detail__label">Prezime</span>

              <strong className="profile-detail__value">{user.lastName}</strong>
            </div>

            <div className="profile-detail profile-detail--wide">
              <span className="profile-detail__label">Email adresa</span>

              <strong className="profile-detail__value">{user.email}</strong>
            </div>

            <div className="profile-detail">
              <span className="profile-detail__label">Korisničko ime</span>

              <strong className="profile-detail__value">{user.userName}</strong>
            </div>

            <div className="profile-detail">
              <span className="profile-detail__label">Uloga</span>

              <div className="profile-detail__roles">
                {user.roles.length > 0 ? (
                  user.roles.map((role) => (
                    <span key={role} className="profile-role-badge">
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="profile-role-badge profile-role-badge--empty">
                    Nema uloge
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="profile-phone-card">
          <header className="profile-phone-card__header">
            <div className="profile-phone-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M8.2 3.5 10 7.7a1.4 1.4 0 0 1-.3 1.5L8.3 10.6a15.5 15.5 0 0 0 5.1 5.1l1.4-1.4a1.4 1.4 0 0 1 1.5-.3l4.2 1.8a1.4 1.4 0 0 1 .8 1.3v2.2a2 2 0 0 1-2 2C10.1 20.7 3.3 13.9 2.7 4.7a2 2 0 0 1 2-2h2.2a1.4 1.4 0 0 1 1.3.8Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <span className="profile-phone-card__eyebrow">
                KONTAKT ZA DOSTAVU
              </span>

              <h2 className="profile-phone-card__title">Broj telefona</h2>
            </div>
          </header>

          <p className="profile-phone-card__description">
            Ovaj broj se automatski koristi kao kontakt telefon prilikom
            poručivanja.
          </p>

          {!editingPhone ? (
            <div className="profile-phone-card__display">
              <div className="profile-phone-card__current">
                <span className="profile-phone-card__current-label">
                  Trenutni broj
                </span>

                {user.phoneNumber ? (
                  <a
                    href={`tel:${user.phoneNumber}`}
                    className="profile-phone-card__number"
                  >
                    {user.phoneNumber}
                  </a>
                ) : (
                  <span className="profile-phone-card__missing">
                    Broj telefona nije unet
                  </span>
                )}
              </div>

              <button
                type="button"
                className="profile-phone-card__edit-button"
                onClick={startPhoneEdit}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="m14.5 5.5 4 4M4 20l4.2-1 10.3-10.3a1.4 1.4 0 0 0 0-2l-1.2-1.2a1.4 1.4 0 0 0-2 0L5 15.8 4 20Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <span>{user.phoneNumber ? "Promeni broj" : "Dodaj broj"}</span>
              </button>
            </div>
          ) : (
            <form
              className="profile-phone-form"
              onSubmit={(event) => {
                event.preventDefault();
                onSavePhoneNumber();
              }}
            >
              <label className="profile-phone-form__field">
                <span className="profile-phone-form__label">
                  Novi broj telefona
                </span>

                <div className="profile-phone-form__input-wrapper">
                  <span
                    className="profile-phone-form__input-icon"
                    aria-hidden="true"
                  >
                    +
                  </span>

                  <input
                    className="profile-phone-form__input"
                    type="tel"
                    value={phoneNumber}
                    disabled={savingPhone}
                    autoComplete="tel"
                    placeholder="060 123 4567"
                    onChange={(event) => {
                      setPhoneNumber(event.target.value);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                  />
                </div>

                <small className="profile-phone-form__hint">
                  Dozvoljeni su brojevi, razmaci i znakovi + - / ( ).
                </small>
              </label>

              <div className="profile-phone-form__actions">
                <button
                  type="button"
                  className="profile-phone-form__cancel-button"
                  disabled={savingPhone}
                  onClick={cancelPhoneEdit}
                >
                  Otkaži
                </button>

                <button
                  type="submit"
                  className="profile-phone-form__save-button"
                  disabled={savingPhone}
                >
                  {savingPhone && (
                    <span
                      className="profile-phone-form__spinner"
                      aria-hidden="true"
                    />
                  )}

                  <span>{savingPhone ? "Čuvam..." : "Sačuvaj broj"}</span>

                  {!savingPhone && <span aria-hidden="true">→</span>}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      <section className="profile-quick-links">
        <header className="profile-quick-links__header">
          <div>
            <span className="profile-quick-links__eyebrow">BRZI PRISTUP</span>

            <h2 className="profile-quick-links__title">Upravljanje nalogom</h2>
          </div>

          <p className="profile-quick-links__description">
            Najvažnije opcije vašeg korisničkog naloga nalaze se na jednom
            mestu.
          </p>
        </header>

        <div className="profile-quick-links__grid">
          <Link to="/addresses" className="profile-quick-link">
            <span className="profile-quick-link__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <circle
                  cx="12"
                  cy="9"
                  r="2.3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
            </span>

            <span className="profile-quick-link__content">
              <strong>Moje adrese</strong>

              <small>Dodajte ili izmenite adresu za dostavu.</small>
            </span>

            <span className="profile-quick-link__arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link to="/my-allergens" className="profile-quick-link">
            <span className="profile-quick-link__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3c3.4 3.4 5.5 6.1 5.5 9A5.5 5.5 0 0 1 6.5 12C6.5 9.1 8.6 6.4 12 3Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M9.5 14.5c.7 1 1.5 1.5 2.5 1.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <span className="profile-quick-link__content">
              <strong>Moji alergeni</strong>

              <small>Označite alergene radi upozorenja u meniju.</small>
            </span>

            <span className="profile-quick-link__arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link to="/my-orders" className="profile-quick-link">
            <span className="profile-quick-link__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M6 4h12l1 16H5L6 4Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M9 8a3 3 0 0 0 6 0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <span className="profile-quick-link__content">
              <strong>Moje porudžbine</strong>

              <small>Pratite status aktivnih porudžbina.</small>
            </span>

            <span className="profile-quick-link__arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
