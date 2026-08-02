import { useEffect, useMemo, useState } from "react";
import { getAllergens } from "../api/allergenApi";
import {
  addAllergenToProfile,
  getMyAllergens,
  removeAllergenFromProfile,
} from "../api/userAllergenApi";
import type { Allergen } from "../types/allergen";
import { getApiErrorMessage } from "../utils/apiErrors";
import "../styles/ProfileAllergensPage.scss";

export default function ProfileAllergensPage() {
  const [allAllergens, setAllAllergens] = useState<Allergen[]>([]);
  const [myAllergens, setMyAllergens] = useState<Allergen[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const myAllergenIds = useMemo(() => {
    return new Set(myAllergens.map((allergen) => allergen.id));
  }, [myAllergens]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [allergens, userAllergens] = await Promise.all([
        getAllergens(),
        getMyAllergens(),
      ]);

      setAllAllergens(allergens);
      setMyAllergens(userAllergens);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function toggleAllergen(allergen: Allergen) {
    const isAdded = myAllergenIds.has(allergen.id);

    try {
      setSavingId(allergen.id);
      setError(null);
      setSuccessMessage(null);

      if (isAdded) {
        await removeAllergenFromProfile(allergen.id);

        setMyAllergens((previousAllergens) =>
          previousAllergens.filter(
            (currentAllergen) => currentAllergen.id !== allergen.id,
          ),
        );

        setSuccessMessage(`Alergen „${allergen.name}“ je uklonjen sa profila.`);
      } else {
        const addedAllergen = await addAllergenToProfile(allergen.id);

        setMyAllergens((previousAllergens) => [
          ...previousAllergens,
          addedAllergen,
        ]);

        setSuccessMessage(`Alergen „${allergen.name}“ je dodat na profil.`);
      }
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <main className="profile-allergens-page">
        <section className="profile-allergens-loading" aria-live="polite">
          <span
            className="profile-allergens-loading__spinner"
            aria-hidden="true"
          />

          <div>
            <strong>Učitavamo alergene</strong>

            <p>Sačekajte trenutak dok preuzmemo podatke vašeg profila.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-allergens-page">
      <header className="profile-allergens-page__header">
        <div className="profile-allergens-page__heading">
          <span className="profile-allergens-page__eyebrow">
            PERSONALIZOVANA UPOZORENJA
          </span>

          <h1 className="profile-allergens-page__title">Moji alergeni</h1>

          <p className="profile-allergens-page__description">
            Izaberite alergene na koje želite upozorenje. Jela koja ih sadrže
            biće posebno označena u meniju.
          </p>
        </div>

        <div className="profile-allergens-page__summary">
          <span className="profile-allergens-page__summary-label">
            Izabrano
          </span>

          <strong className="profile-allergens-page__summary-value">
            {myAllergens.length}
          </strong>

          <span className="profile-allergens-page__summary-total">
            od {allAllergens.length}
          </span>
        </div>
      </header>

      <section className="profile-allergens-info">
        <div className="profile-allergens-info__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />

            <path
              d="M12 10v6M12 7.2v.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div>
          <strong>Kako funkcionišu upozorenja?</strong>

          <p>
            Označeni alergeni koriste se da vas upozore kada jelo sadrži
            sastojak koji ste dodali na svoj profil.
          </p>
        </div>
      </section>

      {error && (
        <div
          className="profile-allergens-alert profile-allergens-alert--error"
          role="alert"
        >
          <span className="profile-allergens-alert__icon" aria-hidden="true">
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
          className="profile-allergens-alert profile-allergens-alert--success"
          role="status"
          aria-live="polite"
        >
          <span className="profile-allergens-alert__icon" aria-hidden="true">
            ✓
          </span>

          <div>
            <strong>Profil je ažuriran</strong>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {allAllergens.length === 0 ? (
        <section className="profile-allergens-empty">
          <div className="profile-allergens-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M12 3c3.4 3.4 5.5 6.1 5.5 9A5.5 5.5 0 0 1 6.5 12C6.5 9.1 8.6 6.4 12 3Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <span className="profile-allergens-empty__eyebrow">
            NEMA DOSTUPNIH ALERGENA
          </span>

          <h2 className="profile-allergens-empty__title">
            Lista je trenutno prazna
          </h2>

          <p className="profile-allergens-empty__description">
            Administrator još nije dodao alergene u sistem.
          </p>
        </section>
      ) : (
        <section className="profile-allergens-selection">
          <header className="profile-allergens-selection__header">
            <div>
              <span className="profile-allergens-selection__eyebrow">
                DOSTUPNI ALERGENI
              </span>

              <h2 className="profile-allergens-selection__title">
                Izaberite alergene
              </h2>
            </div>

            <span className="profile-allergens-selection__hint">
              Kliknite na karticu da promenite izbor
            </span>
          </header>

          <div className="profile-allergens-grid" aria-label="Izbor alergena">
            {allAllergens.map((allergen, index) => {
              const isAdded = myAllergenIds.has(allergen.id);
              const isSaving = savingId === allergen.id;

              return (
                <button
                  key={allergen.id}
                  type="button"
                  className={[
                    "profile-allergen-card",
                    isAdded ? "profile-allergen-card--selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={isSaving}
                  aria-pressed={isAdded}
                  onClick={() => toggleAllergen(allergen)}
                >
                  <span className="profile-allergen-card__top">
                    <span
                      className="profile-allergen-card__number"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span
                      className="profile-allergen-card__selection"
                      aria-hidden="true"
                    >
                      {isSaving ? (
                        <span className="profile-allergen-card__spinner" />
                      ) : isAdded ? (
                        "✓"
                      ) : (
                        "+"
                      )}
                    </span>
                  </span>

                  <span className="profile-allergen-card__content">
                    <span className="profile-allergen-card__eyebrow">
                      ALERGEN
                    </span>

                    <strong className="profile-allergen-card__name">
                      {allergen.name}
                    </strong>

                    <span className="profile-allergen-card__status">
                      {isSaving
                        ? "Čuvam promenu..."
                        : isAdded
                          ? "Dodato na profil"
                          : "Nije izabrano"}
                    </span>
                  </span>

                  <span className="profile-allergen-card__action">
                    {isAdded ? "Ukloni sa profila" : "Dodaj na profil"}

                    <span aria-hidden="true">→</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {allAllergens.length > 0 && (
        <footer className="profile-allergens-footer">
          <div>
            <strong>
              {myAllergens.length === 0
                ? "Niste izabrali nijedan alergen"
                : `${myAllergens.length} ${
                    myAllergens.length === 1
                      ? "alergen je izabran"
                      : "alergena je izabrano"
                  }`}
            </strong>

            <p>Izbor možete promeniti u bilo kom trenutku.</p>
          </div>

          <span
            className={[
              "profile-allergens-footer__status",
              myAllergens.length > 0
                ? "profile-allergens-footer__status--active"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span
              className="profile-allergens-footer__status-dot"
              aria-hidden="true"
            />

            {myAllergens.length > 0
              ? "Upozorenja su aktivna"
              : "Upozorenja nisu podešena"}
          </span>
        </footer>
      )}
    </main>
  );
}
