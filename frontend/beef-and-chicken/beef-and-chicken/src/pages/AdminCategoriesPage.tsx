import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  activateCategory,
  createCategory,
  deactivateCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
  type CategoryDto,
} from "../api/categoryApi";
import "../styles/AdminCategoriesPage.scss";

type CategoryFilter = "all" | "active" | "inactive";

type CategoryFormState = {
  name: string;
  description: string;
  sortOrder: string;
  allowsSideDishes: boolean;
  allowsSpices: boolean;
  allowsSweetAdditions: boolean;
};

const emptyForm: CategoryFormState = {
  name: "",
  description: "",
  sortOrder: "0",
  allowsSideDishes: true,
  allowsSpices: true,
  allowsSweetAdditions: false,
};

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error ??
    error?.response?.data?.message ??
    error?.response?.data?.title ??
    error?.message ??
    fallback
  );
}

function formatStatus(category: CategoryDto) {
  return category.isActive ? "Aktivna" : "Neaktivna";
}

function formatSortOrder(value: number) {
  return String(value).padStart(2, "0");
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const [form, setForm] = useState<CategoryFormState>(emptyForm);

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditing = editingCategoryId !== null;

  const loadCategories = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const data = await getAdminCategories();

      setCategories(data);
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri učitavanju kategorija."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [successMessage]);

  const categoryCounts = useMemo(() => {
    const active = categories.filter((category) => category.isActive).length;

    return {
      all: categories.length,
      active,
      inactive: categories.length - active,
    };
  }, [categories]);

  const visibleCategories = useMemo(() => {
    const filtered = categories.filter((category) => {
      if (filter === "active") {
        return category.isActive;
      }

      if (filter === "inactive") {
        return !category.isActive;
      }

      return true;
    });

    return [...filtered].sort((firstCategory, secondCategory) => {
      if (firstCategory.sortOrder !== secondCategory.sortOrder) {
        return firstCategory.sortOrder - secondCategory.sortOrder;
      }

      return firstCategory.name.localeCompare(secondCategory.name, "sr-RS");
    });
  }, [categories, filter]);

  function resetForm() {
    setForm(emptyForm);
    setEditingCategoryId(null);
  }

  function scrollToForm() {
    document.getElementById("admin-category-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function startNewCategory() {
    resetForm();
    setError(null);
    scrollToForm();
  }

  function startEdit(category: CategoryDto) {
    setEditingCategoryId(category.id);

    setForm({
      name: category.name,
      description: category.description ?? "",
      sortOrder: String(category.sortOrder),
      allowsSideDishes: category.allowsSideDishes,
      allowsSpices: category.allowsSpices,
      allowsSweetAdditions: category.allowsSweetAdditions,
    });

    setError(null);

    window.setTimeout(scrollToForm, 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const sortOrder = Number(form.sortOrder);

    if (!form.name.trim()) {
      setError("Naziv kategorije je obavezan.");
      return;
    }

    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      setError("Redosled mora biti broj veći ili jednak 0.");
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setSaving(true);

      const dto = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        sortOrder,
        allowsSideDishes: form.allowsSideDishes,
        allowsSpices: form.allowsSpices,
        allowsSweetAdditions: form.allowsSweetAdditions,
      };

      if (editingCategoryId !== null) {
        await updateCategory(editingCategoryId, dto);

        setSuccessMessage("Kategorija je uspešno izmenjena.");
      } else {
        await createCategory(dto);

        setSuccessMessage("Kategorija je uspešno kreirana.");
      }

      resetForm();
      await loadCategories();
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri čuvanju kategorije."));
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(category: CategoryDto) {
    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(category.id);

      await activateCategory(category.id);
      await loadCategories();

      setSuccessMessage(`Kategorija "${category.name}" je aktivirana.`);
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri aktiviranju kategorije."));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDeactivate(category: CategoryDto) {
    const confirmed = window.confirm(
      `Da li želiš da deaktiviraš kategoriju "${category.name}"? Jela iz te kategorije se neće prikazivati kupcima.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(category.id);

      await deactivateCategory(category.id);
      await loadCategories();

      setSuccessMessage(`Kategorija "${category.name}" je deaktivirana.`);
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri deaktiviranju kategorije."));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(category: CategoryDto) {
    const confirmed = window.confirm(
      `Da li želiš trajno da obrišeš kategoriju "${category.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(category.id);

      await deleteCategory(category.id);
      await loadCategories();

      if (editingCategoryId === category.id) {
        resetForm();
      }

      setSuccessMessage(`Kategorija "${category.name}" je obrisana.`);
    } catch (error: any) {
      setError(
        getErrorMessage(
          error,
          "Greška pri brisanju kategorije. Ako ima povezana jela, deaktiviraj je umesto brisanja.",
        ),
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <main className="admin-categories-page">
      <header className="admin-categories-page__header">
        <div className="admin-categories-page__heading">
          <span className="admin-categories-page__eyebrow">
            ORGANIZACIJA MENIJA
          </span>

          <h1 className="admin-categories-page__title">Kategorije</h1>

          <p className="admin-categories-page__description">
            Kreirajte kategorije jela, podesite njihov redosled i odredite koje
            vrste dodataka mogu da se biraju.
          </p>
        </div>

        <button
          type="button"
          className="admin-categories-page__new-button"
          onClick={startNewCategory}
        >
          <span aria-hidden="true">+</span>
          Nova kategorija
        </button>
      </header>

      <section className="admin-category-stats" aria-label="Pregled kategorija">
        <article className="admin-category-stat">
          <span className="admin-category-stat__label">Ukupno</span>
          <strong className="admin-category-stat__value">
            {categoryCounts.all}
          </strong>
          <span className="admin-category-stat__description">
            Sve kategorije
          </span>
        </article>

        <article className="admin-category-stat admin-category-stat--active">
          <span className="admin-category-stat__label">Aktivne</span>
          <strong className="admin-category-stat__value">
            {categoryCounts.active}
          </strong>
          <span className="admin-category-stat__description">
            Vidljive kupcima
          </span>
        </article>

        <article className="admin-category-stat admin-category-stat--inactive">
          <span className="admin-category-stat__label">Neaktivne</span>
          <strong className="admin-category-stat__value">
            {categoryCounts.inactive}
          </strong>
          <span className="admin-category-stat__description">
            Trenutno skrivene
          </span>
        </article>
      </section>

      <div className="admin-categories-page__messages" aria-live="polite">
        {successMessage && (
          <div className="admin-category-alert admin-category-alert--success">
            <span className="admin-category-alert__icon" aria-hidden="true">
              ✓
            </span>

            <div>
              <strong>Uspešno završeno</strong>
              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div
            className="admin-category-alert admin-category-alert--error"
            role="alert"
          >
            <span className="admin-category-alert__icon" aria-hidden="true">
              !
            </span>

            <div>
              <strong>Došlo je do greške</strong>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="admin-categories-layout">
        <section
          id="admin-category-form"
          className={[
            "admin-category-editor",
            isEditing ? "admin-category-editor--editing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <header className="admin-category-editor__header">
            <div>
              <span className="admin-category-editor__eyebrow">
                {isEditing ? "IZMENA PODATAKA" : "NOVA STAVKA"}
              </span>

              <h2 className="admin-category-editor__title">
                {isEditing ? "Izmeni kategoriju" : "Dodaj kategoriju"}
              </h2>
            </div>

            <span className="admin-category-editor__mode">
              {isEditing ? "Izmena" : "Kreiranje"}
            </span>
          </header>

          <form className="form admin-category-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label" htmlFor="category-name">
                Naziv kategorije
                <span className="form-label__required">*</span>
              </label>

              <input
                id="category-name"
                className="form-control"
                type="text"
                value={form.name}
                placeholder="Na primer: Burgeri"
                autoComplete="off"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="category-description">
                Opis
                <span className="form-label__optional">opciono</span>
              </label>

              <textarea
                id="category-description"
                className="form-textarea"
                value={form.description}
                rows={4}
                placeholder="Kratko opišite šta se nalazi u kategoriji..."
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div className="form-field admin-category-form__sort-order">
              <label className="form-label" htmlFor="category-sort-order">
                Redosled prikaza
              </label>

              <input
                id="category-sort-order"
                className="form-control"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }))
                }
              />

              <p className="form-help">
                Manji broj znači da će kategorija biti prikazana ranije.
              </p>
            </div>

            <fieldset className="admin-category-permissions">
              <legend>Pravila za dodatke</legend>

              <label className="admin-category-permission">
                <input
                  type="checkbox"
                  checked={form.allowsSideDishes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      allowsSideDishes: event.target.checked,
                    }))
                  }
                />

                <span className="admin-category-permission__control">
                  <span
                    className="admin-category-permission__check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </span>

                <span className="admin-category-permission__content">
                  <strong>Prilozi</strong>
                  <small>Pomfrit, salate i drugi prilozi</small>
                </span>
              </label>

              <label className="admin-category-permission">
                <input
                  type="checkbox"
                  checked={form.allowsSpices}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      allowsSpices: event.target.checked,
                    }))
                  }
                />

                <span className="admin-category-permission__control">
                  <span
                    className="admin-category-permission__check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </span>

                <span className="admin-category-permission__content">
                  <strong>Začini</strong>
                  <small>So, biber, sosovi i začini</small>
                </span>
              </label>

              <label className="admin-category-permission">
                <input
                  type="checkbox"
                  checked={form.allowsSweetAdditions}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      allowsSweetAdditions: event.target.checked,
                    }))
                  }
                />

                <span className="admin-category-permission__control">
                  <span
                    className="admin-category-permission__check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </span>

                <span className="admin-category-permission__content">
                  <strong>Slatki dodaci</strong>
                  <small>Prelivi, voće i drugi slatki dodaci</small>
                </span>
              </label>

              <p className="admin-category-permissions__hint">
                Za kategoriju pića obično se isključuju prilozi i začini.
              </p>
            </fieldset>

            <div className="admin-category-form__actions">
              <button
                type="submit"
                className="admin-category-button admin-category-button--primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span
                      className="admin-category-button__spinner"
                      aria-hidden="true"
                    />
                    Čuvam...
                  </>
                ) : isEditing ? (
                  "Sačuvaj izmene"
                ) : (
                  "Dodaj kategoriju"
                )}
              </button>

              {isEditing && (
                <button
                  type="button"
                  className="admin-category-button admin-category-button--secondary"
                  disabled={saving}
                  onClick={resetForm}
                >
                  Otkaži izmenu
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-category-list">
          <header className="admin-category-list__header">
            <div>
              <span className="admin-category-list__eyebrow">
                PREGLED KATEGORIJA
              </span>

              <h2 className="admin-category-list__title">
                Organizacija menija
              </h2>
            </div>

            <button
              type="button"
              className="admin-category-list__refresh"
              disabled={loading}
              onClick={loadCategories}
            >
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

              {loading ? "Osvežavam..." : "Osveži"}
            </button>
          </header>

          <div
            className="admin-category-filters"
            role="group"
            aria-label="Filtriranje kategorija"
          >
            <button
              type="button"
              className={[
                "admin-category-filters__button",
                filter === "all"
                  ? "admin-category-filters__button--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
            >
              Sve
              <span>{categoryCounts.all}</span>
            </button>

            <button
              type="button"
              className={[
                "admin-category-filters__button",
                filter === "active"
                  ? "admin-category-filters__button--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={filter === "active"}
              onClick={() => setFilter("active")}
            >
              Aktivne
              <span>{categoryCounts.active}</span>
            </button>

            <button
              type="button"
              className={[
                "admin-category-filters__button",
                filter === "inactive"
                  ? "admin-category-filters__button--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={filter === "inactive"}
              onClick={() => setFilter("inactive")}
            >
              Neaktivne
              <span>{categoryCounts.inactive}</span>
            </button>
          </div>

          {loading ? (
            <div className="admin-category-state">
              <span
                className="admin-category-state__spinner"
                aria-hidden="true"
              />

              <div>
                <strong>Učitavamo kategorije</strong>
                <p>Sačekajte trenutak.</p>
              </div>
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="admin-category-empty">
              <div className="admin-category-empty__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M4 6h16v12H4V6Zm4-3v6m8-6v6M8 14h8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <span className="admin-category-empty__eyebrow">
                NEMA REZULTATA
              </span>

              <h3 className="admin-category-empty__title">
                Nema kategorija za ovaj filter
              </h3>

              <p className="admin-category-empty__description">
                Promenite filter ili dodajte novu kategoriju.
              </p>
            </div>
          ) : (
            <div className="admin-category-cards">
              {visibleCategories.map((category) => {
                const isLoadingAction = actionLoadingId === category.id;

                return (
                  <article
                    key={category.id}
                    className={[
                      "admin-category-card",
                      !category.isActive ? "admin-category-card--inactive" : "",
                      editingCategoryId === category.id
                        ? "admin-category-card--editing"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <header className="admin-category-card__header">
                      <span className="admin-category-card__order">
                        {formatSortOrder(category.sortOrder)}
                      </span>

                      <span
                        className={[
                          "admin-category-status",
                          category.isActive
                            ? "admin-category-status--active"
                            : "admin-category-status--inactive",
                        ].join(" ")}
                      >
                        <span
                          className="admin-category-status__dot"
                          aria-hidden="true"
                        />

                        {formatStatus(category)}
                      </span>
                    </header>

                    <div className="admin-category-card__content">
                      <h3 className="admin-category-card__title">
                        {category.name}
                      </h3>

                      <p className="admin-category-card__description">
                        {category.description ||
                          "Za ovu kategoriju nije unet opis."}
                      </p>
                    </div>

                    <div className="admin-category-capabilities">
                      <span
                        className={[
                          "admin-category-capability",
                          category.allowsSideDishes
                            ? "admin-category-capability--enabled"
                            : "admin-category-capability--disabled",
                        ].join(" ")}
                      >
                        Prilozi
                        <strong>
                          {category.allowsSideDishes ? "Da" : "Ne"}
                        </strong>
                      </span>

                      <span
                        className={[
                          "admin-category-capability",
                          category.allowsSpices
                            ? "admin-category-capability--enabled"
                            : "admin-category-capability--disabled",
                        ].join(" ")}
                      >
                        Začini
                        <strong>{category.allowsSpices ? "Da" : "Ne"}</strong>
                      </span>

                      <span
                        className={[
                          "admin-category-capability",
                          category.allowsSweetAdditions
                            ? "admin-category-capability--enabled"
                            : "admin-category-capability--disabled",
                        ].join(" ")}
                      >
                        Slatki dodaci
                        <strong>
                          {category.allowsSweetAdditions ? "Da" : "Ne"}
                        </strong>
                      </span>
                    </div>

                    <div className="admin-category-card__metrics">
                      <div className="admin-category-card__metric">
                        <span>Ukupno jela</span>
                        <strong>{category.dishCount}</strong>
                      </div>

                      <div className="admin-category-card__metric">
                        <span>Aktivna jela</span>
                        <strong>{category.activeDishCount}</strong>
                      </div>
                    </div>

                    <footer className="admin-category-card__actions">
                      <button
                        type="button"
                        className="admin-category-card__action admin-category-card__action--edit"
                        disabled={isLoadingAction || saving}
                        onClick={() => startEdit(category)}
                      >
                        Izmeni
                      </button>

                      {category.isActive ? (
                        <button
                          type="button"
                          className="admin-category-card__action admin-category-card__action--deactivate"
                          disabled={isLoadingAction || saving}
                          onClick={() => handleDeactivate(category)}
                        >
                          {isLoadingAction ? "Obrađujem..." : "Deaktiviraj"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-category-card__action admin-category-card__action--activate"
                          disabled={isLoadingAction || saving}
                          onClick={() => handleActivate(category)}
                        >
                          {isLoadingAction ? "Obrađujem..." : "Aktiviraj"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="admin-category-card__action admin-category-card__action--delete"
                        disabled={
                          isLoadingAction || saving || category.dishCount > 0
                        }
                        onClick={() => handleDelete(category)}
                        title={
                          category.dishCount > 0
                            ? "Kategorija ima povezana jela. Koristi deaktivaciju."
                            : "Trajno obriši kategoriju."
                        }
                      >
                        Obriši
                      </button>
                    </footer>
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
