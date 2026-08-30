import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { updateProfile, uploadProfilePicture } from "../api/authApi";
import { API_ORIGIN } from "../api/https";
import { useAuth } from "../auth/AuthContext";
import "../styles/CustomerProfilePage.scss";

function validateOptionalPhoneNumber(phoneNumber: string) {
  const trimmed = phoneNumber.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length < 6 || trimmed.length > 20) {
    return "Broj telefona mora imati između 6 i 20 karaktera.";
  }

  if (!/^[0-9+\-/() ]+$/.test(trimmed)) {
    return "Broj telefona može sadržati samo brojeve, razmake i znakove + - / ( ).";
  }

  return null;
}

function validateProfileName(value: string, fieldName: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return `${fieldName} je obavezno.`;
  }

  if (trimmed.length < 2) {
    return `${fieldName} mora imati najmanje 2 karaktera.`;
  }

  if (trimmed.length > 50) {
    return `${fieldName} može imati najviše 50 karaktera.`;
  }

  return null;
}

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.trim()?.[0] ?? "";
  const last = lastName?.trim()?.[0] ?? "";

  return `${first}${last}`.toUpperCase() || "BC";
}

const MAX_PROFILE_PICTURE_SIZE = 2 * 1024 * 1024;

const ALLOWED_PROFILE_PICTURE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

function resolveProfilePictureUrl(profilePicture?: string | null) {
  if (!profilePicture) {
    return null;
  }

  if (
    profilePicture.startsWith("http://") ||
    profilePicture.startsWith("https://")
  ) {
    return profilePicture;
  }

  return `${API_ORIGIN}${profilePicture}`;
}

