import { useEffect, useState, type FormEvent } from "react";
import {
  createAllergen,
  deleteAllergen,
  getAllergens,
  updateAllergen,
} from "../api/allergenApi";
import type { Allergen } from "../types/allergen";
import { getApiErrorMessage } from "../utils/apiErrors";
import "../styles/AllergensPage.scss";

export default function AllergensPage() {
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [name, setName] = useState("");
  const [editingAllergenId, setEditingAllergenId] = useState<number | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditing = editingAllergenId !== null;

  useEffect(() => {
    loadAllergens();
  }, []);

  async function loadAllergens() {
    try {
      setLoading(true);
      setError(null);

      const data = await getAllergens();
      setAllergens(data);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setEditingAllergenId(null);
    setError(null);
  }

  function startEdit(allergen: Allergen) {
    setEditingAllergenId(allergen.id);
    setName(allergen.name);
    setError(null);
    setSuccessMessage(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Naziv alergena je obavezan.");
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setError("Naziv alergena mora biti između 2 i 80 karaktera.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      if (isEditing) {
        const updatedAllergen = await updateAllergen(editingAllergenId, {
          name: trimmedName,
        });

        setAllergens((previousAllergens) =>
          previousAllergens.map((allergen) =>
            allergen.id === updatedAllergen.id ? updatedAllergen : allergen,
          ),
        );

        setSuccessMessage("Alergen je uspešno izmenjen.");
      } else {
        const createdAllergen = await createAllergen({
          name: trimmedName,
        });

        setAllergens((previousAllergens) => [
          ...previousAllergens,
          createdAllergen,
        ]);

        setSuccessMessage("Alergen je uspešno dodat.");
      }

      resetForm();
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(allergen: Allergen) {
    const confirmed = window.confirm(
      `Da li ste sigurni da želite da obrišete alergen "${allergen.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);

      await deleteAllergen(allergen.id);

      setAllergens((previousAllergens) =>
        previousAllergens.filter(
          (currentAllergen) => currentAllergen.id !== allergen.id,
        ),
      );

      setSuccessMessage("Alergen je uspešno obrisan.");

      if (editingAllergenId === allergen.id) {
        resetForm();
      }
    } catch (error) {
      setError(getApiErrorMessage(error));
    }
  }

  return (
    <main className="allergens-page">
      <header className="allergens-page__header">
        <div className="allergens-page__heading">
          <span className="allergens-page__eyebrow">ADMINISTRACIJA MENIJA</span>

          <h1 className="allergens-page__title">Alergeni</h1>

          <p className="allergens-page__description">
            Upravljajte alergenima koji se mogu povezati sa jelima i koristiti
            za upozorenja korisnika.
          </p>
        </div>

        <div className="allergens-page__count">
          <strong>{allergens.length}</strong>

          <span>
            {allergens.length === 1 ? "dodat alergen" : "dodatih alergena"}
          </span>
        </div>
      </header>

      {error && (
        <div className="allergens-alert allergens-alert--error" role="alert">
          <span className="allergens-alert__icon" aria-hidden="true">
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
          className="allergens-alert allergens-alert--success"
          role="status"
          aria-live="polite"
        >
          <span className="allergens-alert__icon" aria-hidden="true">
            ✓
          </span>

          <div>
            <strong>Uspešno</strong>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      <section className="allergens-form-panel">
        <header className="allergens-form-panel__header">
          <div className="allergens-form-panel__icon" aria-hidden="true">
            {isEditing ? "✎" : "+"}
          </div>

          <div>
            <span className="allergens-form-panel__eyebrow">
              {isEditing ? "IZMENA ALERGENA" : "NOVI ALERGEN"}
            </span>

            <h2 className="allergens-form-panel__title">
              {isEditing ? "Izmenite naziv alergena" : "Dodajte novi alergen"}
            </h2>

            <p className="allergens-form-panel__description">
              Naziv treba jasno da opisuje sastojak koji može izazvati
              alergijsku reakciju.
            </p>
          </div>

          {isEditing && (
            <span className="allergens-form-panel__editing-badge">
              Uređujete ID: {editingAllergenId}
            </span>
          )}
        </header>

        <form className="allergens-form" onSubmit={onSubmit} aria-busy={saving}>
          <label className="allergens-form__field">
            <span className="allergens-form__label">
              Naziv alergena
              <span className="allergens-form__required" aria-hidden="true">
                *
              </span>
            </span>

            <div className="allergens-form__input-wrapper">
              <span className="allergens-form__input-icon" aria-hidden="true">
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

              <input
                className="allergens-form__input"
                type="text"
                placeholder="Na primer: Gluten"
                value={name}
                minLength={2}
                maxLength={80}
                required
                disabled={saving}
                autoFocus={isEditing}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                  setSuccessMessage(null);
                }}
              />
            </div>

            <span className="allergens-form__field-footer">
              <small className="allergens-form__hint">
                Naziv mora imati između 2 i 80 karaktera.
              </small>

              <small className="allergens-form__character-count">
                {name.length}/80
              </small>
            </span>
          </label>

          <div className="allergens-form__actions">
            {isEditing && (
              <button
                type="button"
                className="allergens-form__cancel-button"
                disabled={saving}
                onClick={resetForm}
              >
                Otkaži
              </button>
            )}

            <button
              type="submit"
              className="allergens-form__submit-button"
              disabled={saving}
            >
              {saving && (
                <span className="allergens-form__spinner" aria-hidden="true" />
              )}

              <span>
                {saving
                  ? "Čuvam..."
                  : isEditing
                    ? "Sačuvaj izmenu"
                    : "Dodaj alergen"}
              </span>

              {!saving && <span aria-hidden="true">→</span>}
            </button>
          </div>
        </form>
      </section>

      <section className="allergens-list-section">
        <header className="allergens-list-section__header">
          <div>
            <span className="allergens-list-section__eyebrow">
              POSTOJEĆI ALERGENI
            </span>

            <h2 className="allergens-list-section__title">Lista alergena</h2>
          </div>

          {!loading && allergens.length > 0 && (
            <span className="allergens-list-section__summary">
              Ukupno: {allergens.length}
            </span>
          )}
        </header>

        {loading ? (
          <div className="allergens-loading" aria-live="polite">
            <span className="allergens-loading__spinner" aria-hidden="true" />

            <div>
              <strong>Učitavamo alergene</strong>

              <p>Sačekajte trenutak dok preuzmemo podatke.</p>
            </div>
          </div>
        ) : allergens.length === 0 ? (
          <div className="allergens-empty">
            <div className="allergens-empty__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3c3.4 3.4 5.5 6.1 5.5 9A5.5 5.5 0 0 1 6.5 12C6.5 9.1 8.6 6.4 12 3Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <span className="allergens-empty__eyebrow">LISTA JE PRAZNA</span>

            <h3 className="allergens-empty__title">Trenutno nema alergena</h3>

            <p className="allergens-empty__description">
              Dodajte prvi alergen pomoću forme iznad.
            </p>
          </div>
        ) : (
          <div className="allergens-list" aria-label="Lista alergena">
            {allergens.map((allergen, index) => (
              <article
                key={allergen.id}
                className={[
                  "allergen-card",
                  editingAllergenId === allergen.id
                    ? "allergen-card--editing"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="allergen-card__identity">
                  <span className="allergen-card__number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div>
                    <span className="allergen-card__eyebrow">ALERGEN</span>

                    <h3 className="allergen-card__name">{allergen.name}</h3>
                  </div>
                </div>

                <div className="allergen-card__metadata">
                  <span className="allergen-card__id">ID: {allergen.id}</span>

                  {editingAllergenId === allergen.id && (
                    <span className="allergen-card__editing-label">
                      Trenutno uređujete
                    </span>
                  )}
                </div>

                <div className="allergen-card__actions">
                  <button
                    type="button"
                    className="allergen-card__edit-button"
                    onClick={() => startEdit(allergen)}
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

                    <span>Izmeni</span>
                  </button>

                  <button
                    type="button"
                    className="allergen-card__delete-button"
                    onClick={() => onDelete(allergen)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <span>Obriši</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
