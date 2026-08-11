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
      setSuccessMessage(null);
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
      setSuccessMessage("Profil je uspešno izmenjen.");
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

  const profilePictureUrl = resolveProfilePictureUrl(user.profilePicture);

  return (
    <main className="customer-profile-page">
      <header className="customer-profile-page__header">
        <div className="customer-profile-page__heading">
          <span className="customer-profile-page__eyebrow">
            KORISNIČKI NALOG
          </span>

          <h1 className="customer-profile-page__title">Moj profil</h1>

          <p className="customer-profile-page__description">
            Pregledajte podatke svog naloga, uredite lične podatke i brzo
            pristupite adresama, alergenima i porudžbinama.
          </p>
        </div>

        <button
          type="button"
          className="customer-profile-page__refresh-button"
          disabled={
            refreshingProfile || savingProfile || uploadingProfilePicture
          }
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
        <section className="profile-card profile-card--wide">
          <header className="profile-card__header">
            <div className="profile-card__avatar-block">
              <div className="profile-card__avatar" aria-hidden="true">
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt=""
                    className="profile-card__avatar-image"
                  />
                ) : (
                  getInitials(
                    editingProfile ? profileForm.firstName : user.firstName,
                    editingProfile ? profileForm.lastName : user.lastName,
                  )
                )}
              </div>

              <label className="profile-card__picture-button">
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

                <span>
                  {uploadingProfilePicture ? "Šaljem..." : "Promeni sliku"}
                </span>
              </label>
            </div>

            <div className="profile-card__identity">
              <span className="profile-card__eyebrow">LIČNI PODACI</span>

              <h2 className="profile-card__name">
                {editingProfile
                  ? `${profileForm.firstName || user.firstName} ${
                      profileForm.lastName || user.lastName
                    }`
                  : `${user.firstName} ${user.lastName}`}
              </h2>

              <span className="profile-card__email">{user.email}</span>
            </div>

            <button
              type="button"
              className="profile-phone-card__edit-button"
              disabled={savingProfile || uploadingProfilePicture}
              onClick={editingProfile ? cancelProfileEdit : startProfileEdit}
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

              <span>{editingProfile ? "Otkaži izmenu" : "Izmeni profil"}</span>
            </button>
          </header>

          <div className="profile-card__details">
            {editingProfile ? (
              <>
                <label className="profile-detail profile-detail--wide">
                  <span className="profile-detail__label">Ime</span>

                  <input
                    className="profile-phone-form__input"
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

                <label className="profile-detail profile-detail--wide">
                  <span className="profile-detail__label">Prezime</span>

                  <input
                    className="profile-phone-form__input"
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

                <label className="profile-detail profile-detail--wide">
                  <span className="profile-detail__label">Broj telefona</span>

                  <input
                    className="profile-phone-form__input"
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

                  <small className="profile-phone-form__hint">
                    Telefon je opcionalan na profilu. Dozvoljeni su brojevi,
                    razmaci i znakovi + - / ( ).
                  </small>
                </label>

                <div className="profile-phone-form__actions">
                  <button
                    type="button"
                    className="profile-phone-form__cancel-button"
                    disabled={savingProfile}
                    onClick={cancelProfileEdit}
                  >
                    Otkaži
                  </button>

                  <button
                    type="button"
                    className="profile-phone-form__save-button"
                    disabled={savingProfile}
                    onClick={onSaveProfile}
                  >
                    {savingProfile && (
                      <span
                        className="profile-phone-form__spinner"
                        aria-hidden="true"
                      />
                    )}

                    <span>{savingProfile ? "Čuvam..." : "Sačuvaj profil"}</span>

                    {!savingProfile && <span aria-hidden="true">→</span>}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="profile-detail">
                  <span className="profile-detail__label">Ime</span>

                  <strong className="profile-detail__value">
                    {user.firstName}
                  </strong>
                </div>

                <div className="profile-detail">
                  <span className="profile-detail__label">Prezime</span>

                  <strong className="profile-detail__value">
                    {user.lastName}
                  </strong>
                </div>

                <div className="profile-detail">
                  <span className="profile-detail__label">Broj telefona</span>

                  <strong className="profile-detail__value">
                    {user.phoneNumber || "Nije unet"}
                  </strong>
                </div>
              </>
            )}

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