function validateProfilePicture(file: File) {
  if (!ALLOWED_PROFILE_PICTURE_TYPES.includes(file.type)) {
    return "Dozvoljeni formati slike su jpg, jpeg, png i webp.";
  }

  if (file.size > MAX_PROFILE_PICTURE_SIZE) {
    return "Profilna slika može imati najviše 2MB.";
  }

  return null;
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

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });

  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setProfileForm({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      phoneNumber: user?.phoneNumber ?? "",
    });
  }, [user?.firstName, user?.lastName, user?.phoneNumber]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  async function onRefreshProfile() {
    try {
      setRefreshingProfile(true);
      setError(null);
      setSuccessMessage(null);

      await refreshProfile();

      setSuccessMessage("Podaci profila su osveženi.");
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri osvežavanju profila."));
    } finally {
      setRefreshingProfile(false);
    }
  }

  function startProfileEdit() {
    setProfileForm({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      phoneNumber: user?.phoneNumber ?? "",
    });

    setEditingProfile(true);
    setError(null);
    setSuccessMessage(null);
  }

  function cancelProfileEdit() {
    setEditingProfile(false);

    setProfileForm({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      phoneNumber: user?.phoneNumber ?? "",
    });

    setError(null);
    setSuccessMessage(null);
  }

  async function onSaveProfile() {
    const firstNameError = validateProfileName(profileForm.firstName, "Ime");

    if (firstNameError) {
      setError(firstNameError);
      return;
    }

    const lastNameError = validateProfileName(profileForm.lastName, "Prezime");

    if (lastNameError) {
      setError(lastNameError);
      return;
    }

    const phoneError = validateOptionalPhoneNumber(profileForm.phoneNumber);

    if (phoneError) {
      setError(phoneError);
      return;
    }

    const normalizedFirstName = profileForm.firstName.trim();
    const normalizedLastName = profileForm.lastName.trim();
    const normalizedPhoneNumber = profileForm.phoneNumber.trim() || null;

    const currentPhoneNumber = user?.phoneNumber?.trim() || null;

    const hasChanges =
      normalizedFirstName !== user?.firstName ||
      normalizedLastName !== user?.lastName ||
      normalizedPhoneNumber !== currentPhoneNumber;

    if (!hasChanges) {
      setEditingProfile(false);
      setError(null);
      return;
    }

    try {
      setSavingProfile(true);
      setError(null);
      setSuccessMessage(null);

      const updatedProfile = await updateProfile({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        phoneNumber: normalizedPhoneNumber,
      });

      setUserProfile(updatedProfile);
      setEditingProfile(false);

      setSuccessMessage("Lični podaci su uspešno sačuvani.");
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri izmeni profila."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function onProfilePictureChange(file?: File | null) {
    if (!file) {
      return;
    }

    const validationError = validateProfilePicture(file);

    if (validationError) {
      setError(validationError);
      setSuccessMessage(null);
      return;
    }

    try {
      setUploadingProfilePicture(true);
      setError(null);
      setSuccessMessage(null);

      const updatedProfile = await uploadProfilePicture(file);

      setUserProfile(updatedProfile);

      setSuccessMessage("Profilna slika je uspešno promenjena.");
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri promeni profilne slike."));
    } finally {
      setUploadingProfilePicture(false);
    }
  }

  if (!user) {
    return (
      <main className="customer-profile-guest">
        <section className="customer-profile-guest__card">
          <div className="customer-profile-guest__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="8"
                r="4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />

              <path
                d="M5 20c.8-4 3-6 7-6s6.2 2 7 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <span className="customer-profile-guest__eyebrow">
            PRIJAVA JE POTREBNA
          </span>

          <h1>Niste prijavljeni</h1>

          <p>
            Prijavite se kako biste pristupili svom profilu, adresama,
            alergenima i porudžbinama.
          </p>

          <Link to="/login" className="btn btn--primary">
            Prijavi se
          </Link>
        </section>
      </main>
    );
  }

  const profilePictureUrl = resolveProfilePictureUrl(user.profilePicture);

  const displayName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <main className="customer-profile-page">
      <section className="customer-profile-hero">
        <div className="customer-profile-hero__content">
          <span className="customer-profile-hero__eyebrow">
            VAŠ BEEF N&apos; CHICKEN NALOG
          </span>

          <h1 className="customer-profile-hero__title">Moj profil</h1>

          <p className="customer-profile-hero__description">
            Uredite svoje podatke i držite sve što vam je potrebno za
            poručivanje na jednom mestu.
          </p>

          <div className="customer-profile-hero__note">
            <span
              className="customer-profile-hero__note-icon"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3 4.5 6.4v5.2c0 4.5 3.1 7.7 7.5 9.4 4.4-1.7 7.5-4.9 7.5-9.4V6.4L12 3Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />

                <path
                  d="m9 12 2 2 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span>Vaši podaci koriste se za lakše i brže poručivanje.</span>
          </div>
        </div>

        <aside className="customer-profile-summary">
          <div className="customer-profile-summary__avatar-wrapper">
            <div
              className="customer-profile-summary__avatar"
              aria-hidden="true"
            >
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt=""
                  className="customer-profile-summary__avatar-image"
                />
              ) : (
                getInitials(user.firstName, user.lastName)
              )}
            </div>

            <label className="customer-profile-summary__upload">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                disabled={uploadingProfilePicture || savingProfile}
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  void onProfilePictureChange(file);

                  event.target.value = "";
                }}
              />

              {uploadingProfilePicture ? (
                <span className="customer-profile-summary__upload-spinner" />
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />

                  <circle
                    cx="12"
                    cy="13"
                    r="3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>
              )}

              <span>
                {uploadingProfilePicture ? "Šaljem..." : "Promeni sliku"}
              </span>
            </label>
          </div>

          <div className="customer-profile-summary__identity">
            <span className="customer-profile-summary__label">
              KORISNIČKI PROFIL
            </span>

            <strong>{displayName}</strong>

            <span className="customer-profile-summary__email">
              {user.email}
            </span>
          </div>

          <div className="customer-profile-summary__status">
            <span
              className={[
                "customer-profile-summary__status-dot",
                user.phoneNumber
                  ? "customer-profile-summary__status-dot--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />

            <span>
              {user.phoneNumber
                ? "Kontakt telefon je dodat"
                : "Kontakt telefon nije dodat"}
            </span>
          </div>
        </aside>
      </section>

      {error && (
        <div
          className="customer-profile-alert customer-profile-alert--error"
          role="alert"
        >
          <span className="customer-profile-alert__icon" aria-hidden="true">
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
          className="customer-profile-alert customer-profile-alert--success"
          role="status"
          aria-live="polite"
        >
          <span className="customer-profile-alert__icon" aria-hidden="true">
            ✓
          </span>

          <div>
            <strong>Profil je ažuriran</strong>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      <section className="customer-profile-details">
        <header className="customer-profile-details__header">
          <div>
            <span className="customer-profile-details__eyebrow">
              LIČNI PODACI
            </span>

            <h2>Podaci naloga</h2>

            <p>Ove informacije možete promeniti kada god želite.</p>
          </div>

          <div className="customer-profile-details__actions">
            <button
              type="button"
              className="customer-profile-details__refresh"
              disabled={
                refreshingProfile ||
                savingProfile ||
                uploadingProfilePicture ||
                editingProfile
              }
              onClick={onRefreshProfile}
              aria-label="Osveži podatke profila"
            >
              {refreshingProfile ? (
                <span className="customer-profile-details__spinner" />
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
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

              <span>{refreshingProfile ? "Osvežavam..." : "Osveži"}</span>
            </button>

            {!editingProfile && (
              <button
                type="button"
                className="btn btn--primary"
                disabled={
                  savingProfile || uploadingProfilePicture || refreshingProfile
                }
                onClick={startProfileEdit}
              >
                Izmeni podatke
              </button>
            )}
          </div>
        </header>

        {editingProfile ? (
          <div className="customer-profile-form">
            <div className="customer-profile-form__grid">
              <label className="customer-profile-form__field">
                <span>Ime</span>

                <input
                  type="text"
                  value={profileForm.firstName}
                  disabled={savingProfile}
                  maxLength={50}
                  autoComplete="given-name"
                  placeholder="Unesite ime"
                  onChange={(event) => {
                    setProfileForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }));

                    setError(null);
                    setSuccessMessage(null);
                  }}
                />
              </label>

              <label className="customer-profile-form__field">
                <span>Prezime</span>

                <input
                  type="text"
                  value={profileForm.lastName}
                  disabled={savingProfile}
                  maxLength={50}
                  autoComplete="family-name"
                  placeholder="Unesite prezime"
                  onChange={(event) => {
                    setProfileForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }));

                    setError(null);
                    setSuccessMessage(null);
                  }}
                />
              </label>

              <label className="customer-profile-form__field customer-profile-form__field--wide">
                <span>Broj telefona</span>

                <input
                  type="tel"
                  value={profileForm.phoneNumber}
                  disabled={savingProfile}
                  autoComplete="tel"
                  placeholder="060 123 4567"
                  onChange={(event) => {
                    setProfileForm((current) => ({
                      ...current,
                      phoneNumber: event.target.value,
                    }));

                    setError(null);
                    setSuccessMessage(null);
                  }}
                />

                <small>
                  Telefon je opcionalan. Dozvoljeni su brojevi, razmaci i
                  znakovi + - / ( ).
                </small>
              </label>
            </div>

            <div className="customer-profile-form__actions">
              <button
                type="button"
                className="customer-profile-form__cancel"
                disabled={savingProfile}
                onClick={cancelProfileEdit}
              >
                Otkaži
              </button>

              <button
                type="button"
                className="customer-profile-form__save"
                disabled={savingProfile}
                onClick={onSaveProfile}
              >
                {savingProfile && (
                  <span
                    className="customer-profile-form__spinner"
                    aria-hidden="true"
                  />
                )}

                <span>{savingProfile ? "Čuvam..." : "Sačuvaj promene"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="customer-profile-data">
            <div className="customer-profile-data__item">
              <span>Ime</span>
              <strong>{user.firstName}</strong>
            </div>

            <div className="customer-profile-data__item">
              <span>Prezime</span>
              <strong>{user.lastName}</strong>
            </div>

            <div className="customer-profile-data__item">
              <span>Broj telefona</span>

              <strong
                className={
                  user.phoneNumber ? "" : "customer-profile-data__missing"
                }
              >
                {user.phoneNumber || "Nije unet"}
              </strong>
            </div>

            <div className="customer-profile-data__item">
              <span>Email adresa</span>
              <strong>{user.email}</strong>
            </div>

            <div className="customer-profile-data__item customer-profile-data__item--wide">
              <span>Korisničko ime</span>
              <strong>{user.userName}</strong>
            </div>
          </div>
        )}
      </section>

      <section className="customer-profile-links">
        <header className="customer-profile-links__header">
          <div>
            <span className="customer-profile-links__eyebrow">
              BRZI PRISTUP
            </span>

            <h2>Vaš nalog na jednom mestu</h2>
          </div>

          <p>
            Upravljajte dostavom, upozorenjima i pregledajte svoje porudžbine.
          </p>
        </header>

        <div className="customer-profile-links__grid">
          <Link to="/addresses" className="customer-profile-link">
            <span className="customer-profile-link__icon" aria-hidden="true">
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

            <span className="customer-profile-link__content">
              <span className="customer-profile-link__eyebrow">DOSTAVA</span>

              <strong>Moje adrese</strong>

              <small>
                Dodajte, izmenite ili izaberite podrazumevanu adresu.
              </small>
            </span>

            <span className="customer-profile-link__arrow">→</span>
          </Link>

          <Link to="/my-allergens" className="customer-profile-link">
            <span className="customer-profile-link__icon" aria-hidden="true">
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

            <span className="customer-profile-link__content">
              <span className="customer-profile-link__eyebrow">UPOZORENJA</span>

              <strong>Moji alergeni</strong>

              <small>
                Podesite alergene koji treba da budu označeni u meniju.
              </small>
            </span>

            <span className="customer-profile-link__arrow">→</span>
          </Link>

          <Link to="/my-orders" className="customer-profile-link">
            <span className="customer-profile-link__icon" aria-hidden="true">
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

            <span className="customer-profile-link__content">
              <span className="customer-profile-link__eyebrow">PORUDŽBINE</span>

              <strong>Moje porudžbine</strong>

              <small>Pratite aktivne i pregledajte prethodne porudžbine.</small>
            </span>

            <span className="customer-profile-link__arrow">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
