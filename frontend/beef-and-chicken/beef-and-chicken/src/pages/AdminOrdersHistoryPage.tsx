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
import { useAppDialog } from "../components/dialogs/AppDialogContext";
import { getApiErrorMessage } from "../utils/apiErrors";
import "../styles/AdminCategoriesPage.scss";

type CategoryFilter = "all" | "active" | "inactive";

type CategoryFormState = {
  name: string;
  description: string;
  sortOrder: string;
  allowsSideDishes: boolean;
  allowsSpices: boolean;
  allowsSweetAdditions: boolean;
  allowsSavoryPancakeAdditions: boolean;
};

function getEmptyForm(): CategoryFormState {
  return {
    name: "",
    description: "",
    sortOrder: "0",
    allowsSideDishes: true,
    allowsSpices: true,
    allowsSweetAdditions: false,
    allowsSavoryPancakeAdditions: false,
  };
}

function formatSortOrder(value: number) {
  return String(value).padStart(2, "0");
}

function getEnabledOptionsCount(category: CategoryDto) {
  return [
    category.allowsSideDishes,
    category.allowsSpices,
    category.allowsSweetAdditions,
    category.allowsSavoryPancakeAdditions,
  ].filter(Boolean).length;
}

export default function AdminCategoriesPage() {
  const { confirm } = useAppDialog();

  const [categories, setCategories] = useState<CategoryDto[]>([]);

  const [form, setForm] = useState<CategoryFormState>(getEmptyForm());

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );

  const [filter, setFilter] = useState<CategoryFilter>("all");

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditing = editingCategoryId !== null;

  const loadCategories = useCallback(async (showInitialLoading = true) => {
    try {
      setError(null);

      if (showInitialLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const data = await getAdminCategories();

      setCategories(data);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [successMessage]);

  const categoryCounts = useMemo(() => {
    const active = categories.filter((category) => category.isActive).length;

    const totalDishes = categories.reduce(
      (total, category) => total + category.dishCount,
      0,
    );

    const activeDishes = categories.reduce(
      (total, category) => total + category.activeDishCount,
      0,
    );

    return {
      all: categories.length,
      active,
      inactive: categories.length - active,
      totalDishes,
      activeDishes,
    };
  }, [categories]);

  const visibleCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("sr-RS");

    return categories
      .filter((category) => {
        if (filter === "active" && !category.isActive) {
          return false;
        }

        if (filter === "inactive" && category.isActive) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const searchableText = [category.name, category.description ?? ""]
          .join(" ")
          .toLocaleLowerCase("sr-RS");

        return searchableText.includes(normalizedSearch);
      })
      .sort((firstCategory, secondCategory) => {
        if (firstCategory.sortOrder !== secondCategory.sortOrder) {
          return firstCategory.sortOrder - secondCategory.sortOrder;
        }

        return firstCategory.name.localeCompare(secondCategory.name, "sr-RS");
      });
  }, [categories, filter, searchTerm]);

  const hasFilters = filter !== "all" || searchTerm.trim().length > 0;

  function clearForm() {
    setForm(getEmptyForm());
    setEditingCategoryId(null);
  }

  function resetForm() {
    clearForm();

    setError(null);
    setSuccessMessage(null);
  }

  function clearFilters() {
    setFilter("all");
    setSearchTerm("");
  }

  function scrollToEditor() {
    const editor = document.getElementById("admin-category-editor");

    if (!editor) {
      return;
    }

    editor.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function startNewCategory() {
    resetForm();

    window.setTimeout(scrollToEditor, 0);
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
      allowsSavoryPancakeAdditions: category.allowsSavoryPancakeAdditions,
    });

    setError(null);
    setSuccessMessage(null);

    window.setTimeout(scrollToEditor, 0);
  }

  function validateForm() {
    const name = form.name.trim();
    const sortOrder = Number(form.sortOrder);

    if (!name) {
      return "Naziv kategorije je obavezan.";
    }

    if (name.length < 2) {
      return "Naziv kategorije mora imati najmanje 2 karaktera.";
    }

    if (
      !Number.isFinite(sortOrder) ||
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      return "Redosled mora biti ceo broj 0 ili veći.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setSuccessMessage(null);

      return;
    }

    const wasEditing = editingCategoryId !== null;

    const dto = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      sortOrder: Number(form.sortOrder),
      allowsSideDishes: form.allowsSideDishes,
      allowsSpices: form.allowsSpices,
      allowsSweetAdditions: form.allowsSweetAdditions,
      allowsSavoryPancakeAdditions: form.allowsSavoryPancakeAdditions,
    };

    try {
      setSaving(true);

      setError(null);
      setSuccessMessage(null);

      if (editingCategoryId !== null) {
        await updateCategory(editingCategoryId, dto);
      } else {
        await createCategory(dto);
      }

      clearForm();

      await loadCategories(false);

      setSuccessMessage(
        wasEditing
          ? "Kategorija je uspešno izmenjena."
          : "Kategorija je uspešno kreirana.",
      );
    } catch (error) {
      setError(getApiErrorMessage(error));
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

      await loadCategories(false);

      setSuccessMessage(`Kategorija „${category.name}“ je aktivirana.`);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDeactivate(category: CategoryDto) {
    const confirmed = await confirm({
      title: "Deaktivacija kategorije",
      message: (
        <p>
          Da li želite da deaktivirate kategoriju{" "}
          <strong>„{category.name}“</strong>? Jela iz ove kategorije više neće
          biti prikazana kupcima.
        </p>
      ),
      confirmText: "Deaktiviraj",
      cancelText: "Odustani",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);

      setActionLoadingId(category.id);

      await deactivateCategory(category.id);

      if (editingCategoryId === category.id) {
        clearForm();
      }

      await loadCategories(false);

      setSuccessMessage(`Kategorija „${category.name}“ je deaktivirana.`);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(category: CategoryDto) {
    if (category.dishCount > 0) {
      return;
    }

    const confirmed = await confirm({
      title: "Brisanje kategorije",
      message: (
        <p>
          Da li želite trajno da obrišete kategoriju{" "}
          <strong>„{category.name}“</strong>? Ovu radnju nije moguće poništiti.
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

      setActionLoadingId(category.id);

      await deleteCategory(category.id);

      if (editingCategoryId === category.id) {
        clearForm();
      }

      await loadCategories(false);

      setSuccessMessage(`Kategorija „${category.name}“ je obrisana.`);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  if (loading) {
    return (
      <main className="admin-categories-page">
        <section className="admin-category-state" aria-live="polite">
          <span className="admin-category-state__spinner" aria-hidden="true" />

          <div>
            <strong>Učitavamo kategorije</strong>

            <p>Pripremamo organizaciju menija.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-categories-page">
      <section className="admin-categories-hero">
        <div className="admin-categories-hero__content">
          <span className="admin-categories-hero__eyebrow">
            BEEF N&apos; CHICKEN • ADMIN
          </span>

          <h1 className="admin-categories-hero__title">Kategorije</h1>

          <p className="admin-categories-hero__description">
            Organizujte meni, odredite redosled kategorija i definišite koje
            dodatke kupci mogu da biraju za jela iz svake kategorije.
          </p>

          <div className="admin-categories-hero__meta">
            <span className="admin-categories-hero__active">
              <span aria-hidden="true" />
              {categoryCounts.active} aktivnih kategorija
            </span>

            <span className="admin-categories-hero__dishes">
              {categoryCounts.activeDishes} aktivnih jela
            </span>
          </div>
        </div>

        <aside className="admin-categories-summary">
          <header className="admin-categories-summary__header">
            <span className="admin-categories-summary__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M4 5h7v6H4V5Zm9 0h7v6h-7V5ZM4 13h7v6H4v-6Zm9 0h7v6h-7v-6Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span className="admin-categories-summary__label">MENI</span>
          </header>

          <div className="admin-categories-summary__value">
            <strong>{categoryCounts.all}</strong>

            <span>kategorija u sistemu</span>
          </div>

          <footer className="admin-categories-summary__footer">
            <div>
              <span>Ukupno jela</span>

              <strong>{categoryCounts.totalDishes}</strong>
            </div>

            <div>
              <span>Neaktivne</span>

              <strong>{categoryCounts.inactive}</strong>
            </div>

            <button
              type="button"
              className="admin-categories-summary__new"
              onClick={startNewCategory}
              aria-label="Dodaj novu kategoriju"
            >
              +
            </button>
          </footer>
        </aside>
      </section>

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

        <article className="admin-category-stat admin-category-stat--dishes">
          <span className="admin-category-stat__label">Aktivna jela</span>

          <strong className="admin-category-stat__value">
            {categoryCounts.activeDishes}
          </strong>

          <span className="admin-category-stat__description">
            Trenutno u ponudi
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
              <strong>Promena je sačuvana</strong>

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
              <strong>Proverite podatke</strong>

              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="admin-categories-layout">
        <section
          id="admin-category-editor"
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
                {isEditing ? "IZMENA KATEGORIJE" : "NOVA KATEGORIJA"}
              </span>

              <h2 className="admin-category-editor__title">
                {isEditing ? "Izmeni kategoriju" : "Dodaj kategoriju"}
              </h2>

              <p>
                {isEditing
                  ? "Promenite podatke i pravila postojeće kategorije."
                  : "Dodajte novu grupu jela u meni."}
              </p>
            </div>

            <span
              className={[
                "admin-category-editor__mode",
                isEditing ? "admin-category-editor__mode--editing" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isEditing ? `ID ${editingCategoryId}` : "Kreiranje"}
            </span>
          </header>

          <form className="form admin-category-form" onSubmit={handleSubmit}>
            <section className="admin-category-form-section">
              <header className="admin-category-form-section__header">
                <span>01</span>

                <div>
                  <strong>Osnovni podaci</strong>

                  <p>Naziv, opis i redosled u meniju.</p>
                </div>
              </header>

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
                  disabled={saving}
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
                  disabled={saving}
                  placeholder="Kratko opišite šta se nalazi u kategoriji..."
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="category-sort-order">
                  Redosled prikaza
                </label>

                <input
                  id="category-sort-order"
                  className="form-control"
                  type="number"
                  min={0}
                  step={1}
                  value={form.sortOrder}
                  disabled={saving}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sortOrder: event.target.value,
                    }))
                  }
                />

                <p className="form-help">
                  Manji broj znači višu poziciju u meniju.
                </p>
              </div>
            </section>

            <fieldset className="admin-category-permissions">
              <legend>02 • Pravila za dodatke</legend>

              <p className="admin-category-permissions__description">
                Izaberite koje grupe dodataka kupac može da bira uz jela iz ove
                kategorije.
              </p>

              <div className="admin-category-permissions__grid">
                <label
                  className={[
                    "admin-category-permission",
                    form.allowsSideDishes
                      ? "admin-category-permission--selected"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={form.allowsSideDishes}
                    disabled={saving}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        allowsSideDishes: event.target.checked,
                      }))
                    }
                  />

                  <span className="admin-category-permission__control">✓</span>

                  <span className="admin-category-permission__content">
                    <strong>Prilozi</strong>

                    <small>Pomfrit, salate i ostali prilozi</small>
                  </span>
                </label>

                <label
                  className={[
                    "admin-category-permission",
                    form.allowsSpices
                      ? "admin-category-permission--selected"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={form.allowsSpices}
                    disabled={saving}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        allowsSpices: event.target.checked,
                      }))
                    }
                  />

                  <span className="admin-category-permission__control">✓</span>

                  <span className="admin-category-permission__content">
                    <strong>Začini</strong>

                    <small>Začini i besplatne opcije</small>
                  </span>
                </label>

                <label
                  className={[
                    "admin-category-permission",
                    form.allowsSweetAdditions
                      ? "admin-category-permission--selected"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={form.allowsSweetAdditions}
                    disabled={saving}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        allowsSweetAdditions: event.target.checked,
                      }))
                    }
                  />

                  <span className="admin-category-permission__control">✓</span>

                  <span className="admin-category-permission__content">
                    <strong>Slatki dodaci</strong>

                    <small>Za slatke palačinke i deserte</small>
                  </span>
                </label>

                <label
                  className={[
                    "admin-category-permission",
                    form.allowsSavoryPancakeAdditions
                      ? "admin-category-permission--selected"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={form.allowsSavoryPancakeAdditions}
                    disabled={saving}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        allowsSavoryPancakeAdditions: event.target.checked,
                      }))
                    }
                  />

                  <span className="admin-category-permission__control">✓</span>

                  <span className="admin-category-permission__content">
                    <strong>Slani dodaci</strong>

                    <small>Za slane palačinke</small>
                  </span>
                </label>
              </div>

              <p className="admin-category-permissions__hint">
                Na primer, za piće obično nije potrebno dozvoliti nijednu grupu
                dodataka.
              </p>
            </fieldset>

            <div className="admin-category-form__actions">
              <button
                type="submit"
                className="admin-category-button admin-category-button--primary"
                disabled={saving}
              >
                {saving && (
                  <span
                    className="admin-category-button__spinner"
                    aria-hidden="true"
                  />
                )}

                {saving
                  ? "Čuvam..."
                  : isEditing
                    ? "Sačuvaj izmene"
                    : "Dodaj kategoriju"}
              </button>

              {isEditing && (
                <button
                  type="button"
                  className="admin-category-button admin-category-button--secondary"
                  disabled={saving}
                  onClick={resetForm}
                >
                  Odustani
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-category-catalog">
          <header className="admin-category-catalog__header">
            <div>
              <span className="admin-category-catalog__eyebrow">
                ORGANIZACIJA MENIJA
              </span>

              <h2 className="admin-category-catalog__title">Sve kategorije</h2>

              <p>
                Pregledajte redosled, dostupnost, broj jela i pravila za
                dodatke.
              </p>
            </div>

            <div className="admin-category-catalog__header-actions">
              <div className="admin-category-catalog__result">
                <strong>{visibleCategories.length}</strong>

                <span>prikazano</span>
              </div>

              <button
                type="button"
                className="admin-category-catalog__refresh"
                disabled={refreshing}
                onClick={() => void loadCategories(false)}
              >
                {refreshing ? (
                  <span className="admin-category-catalog__spinner" />
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

          <div className="admin-category-toolbar">
            <div className="admin-category-search">
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
                placeholder="Pretraži kategorije..."
                aria-label="Pretraži kategorije"
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

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

            {hasFilters && (
              <button
                type="button"
                className="admin-category-toolbar__clear"
                onClick={clearFilters}
              >
                Poništi filtere
              </button>
            )}
          </div>

          {visibleCategories.length === 0 ? (
            <div className="admin-category-empty">
              <div className="admin-category-empty__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M4 5h7v6H4V5Zm9 0h7v6h-7V5ZM4 13h7v6H4v-6Zm9 0h7v6h-7v-6Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <span className="admin-category-empty__eyebrow">
                NEMA REZULTATA
              </span>

              <h3 className="admin-category-empty__title">
                Nema kategorija za prikaz
              </h3>

              <p className="admin-category-empty__description">
                Promenite filter ili tekst pretrage.
              </p>
            </div>
          ) : (
            <div className="admin-category-cards">
              {visibleCategories.map((category) => {
                const isActionLoading = actionLoadingId === category.id;

                const enabledOptions = getEnabledOptionsCount(category);

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

                        {category.isActive ? "Aktivna" : "Neaktivna"}
                      </span>
                    </header>

                    <div className="admin-category-card__content">
                      <span className="admin-category-card__eyebrow">
                        KATEGORIJA
                      </span>

                      <h3 className="admin-category-card__title">
                        {category.name}
                      </h3>

                      <p className="admin-category-card__description">
                        {category.description ||
                          "Za ovu kategoriju nije unet opis."}
                      </p>
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

                      <div className="admin-category-card__metric">
                        <span>Dozvoljene grupe</span>

                        <strong>{enabledOptions}/4</strong>
                      </div>
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
                        <span aria-hidden="true">
                          {category.allowsSideDishes ? "✓" : "×"}
                        </span>
                        Prilozi
                      </span>

                      <span
                        className={[
                          "admin-category-capability",
                          category.allowsSpices
                            ? "admin-category-capability--enabled"
                            : "admin-category-capability--disabled",
                        ].join(" ")}
                      >
                        <span aria-hidden="true">
                          {category.allowsSpices ? "✓" : "×"}
                        </span>
                        Začini
                      </span>

                      <span
                        className={[
                          "admin-category-capability",
                          category.allowsSweetAdditions
                            ? "admin-category-capability--enabled"
                            : "admin-category-capability--disabled",
                        ].join(" ")}
                      >
                        <span aria-hidden="true">
                          {category.allowsSweetAdditions ? "✓" : "×"}
                        </span>
                        Slatki
                      </span>

                      <span
                        className={[
                          "admin-category-capability",
                          category.allowsSavoryPancakeAdditions
                            ? "admin-category-capability--enabled"
                            : "admin-category-capability--disabled",
                        ].join(" ")}
                      >
                        <span aria-hidden="true">
                          {category.allowsSavoryPancakeAdditions ? "✓" : "×"}
                        </span>
                        Slani
                      </span>
                    </div>

                    <footer className="admin-category-card__actions">
                      <button
                        type="button"
                        className="admin-category-card__action admin-category-card__action--edit"
                        disabled={isActionLoading || saving}
                        onClick={() => startEdit(category)}
                      >
                        Izmeni
                      </button>

                      {category.isActive ? (
                        <button
                          type="button"
                          className="admin-category-card__action admin-category-card__action--deactivate"
                          disabled={isActionLoading || saving}
                          onClick={() => void handleDeactivate(category)}
                        >
                          {isActionLoading ? "Obrađujem..." : "Deaktiviraj"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-category-card__action admin-category-card__action--activate"
                          disabled={isActionLoading || saving}
                          onClick={() => void handleActivate(category)}
                        >
                          {isActionLoading ? "Obrađujem..." : "Aktiviraj"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="admin-category-card__action admin-category-card__action--delete"
                        disabled={
                          isActionLoading || saving || category.dishCount > 0
                        }
                        title={
                          category.dishCount > 0
                            ? "Kategorija ima povezana jela. Koristite deaktivaciju."
                            : "Trajno obriši kategoriju."
                        }
                        onClick={() => void handleDelete(category)}
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
