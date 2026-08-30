import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

  const selectedPreview = useMemo(() => {
    return myAllergens.slice(0, 3);
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
    }, 2600);

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
    const isSelected = myAllergenIds.has(allergen.id);

    try {
      setSavingId(allergen.id);
      setError(null);
      setSuccessMessage(null);

      if (isSelected) {
        await removeAllergenFromProfile(allergen.id);

        setMyAllergens((current) =>
          current.filter((item) => item.id !== allergen.id),
        );

        setSuccessMessage(`„${allergen.name}“ je uklonjen iz vašeg izbora.`);
      } else {
        const addedAllergen = await addAllergenToProfile(allergen.id);

        setMyAllergens((current) => [...current, addedAllergen]);

        setSuccessMessage(`„${allergen.name}“ je dodat u vaš izbor.`);
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
        <section
          className="profile-allergens-loading"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="profile-allergens-loading__visual">
            <span className="profile-allergens-loading__spinner" />
          </div>

          <div className="profile-allergens-loading__content">
            <span className="profile-allergens-loading__eyebrow">
              BEEF N&apos; CHICKEN
            </span>

            <h1>Učitavamo vaše alergene</h1>

            <p>
              Još samo trenutak dok pripremimo vaše personalizovane postavke.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-allergens-page">
      <section className="profile-allergens-hero">
        <div className="profile-allergens-hero__content">
          <span className="profile-allergens-hero__eyebrow">
            VAŠE PREFERENCE
          </span>

          <h1 className="profile-allergens-hero__title">Moji alergeni</h1>

          <p className="profile-allergens-hero__description">
            Označite alergene na koje želite upozorenje. Kada pregledate meni,
            posebno ćemo označiti jela koja sadrže neki od izabranih alergena.
          </p>

          <div className="profile-allergens-hero__note">
            <span
              className="profile-allergens-hero__note-icon"
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

            <span>
              Promene se čuvaju automatski čim izaberete ili uklonite alergen.
            </span>
          </div>
        </div>

        <aside className="profile-allergens-summary">
          <div className="profile-allergens-summary__top">
            <span
              className="profile-allergens-summary__icon"
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
              </svg>
            </span>

            <span
              className={[
                "profile-allergens-summary__status",
                myAllergens.length > 0
                  ? "profile-allergens-summary__status--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span />
              {myAllergens.length > 0 ? "Aktivno" : "Nije podešeno"}
            </span>
          </div>

          <div className="profile-allergens-summary__count">
            <strong>{myAllergens.length}</strong>

            <span>izabranih alergena</span>
          </div>

          {selectedPreview.length > 0 ? (
            <div className="profile-allergens-summary__preview">
              {selectedPreview.map((allergen) => (
                <span key={allergen.id}>{allergen.name}</span>
              ))}

              {myAllergens.length > selectedPreview.length && (
                <span>+{myAllergens.length - selectedPreview.length}</span>
              )}
            </div>
          ) : (
            <p className="profile-allergens-summary__empty">
              Još niste izabrali nijedan alergen.
            </p>
          )}
        </aside>
      </section>

      <section className="profile-allergens-safety">
        <span className="profile-allergens-safety__icon" aria-hidden="true">
          !
        </span>

        <div>
          <strong>Važno kod alergija na hranu</strong>

          <p>
            Oznake u aplikaciji služe kao dodatno upozorenje. Ako imate ozbiljnu
            alergiju, proverite sastav proizvoda i obavestite restoran prilikom
            poručivanja.
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
            <strong>Nismo uspeli da sačuvamo promenu</strong>
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
            <strong>Izbor je sačuvan</strong>
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

          <span>NEMA DOSTUPNIH ALERGENA</span>

          <h2>Lista je trenutno prazna</h2>

          <p>Trenutno nema alergena koje možete dodati na svoj profil.</p>
        </section>
      ) : (
        <section className="profile-allergens-selection">
          <header className="profile-allergens-selection__header">
            <div>
              <span className="profile-allergens-selection__eyebrow">
                PERSONALIZUJTE MENI
              </span>

              <h2>Izaberite alergene</h2>

              <p>Kliknite na karticu da uključite ili isključite upozorenje.</p>
            </div>

            <div className="profile-allergens-selection__count">
              <strong>{myAllergens.length}</strong>
              <span>od {allAllergens.length}</span>
            </div>
          </header>

          <div className="profile-allergens-grid">
            {allAllergens.map((allergen) => {
              const isSelected = myAllergenIds.has(allergen.id);
              const isSaving = savingId === allergen.id;

              return (
                <button
                  key={allergen.id}
                  type="button"
                  className={[
                    "profile-allergen-card",
                    isSelected ? "profile-allergen-card--selected" : "",
                    isSaving ? "profile-allergen-card--saving" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={isSaving}
                  aria-pressed={isSelected}
                  aria-busy={isSaving}
                  onClick={() => toggleAllergen(allergen)}
                >
                  <span className="profile-allergen-card__header">
                    <span className="profile-allergen-card__type">ALERGEN</span>

                    <span
                      className="profile-allergen-card__check"
                      aria-hidden="true"
                    >
                      {isSaving ? (
                        <span className="profile-allergen-card__spinner" />
                      ) : isSelected ? (
                        "✓"
                      ) : (
                        "+"
                      )}
                    </span>
                  </span>

                  <strong className="profile-allergen-card__name">
                    {allergen.name}
                  </strong>

                  <span className="profile-allergen-card__description">
                    {isSaving
                      ? "Čuvamo promenu..."
                      : isSelected
                        ? "Upozorenje uključeno"
                        : "Kliknite da uključite upozorenje"}
                  </span>

                  <span className="profile-allergen-card__footer">
                    <span
                      className={[
                        "profile-allergen-card__indicator",
                        isSelected
                          ? "profile-allergen-card__indicator--active"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />

                    {isSelected ? "Izabrano" : "Nije izabrano"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {allAllergens.length > 0 && (
        <footer className="profile-allergens-footer">
          <div className="profile-allergens-footer__content">
            <span className="profile-allergens-footer__eyebrow">
              VAŠ MENI JE PERSONALIZOVAN
            </span>

            <strong>
              {myAllergens.length > 0
                ? `Pratimo ${myAllergens.length} ${
                    myAllergens.length === 1 ? "alergen" : "alergena"
                  }`
                : "Upozorenja još nisu podešena"}
            </strong>

            <p>Vaš izbor možete promeniti u bilo kom trenutku.</p>
          </div>

          <Link to="/menu" className="btn btn--primary">
            Pogledaj meni
            <span aria-hidden="true">→</span>
          </Link>
        </footer>
      )}
    </main>
  );
}
