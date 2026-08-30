import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createAllergen,
  deleteAllergen,
  getAllergens,
  updateAllergen,
} from "../api/allergenApi";
import { useAppDialog } from "../components/dialogs/AppDialogContext";
import type { Allergen } from "../types/allergen";
import { getApiErrorMessage } from "../utils/apiErrors";
import "../styles/AllergensPage.scss";

export default function AllergensPage() {
  const { confirm } = useAppDialog();

  const [allergens, setAllergens] = useState<Allergen[]>([]);

  const [name, setName] = useState("");

  const [editingAllergenId, setEditingAllergenId] = useState<number | null>(
    null,
  );

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditing = editingAllergenId !== null;

  useEffect(() => {
    void loadAllergens();
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

  const visibleAllergens = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("sr-RS");

    return [...allergens]
      .filter((allergen) => {
        if (!normalizedSearch) {
          return true;
        }

        return allergen.name
          .toLocaleLowerCase("sr-RS")
          .includes(normalizedSearch);
      })
      .sort((firstAllergen, secondAllergen) =>
        firstAllergen.name.localeCompare(secondAllergen.name, "sr-RS"),
      );
  }, [allergens, searchTerm]);

  async function loadAllergens(showInitialLoading = true) {
    try {
      setError(null);

      if (showInitialLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const data = await getAllergens();

      setAllergens(data);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function clearForm() {
    setName("");
    setEditingAllergenId(null);
  }

  function resetForm() {
    clearForm();

    setError(null);
    setSuccessMessage(null);
  }

  function scrollToEditor() {
    const editor = document.getElementById("admin-allergen-editor");

    if (!editor) {
      return;
    }

    editor.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function startNewAllergen() {
    resetForm();

    window.setTimeout(scrollToEditor, 0);
  }

  function startEdit(allergen: Allergen) {
    setEditingAllergenId(allergen.id);
    setName(allergen.name);

    setError(null);
    setSuccessMessage(null);

    window.setTimeout(scrollToEditor, 0);
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

    const duplicateAllergen = allergens.find(
      (allergen) =>
        allergen.id !== editingAllergenId &&
        allergen.name.trim().toLocaleLowerCase("sr-RS") ===
          trimmedName.toLocaleLowerCase("sr-RS"),
    );

    if (duplicateAllergen) {
      setError(`Alergen „${duplicateAllergen.name}“ već postoji.`);

      return;
    }

    const wasEditing = isEditing;

    try {
      setSaving(true);

      setError(null);
      setSuccessMessage(null);

      if (editingAllergenId !== null) {
        const updatedAllergen = await updateAllergen(editingAllergenId, {
          name: trimmedName,
        });

        setAllergens((previousAllergens) =>
          previousAllergens.map((allergen) =>
            allergen.id === updatedAllergen.id ? updatedAllergen : allergen,
          ),
        );
      } else {
        const createdAllergen = await createAllergen({
          name: trimmedName,
        });

        setAllergens((previousAllergens) => [
          ...previousAllergens,
          createdAllergen,
        ]);
      }

      clearForm();

      setSuccessMessage(
        wasEditing
          ? "Alergen je uspešno izmenjen."
          : "Alergen je uspešno dodat.",
      );
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(allergen: Allergen) {
    const confirmed = await confirm({
      title: "Brisanje alergena",
      message: (
        <p>
          Da li želite trajno da obrišete alergen{" "}
          <strong>„{allergen.name}“</strong>? Ako je povezan sa jelima,
          proverite kako backend obrađuje postojeće veze pre brisanja.
        </p>
      ),
      confirmText: "Obriši",
      cancelText: "Odustani",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setDeletingId(allergen.id);

      await deleteAllergen(allergen.id);

      setAllergens((previousAllergens) =>
        previousAllergens.filter(
          (currentAllergen) => currentAllergen.id !== allergen.id,
        ),
      );

      if (editingAllergenId === allergen.id) {
        clearForm();
      }

      setSuccessMessage(`Alergen „${allergen.name}“ je obrisan.`);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="allergens-page">
        <section className="allergens-loading" aria-live="polite">
          <span className="allergens-loading__spinner" aria-hidden="true" />

          <div>
            <strong>Učitavamo alergene</strong>

            <p>Pripremamo podatke za administraciju menija.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="allergens-page">
      <section className="allergens-hero">
        <div className="allergens-hero__content">
          <span className="allergens-hero__eyebrow">
            BEEF N&apos; CHICKEN • ADMIN
          </span>

          <h1 className="allergens-hero__title">Alergeni</h1>

          <p className="allergens-hero__description">
            Upravljajte alergenima koji se povezuju sa jelima i koriste za
            personalizovana upozorenja kupaca.
          </p>

          <div className="allergens-hero__meta">
            <span className="allergens-hero__status">
              <span aria-hidden="true" />
              {allergens.length} alergena u sistemu
            </span>

            <span className="allergens-hero__note">
              Koriste se u meniju i profilu kupca
            </span>
          </div>
        </div>

        <aside className="allergens-summary">
          <header className="allergens-summary__header">
            <span className="allergens-summary__icon" aria-hidden="true">
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

            <span className="allergens-summary__label">ALERGENI</span>
          </header>

          <div className="allergens-summary__value">
            <strong>{allergens.length}</strong>

            <span>definisanih alergena</span>
          </div>

          <footer className="allergens-summary__footer">
            <div>
              <span>Status</span>

              <strong>Sistem aktivan</strong>
            </div>

            <button
              type="button"
              className="allergens-summary__new"
              onClick={startNewAllergen}
              aria-label="Dodaj novi alergen"
            >
              +
            </button>
          </footer>
        </aside>
      </section>

      <div className="allergens-page__messages" aria-live="polite">
        {successMessage && (
          <div className="allergens-alert allergens-alert--success">
            <span className="allergens-alert__icon" aria-hidden="true">
              ✓
            </span>

            <div>
              <strong>Promena je sačuvana</strong>

              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="allergens-alert allergens-alert--error" role="alert">
            <span className="allergens-alert__icon" aria-hidden="true">
              !
            </span>

            <div>
              <strong>Proverite podatke</strong>

              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="allergens-layout">
        <section
          id="admin-allergen-editor"
          className={[
            "allergens-editor",
            isEditing ? "allergens-editor--editing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <header className="allergens-editor__header">
            <div>
              <span className="allergens-editor__eyebrow">
                {isEditing ? "IZMENA ALERGENA" : "NOVI ALERGEN"}
              </span>

              <h2 className="allergens-editor__title">
                {isEditing ? "Izmeni alergen" : "Dodaj alergen"}
              </h2>

              <p>
                {isEditing
                  ? "Promenite naziv postojećeg alergena."
                  : "Dodajte sastojak koji treba označavati u jelima."}
              </p>
            </div>

            <span
              className={[
                "allergens-editor__mode",
                isEditing ? "allergens-editor__mode--editing" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isEditing ? `ID ${editingAllergenId}` : "Kreiranje"}
            </span>
          </header>

          <form
            className="allergens-form"
            onSubmit={onSubmit}
            aria-busy={saving}
          >
            <section className="allergens-form-section">
              <header className="allergens-form-section__header">
                <span>01</span>

                <div>
                  <strong>Podaci o alergenu</strong>

                  <p>Koristite jasan i prepoznatljiv naziv.</p>
                </div>
              </header>

              <div className="form-field">
                <label className="form-label" htmlFor="allergen-name">
                  Naziv alergena
                  <span className="form-label__required">*</span>
                </label>

                <div className="allergens-form__input-wrapper">
                  <span
                    className="allergens-form__input-icon"
                    aria-hidden="true"
                  >
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
                  </span>

                  <input
                    id="allergen-name"
                    className="form-control allergens-form__input"
                    type="text"
                    placeholder="Na primer: Gluten"
                    value={name}
                    minLength={2}
                    maxLength={80}
                    required
                    disabled={saving}
                    onChange={(event) => {
                      setName(event.target.value);

                      setError(null);
                      setSuccessMessage(null);
                    }}
                  />
                </div>

                <div className="allergens-form__field-footer">
                  <span>Između 2 i 80 karaktera</span>

                  <strong>{name.length}/80</strong>
                </div>
              </div>

              <div className="allergens-form__example">
                <span>Primeri</span>

                <div>
                  <span>Gluten</span>
                  <span>Mleko</span>
                  <span>Jaja</span>
                  <span>Kikiriki</span>
                  <span>Soja</span>
                </div>
              </div>
            </section>

            <div className="allergens-form__actions">
              <button
                type="submit"
                className="allergens-button allergens-button--primary"
                disabled={saving}
              >
                {saving && (
                  <span
                    className="allergens-button__spinner"
                    aria-hidden="true"
                  />
                )}

                {saving
                  ? "Čuvam..."
                  : isEditing
                    ? "Sačuvaj izmene"
                    : "Dodaj alergen"}
              </button>

              {isEditing && (
                <button
                  type="button"
                  className="allergens-button allergens-button--secondary"
                  disabled={saving}
                  onClick={resetForm}
                >
                  Odustani
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="allergens-catalog">
          <header className="allergens-catalog__header">
            <div>
              <span className="allergens-catalog__eyebrow">BAZA ALERGENA</span>

              <h2 className="allergens-catalog__title">Postojeći alergeni</h2>

              <p>
                Pronađite alergen, izmenite naziv ili ga uklonite iz sistema.
              </p>
            </div>

            <div className="allergens-catalog__actions">
              <div className="allergens-catalog__result">
                <strong>{visibleAllergens.length}</strong>

                <span>prikazano</span>
              </div>

              <button
                type="button"
                className="allergens-catalog__refresh"
                disabled={refreshing}
                onClick={() => void loadAllergens(false)}
              >
                {refreshing ? (
                  <span className="allergens-catalog__spinner" />
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

                {refreshing ? "Osvežavam..." : "Osveži"}
              </button>
            </div>
          </header>

          <div className="allergens-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle
                cx="11"
                cy="11"
                r="7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />

              <path
                d="m16.2 16.2 4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>

            <input
              type="search"
              value={searchTerm}
              placeholder="Pretraži alergene..."
              aria-label="Pretraži alergene"
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Obriši pretragu"
              >
                ×
              </button>
            )}
          </div>

          {visibleAllergens.length === 0 ? (
            <div className="allergens-empty">
              <div className="allergens-empty__icon" aria-hidden="true">
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

              <span className="allergens-empty__eyebrow">
                {allergens.length === 0 ? "LISTA JE PRAZNA" : "NEMA REZULTATA"}
              </span>

              <h3 className="allergens-empty__title">
                {allergens.length === 0
                  ? "Još nema alergena"
                  : "Nema odgovarajućih alergena"}
              </h3>

              <p className="allergens-empty__description">
                {allergens.length === 0
                  ? "Dodajte prvi alergen pomoću forme."
                  : "Promenite tekst pretrage i pokušajte ponovo."}
              </p>
            </div>
          ) : (
            <div className="allergens-list" aria-label="Lista alergena">
              {visibleAllergens.map((allergen) => {
                const isDeleting = deletingId === allergen.id;

                const isCurrentEditing = editingAllergenId === allergen.id;

                return (
                  <article
                    key={allergen.id}
                    className={[
                      "allergen-card",
                      isCurrentEditing ? "allergen-card--editing" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="allergen-card__icon">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
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

                    <div className="allergen-card__content">
                      <span className="allergen-card__eyebrow">ALERGEN</span>

                      <h3 className="allergen-card__name">{allergen.name}</h3>

                      <span className="allergen-card__id">
                        ID {allergen.id}
                      </span>
                    </div>

                    {isCurrentEditing && (
                      <span className="allergen-card__editing">Uređujete</span>
                    )}

                    <div className="allergen-card__actions">
                      <button
                        type="button"
                        className="allergen-card__action allergen-card__action--edit"
                        disabled={saving || isDeleting}
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
                        Izmeni
                      </button>

                      <button
                        type="button"
                        className="allergen-card__action allergen-card__action--delete"
                        disabled={saving || isDeleting}
                        onClick={() => void onDelete(allergen)}
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

                        {isDeleting ? "Brišem..." : "Obriši"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
