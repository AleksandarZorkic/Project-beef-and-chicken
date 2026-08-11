import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { getMenu, type DishMenuDto } from "../api/menuApi";
import { getAllergens } from "../api/allergenApi";
import { getAdminCategories, type CategoryDto } from "../api/categoryApi";
import type { Allergen } from "../types/allergen";
import {
  activateDish,
  createDish,
  deactivateDishAdmin,
  getInactiveDishes,
  updateDish,
  uploadDishImage,
  type DishAllergenInput,
} from "../api/dishApi";
import { getApiErrorMessage } from "../utils/apiErrors";
import "../styles/AdminDishesPage.scss";

type DishFormState = {
  name: string;
  description: string;
  price: string;
  isOnSale: boolean;
  salePrice: string;
  imageUrl: string;
  isRecommended: boolean;
  recommendedSortOrder: string;
  categoryId: string;
  allergens: DishAllergenInput[];
};

type DishView = "active" | "inactive";

const emptyForm: DishFormState = {
  name: "",
  description: "",
  price: "",
  isOnSale: false,
  salePrice: "",
  imageUrl: "",
  isRecommended: false,
  recommendedSortOrder: "0",
  categoryId: "",
  allergens: [],
};

function formatPrice(value: number) {
  return `${value.toLocaleString("sr-RS")} RSD`;
}

function isDishOnSale(dish: DishMenuDto) {
  return (
    dish.isOnSale &&
    typeof dish.salePrice === "number" &&
    dish.salePrice > 0 &&
    dish.salePrice < dish.price
  );
}

function getDishEffectivePrice(dish: DishMenuDto) {
  if (isDishOnSale(dish)) {
    return dish.salePrice!;
  }

  return dish.effectivePrice ?? dish.price;
}

export default function AdminDishesPage() {
  const [dishes, setDishes] = useState<DishMenuDto[]>([]);
  const [inactiveDishes, setInactiveDishes] = useState<DishMenuDto[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);

  const [view, setView] = useState<DishView>("active");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  const [fileInputKey, setFileInputKey] = useState(0);

  const [form, setForm] = useState<DishFormState>(emptyForm);

  const [editingDishId, setEditingDishId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditing = editingDishId !== null;

  const selectedAllergenIds = useMemo(() => {
    return new Set(form.allergens.map((item) => item.allergenId));
  }, [form.allergens]);

  const selectedImagePreviewUrl = useMemo(() => {
    if (!selectedImageFile) {
      return null;
    }

    return URL.createObjectURL(selectedImageFile);
  }, [selectedImageFile]);

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl]);

  const previewImageUrl =
    selectedImagePreviewUrl || form.imageUrl.trim() || null;

  const loadData = useCallback(async (showInitialLoading = true) => {
    try {
      setError(null);

      if (showInitialLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const [
        activeDishesData,
        inactiveDishesData,
        allergensData,
        categoriesData,
      ] = await Promise.all([
        getMenu(),
        getInactiveDishes(),
        getAllergens(),
        getAdminCategories(),
      ]);

      setDishes(activeDishesData);
      setInactiveDishes(inactiveDishesData);
      setAllergens(allergensData);
      setCategories(categoriesData);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const availableCategories = useMemo(() => {
    return [...categories]
      .filter(
        (category) =>
          category.isActive || String(category.id) === form.categoryId,
      )
      .sort((firstCategory, secondCategory) => {
        if (firstCategory.sortOrder !== secondCategory.sortOrder) {
          return firstCategory.sortOrder - secondCategory.sortOrder;
        }

        return firstCategory.name.localeCompare(secondCategory.name, "sr-RS");
      });
  }, [categories, form.categoryId]);

  const displayedDishes = view === "active" ? dishes : inactiveDishes;

  const filterCategories = useMemo(() => {
    return [...categories].sort((firstCategory, secondCategory) => {
      if (firstCategory.sortOrder !== secondCategory.sortOrder) {
        return firstCategory.sortOrder - secondCategory.sortOrder;
      }

      return firstCategory.name.localeCompare(secondCategory.name, "sr-RS");
    });
  }, [categories]);

  const filteredDishes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("sr-RS");

    return displayedDishes.filter((dish) => {
      const matchesCategory =
        selectedCategoryId === "all" ||
        dish.categoryId === Number(selectedCategoryId);

      const searchableText = [
        dish.name,
        dish.description ?? "",
        dish.categoryName,
      ]
        .join(" ")
        .toLocaleLowerCase("sr-RS");

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [displayedDishes, searchTerm, selectedCategoryId]);

  const groupedFilteredDishes = useMemo(() => {
    const groups = new Map<
      number,
      {
        categoryId: number;
        categoryName: string;
        sortOrder: number;
        dishes: DishMenuDto[];
      }
    >();

    filteredDishes.forEach((dish) => {
      const category = categories.find((item) => item.id === dish.categoryId);

      if (!groups.has(dish.categoryId)) {
        groups.set(dish.categoryId, {
          categoryId: dish.categoryId,
          categoryName: dish.categoryName || "Ostalo",
          sortOrder: category?.sortOrder ?? dish.categoryId,
          dishes: [],
        });
      }

      groups.get(dish.categoryId)?.dishes.push(dish);
    });

    return Array.from(groups.values())
      .sort((firstGroup, secondGroup) => {
        if (firstGroup.sortOrder !== secondGroup.sortOrder) {
          return firstGroup.sortOrder - secondGroup.sortOrder;
        }

        return firstGroup.categoryName.localeCompare(
          secondGroup.categoryName,
          "sr-RS",
        );
      })
      .map((group) => ({
        ...group,
        dishes: group.dishes.sort((firstDish, secondDish) =>
          firstDish.name.localeCompare(secondDish.name, "sr-RS"),
        ),
      }));
  }, [filteredDishes, categories]);

  const recommendedDishCount = useMemo(() => {
    return dishes.filter((dish) => dish.isRecommended).length;
  }, [dishes]);

  function clearForm() {
    setForm(emptyForm);
    setEditingDishId(null);
    setSelectedImageFile(null);
    setFileInputKey((current) => current + 1);
  }

  function resetForm() {
    clearForm();
    setError(null);
    setSuccessMessage(null);
  }

  function scrollToEditor() {
    const editor = document.getElementById("admin-dish-editor");

    if (!editor) {
      return;
    }

    // Return the form's independent scrollbar to the top.
    editor.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    // Move the complete editor area into the viewport.
    editor.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function startNewDish() {
    resetForm();
    window.setTimeout(scrollToEditor, 0);
  }

  function startEdit(dish: DishMenuDto) {
    setEditingDishId(dish.id);
    setSelectedImageFile(null);
    setFileInputKey((current) => current + 1);

    setForm({
      name: dish.name,
      description: dish.description ?? "",
      price: String(dish.price),
      isOnSale: dish.isOnSale,
      salePrice: dish.salePrice == null ? "" : String(dish.salePrice),
      imageUrl: dish.imageUrl ?? "",
      categoryId: String(dish.categoryId),
      isRecommended: dish.isRecommended,
      recommendedSortOrder: String(dish.recommendedSortOrder),
      allergens: dish.allergens.map((allergen) => ({
        allergenId: allergen.allergenId,
        isTrace: allergen.isTrace,
      })),
    });

    setError(null);
    setSuccessMessage(null);

    window.setTimeout(scrollToEditor, 0);
  }

  function toggleAllergen(allergenId: number) {
    const alreadySelected = selectedAllergenIds.has(allergenId);

    if (alreadySelected) {
      setForm((current) => ({
        ...current,
        allergens: current.allergens.filter(
          (allergen) => allergen.allergenId !== allergenId,
        ),
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      allergens: [
        ...current.allergens,
        {
          allergenId,
          isTrace: false,
        },
      ],
    }));
  }

  function toggleIsTrace(allergenId: number) {
    setForm((current) => ({
      ...current,
      allergens: current.allergens.map((allergen) =>
        allergen.allergenId === allergenId
          ? {
              ...allergen,
              isTrace: !allergen.isTrace,
            }
          : allergen,
      ),
    }));
  }

  function validateForm() {
    if (!form.name.trim()) {
      return "Naziv jela je obavezan.";
    }

    if (form.name.trim().length < 2 || form.name.trim().length > 120) {
      return "Naziv jela mora imati između 2 i 120 karaktera.";
    }

    const price = Number(form.price);

    if (!Number.isFinite(price) || price <= 0) {
      return "Cena mora biti veća od 0.";
    }

    const salePrice = form.salePrice.trim() ? Number(form.salePrice) : null;

    if (form.isOnSale) {
      if (salePrice === null) {
        return "Akcijska cena je obavezna kada je jelo na akciji.";
      }

      if (!Number.isFinite(salePrice) || salePrice <= 0) {
        return "Akcijska cena mora biti veća od 0.";
      }

      if (salePrice >= price) {
        return "Akcijska cena mora biti manja od regularne cene.";
      }
    }

    const categoryId = Number(form.categoryId);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return "Kategorija je obavezna.";
    }

    const recommendedSortOrder = Number(form.recommendedSortOrder);

    if (!Number.isInteger(recommendedSortOrder) || recommendedSortOrder < 0) {
      return "Redosled preporuke mora biti 0 ili veći ceo broj.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const normalizedSalePrice = form.salePrice.trim()
      ? Number(form.salePrice)
      : null;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      isOnSale: form.isOnSale,
      salePrice: form.isOnSale ? normalizedSalePrice : null,
      imageUrl: form.imageUrl.trim() || null,
      isRecommended: form.isRecommended,
      recommendedSortOrder: Number(form.recommendedSortOrder),
      categoryId: Number(form.categoryId),
      allergens: form.allergens,
    };

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const savedDish =
        editingDishId !== null
          ? await updateDish(editingDishId, payload)
          : await createDish(payload);

      if (selectedImageFile) {
        await uploadDishImage(savedDish.id, selectedImageFile);
      }

      const message =
        editingDishId !== null
          ? "Jelo je uspešno izmenjeno."
          : "Jelo je uspešno dodato.";

      clearForm();
      await loadData(false);

      setSuccessMessage(message);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(dish: DishMenuDto) {
    const confirmed = window.confirm(
      `Da li sigurno želiš da deaktiviraš jelo "${dish.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(dish.id);

      await deactivateDishAdmin(dish.id);

      if (editingDishId === dish.id) {
        clearForm();
      }

      await loadData(false);

      setSuccessMessage(`Jelo "${dish.name}" je deaktivirano.`);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleActivate(dish: DishMenuDto) {
    const confirmed = window.confirm(
      `Da li želiš da ponovo aktiviraš jelo "${dish.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(dish.id);

      await activateDish(dish.id);
      await loadData(false);

      setSuccessMessage(`Jelo "${dish.name}" je ponovo aktivirano.`);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  if (loading) {
    return (
      <main className="admin-dishes-page">
        <section className="admin-dishes-state" aria-live="polite">
          <span className="admin-dishes-state__spinner" aria-hidden="true" />

          <div>
            <strong>Učitavamo admin meni</strong>

            <p>Sačekajte trenutak dok učitamo jela, kategorije i alergene.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-dishes-page">
      <header className="admin-dishes-page__header">
        <div className="admin-dishes-page__heading">
          <span className="admin-dishes-page__eyebrow">
            UPRAVLJANJE MENIJEM
          </span>

          <h1 className="admin-dishes-page__title">Admin meni</h1>

          <p className="admin-dishes-page__description">
            Dodajte nova jela, menjajte cene i alergene, birajte preporuke kuće
            i upravljajte dostupnošću proizvoda.
          </p>
        </div>

        <button
          type="button"
          className="admin-dishes-page__new-button"
          onClick={startNewDish}
        >
          <span aria-hidden="true">+</span>
          Novo jelo
        </button>
      </header>

      <section className="admin-dish-stats" aria-label="Pregled admin menija">
        <article className="admin-dish-stat">
          <span className="admin-dish-stat__label">Ukupno</span>

          <strong className="admin-dish-stat__value">
            {dishes.length + inactiveDishes.length}
          </strong>

          <span className="admin-dish-stat__description">
            Sva jela u sistemu
          </span>
        </article>

        <article className="admin-dish-stat admin-dish-stat--active">
          <span className="admin-dish-stat__label">Aktivna</span>

          <strong className="admin-dish-stat__value">{dishes.length}</strong>

          <span className="admin-dish-stat__description">Vidljiva kupcima</span>
        </article>

        <article className="admin-dish-stat admin-dish-stat--inactive">
          <span className="admin-dish-stat__label">Deaktivirana</span>

          <strong className="admin-dish-stat__value">
            {inactiveDishes.length}
          </strong>

          <span className="admin-dish-stat__description">
            Trenutno skrivena
          </span>
        </article>

        <article className="admin-dish-stat admin-dish-stat--recommended">
          <span className="admin-dish-stat__label">Preporuke</span>

          <strong className="admin-dish-stat__value">
            {recommendedDishCount}
          </strong>

          <span className="admin-dish-stat__description">
            Istaknuta na početnoj
          </span>
        </article>
      </section>

      <div className="admin-dishes-page__messages" aria-live="polite">
        {successMessage && (
          <div className="admin-dish-alert admin-dish-alert--success">
            <span className="admin-dish-alert__icon" aria-hidden="true">
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
            className="admin-dish-alert admin-dish-alert--error"
            role="alert"
          >
            <span className="admin-dish-alert__icon" aria-hidden="true">
              !
            </span>

            <div>
              <strong>Došlo je do greške</strong>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="admin-dishes-layout">
        <section
          id="admin-dish-editor"
          className={[
            "admin-dish-editor",
            isEditing ? "admin-dish-editor--editing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <header className="admin-dish-editor__header">
            <div>
              <span className="admin-dish-editor__eyebrow">
                {isEditing ? "IZMENA PROIZVODA" : "NOVI PROIZVOD"}
              </span>

              <h2 className="admin-dish-editor__title">
                {isEditing ? "Izmeni jelo" : "Dodaj novo jelo"}
              </h2>
            </div>

            <span className="admin-dish-editor__mode">
              {isEditing ? "Izmena" : "Kreiranje"}
            </span>
          </header>

          <form className="form admin-dish-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label" htmlFor="dish-name">
                Naziv jela
                <span className="form-label__required">*</span>
              </label>

              <input
                id="dish-name"
                className="form-control"
                type="text"
                value={form.name}
                placeholder="Na primer: Chicken Burger"
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
              <label className="form-label" htmlFor="dish-description">
                Opis
              </label>

              <textarea
                id="dish-description"
                className="form-textarea"
                value={form.description}
                rows={4}
                placeholder="Kratak opis jela..."
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="dish-price">
                  Cena
                  <span className="form-label__required">*</span>
                </label>

                <div className="admin-dish-price-control">
                  <input
                    id="dish-price"
                    className="form-control"
                    type="number"
                    min="1"
                    step="1"
                    value={form.price}
                    placeholder="690"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                  />

                  <span>RSD</span>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="dish-category">
                  Kategorija
                  <span className="form-label__required">*</span>
                </label>

                <select
                  id="dish-category"
                  className="form-select"
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                >
                  <option value="">Izaberi kategoriju</option>

                  {availableCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {!category.isActive ? " — neaktivna" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <section className="admin-dish-sale-section">
              <header className="admin-dish-sale-section__header">
                <div>
                  <strong>Akcijska cena</strong>

                  <p>Označite jelo kao akcijsko i unesite nižu cenu.</p>
                </div>

                <label className="admin-dish-switch">
                  <input
                    type="checkbox"
                    checked={form.isOnSale}
                    aria-label="Označi jelo kao akcijsko"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isOnSale: event.target.checked,
                        salePrice: event.target.checked
                          ? current.salePrice
                          : "",
                      }))
                    }
                  />

                  <span
                    className="admin-dish-switch__control"
                    aria-hidden="true"
                  >
                    <span className="admin-dish-switch__thumb" />
                  </span>
                </label>
              </header>

              <div className="form-field">
                <label className="form-label" htmlFor="dish-sale-price">
                  Akcijska cena
                </label>

                <div className="admin-dish-price-control">
                  <input
                    id="dish-sale-price"
                    className="form-control"
                    type="number"
                    min="1"
                    step="1"
                    value={form.salePrice}
                    disabled={!form.isOnSale}
                    placeholder="590"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        salePrice: event.target.value,
                      }))
                    }
                  />

                  <span>RSD</span>
                </div>

                <p className="form-help">
                  Akcijska cena mora biti manja od regularne cene.
                </p>
              </div>
            </section>

            <section className="admin-dish-recommendation">
              <header className="admin-dish-recommendation__header">
                <div>
                  <strong>Preporuka kuće</strong>

                  <p>Istaknite jelo na početnoj stranici.</p>
                </div>

                <label className="admin-dish-switch">
                  <input
                    type="checkbox"
                    checked={form.isRecommended}
                    aria-label="Prikaži kao preporuku kuće"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isRecommended: event.target.checked,
                      }))
                    }
                  />

                  <span
                    className="admin-dish-switch__control"
                    aria-hidden="true"
                  >
                    <span className="admin-dish-switch__thumb" />
                  </span>
                </label>
              </header>

              <div className="form-field">
                <label className="form-label" htmlFor="dish-recommended-order">
                  Redosled preporuke
                </label>

                <input
                  id="dish-recommended-order"
                  className="form-control"
                  type="number"
                  min="0"
                  step="1"
                  value={form.recommendedSortOrder}
                  disabled={!form.isRecommended}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      recommendedSortOrder: event.target.value,
                    }))
                  }
                />

                <p className="form-help">
                  Manji broj znači da će jelo biti prikazano ranije.
                </p>
              </div>
            </section>

            <section className="admin-dish-image-section">
              <header className="admin-dish-image-section__header">
                <div>
                  <strong>Slika jela</strong>

                  <p>Unesite URL ili izaberite sliku sa računara.</p>
                </div>
              </header>

              {previewImageUrl && (
                <div className="admin-dish-image-preview">
                  <span className="admin-dish-image-preview__placeholder">
                    B&amp;C
                  </span>

                  <img
                    src={previewImageUrl}
                    alt="Pregled slike jela"
                    onError={(event) => {
                      event.currentTarget.hidden = true;
                    }}
                  />
                </div>
              )}

              <div className="form-field">
                <label className="form-label" htmlFor="dish-image-url">
                  URL slike
                </label>

                <input
                  id="dish-image-url"
                  className="form-control"
                  type="url"
                  value={form.imageUrl}
                  placeholder="https://..."
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      imageUrl: event.target.value,
                    }))
                  }
                />
              </div>

              <label className="admin-dish-upload">
                <input
                  key={fileInputKey}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;

                    setSelectedImageFile(file);
                  }}
                />

                <span className="admin-dish-upload__button">Izaberi sliku</span>

                <span className="admin-dish-upload__file-name">
                  {selectedImageFile
                    ? selectedImageFile.name
                    : "JPG, PNG ili WebP"}
                </span>
              </label>
            </section>

            <fieldset className="admin-dish-allergens">
              <legend>Alergeni</legend>

              <p className="admin-dish-allergens__description">
                Označite alergene koje jelo sadrži ili može sadržati u
                tragovima.
              </p>

              {allergens.length === 0 ? (
                <p className="admin-dish-allergens__empty">
                  Trenutno nema alergena u sistemu.
                </p>
              ) : (
                <div className="admin-dish-allergens__grid">
                  {allergens.map((allergen) => {
                    const selected = selectedAllergenIds.has(allergen.id);

                    const selectedAllergen = form.allergens.find(
                      (item) => item.allergenId === allergen.id,
                    );

                    return (
                      <article
                        key={allergen.id}
                        className={[
                          "admin-dish-allergen",
                          selected ? "admin-dish-allergen--selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <label className="admin-dish-allergen__main">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleAllergen(allergen.id)}
                          />

                          <span
                            className="admin-dish-allergen__control"
                            aria-hidden="true"
                          >
                            ✓
                          </span>

                          <span className="admin-dish-allergen__name">
                            {allergen.name}
                          </span>
                        </label>

                        {selected && (
                          <label className="admin-dish-trace">
                            <input
                              type="checkbox"
                              checked={selectedAllergen?.isTrace ?? false}
                              onChange={() => toggleIsTrace(allergen.id)}
                            />

                            <span
                              className="admin-dish-trace__control"
                              aria-hidden="true"
                            >
                              ✓
                            </span>

                            <span>Može sadržati tragove</span>
                          </label>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </fieldset>

            <div className="admin-dish-form__actions">
              <button
                type="submit"
                className="admin-dish-button admin-dish-button--primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span
                      className="admin-dish-button__spinner"
                      aria-hidden="true"
                    />
                    Čuvam...
                  </>
                ) : isEditing ? (
                  "Sačuvaj izmene"
                ) : (
                  "Dodaj jelo"
                )}
              </button>

              {isEditing && (
                <button
                  type="button"
                  className="admin-dish-button admin-dish-button--secondary"
                  disabled={saving}
                  onClick={resetForm}
                >
                  Odustani
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-dish-catalog">
          <header className="admin-dish-catalog__header">
            <div>
              <span className="admin-dish-catalog__eyebrow">
                PREGLED PROIZVODA
              </span>

              <h2 className="admin-dish-catalog__title">Jela u meniju</h2>
            </div>

            <button
              type="button"
              className="admin-dish-catalog__refresh"
              disabled={refreshing}
              onClick={() => loadData(false)}
            >
              {refreshing ? (
                <span
                  className="admin-dish-catalog__spinner"
                  aria-hidden="true"
                />
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
          </header>

          <div
            className="admin-dish-tabs"
            role="tablist"
            aria-label="Status jela"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "active"}
              className={[
                "admin-dish-tabs__button",
                view === "active" ? "admin-dish-tabs__button--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setView("active")}
            >
              Aktivna
              <span>{dishes.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={view === "inactive"}
              className={[
                "admin-dish-tabs__button",
                view === "inactive" ? "admin-dish-tabs__button--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setView("inactive")}
            >
              Deaktivirana
              <span>{inactiveDishes.length}</span>
            </button>
          </div>

          <div className="admin-dish-filters">
            <div className="admin-dish-filters__search">
              <label htmlFor="admin-dish-search">Pretraga jela</label>

              <input
                id="admin-dish-search"
                type="search"
                value={searchTerm}
                placeholder="Pretraži po nazivu, opisu ili kategoriji..."
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="admin-dish-filters__category">
              <label htmlFor="admin-dish-category-filter">Kategorija</label>

              <select
                id="admin-dish-category-filter"
                value={selectedCategoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
              >
                <option value="all">Sve kategorije</option>

                {filterCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {(searchTerm || selectedCategoryId !== "all") && (
              <button
                type="button"
                className="admin-dish-filters__clear"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategoryId("all");
                }}
              >
                Poništi filtere
              </button>
            )}
          </div>

          {displayedDishes.length === 0 ? (
            <div className="admin-dish-empty">
              <div className="admin-dish-empty__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M4 7h16v11H4V7Zm3-3v6m10-6v6M8 14h8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <span className="admin-dish-empty__eyebrow">NEMA PROIZVODA</span>

              <h3 className="admin-dish-empty__title">
                {view === "active"
                  ? "Nema aktivnih jela"
                  : "Nema deaktiviranih jela"}
              </h3>

              <p className="admin-dish-empty__description">
                {view === "active"
                  ? "Dodajte prvo jelo u meni."
                  : "Sva jela su trenutno aktivna."}
              </p>
            </div>
          ) : filteredDishes.length === 0 ? (
            <div className="admin-dish-empty">
              <div className="admin-dish-empty__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M21 21l-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <span className="admin-dish-empty__eyebrow">NEMA REZULTATA</span>

              <h3 className="admin-dish-empty__title">
                Nema jela za izabrane filtere
              </h3>

              <p className="admin-dish-empty__description">
                Promeni kategoriju ili pretragu da bi video druga jela.
              </p>
            </div>
          ) : (
            <div className="admin-dish-category-groups">
              {groupedFilteredDishes.map((group) => (
                <section
                  key={group.categoryId}
                  className="admin-dish-category-group"
                >
                  <header className="admin-dish-category-group__header">
                    <div>
                      <span className="admin-dish-category-group__eyebrow">
                        KATEGORIJA
                      </span>

                      <h3 className="admin-dish-category-group__title">
                        {group.categoryName}
                      </h3>
                    </div>

                    <span className="admin-dish-category-group__count">
                      {group.dishes.length}{" "}
                      {group.dishes.length === 1 ? "jelo" : "jela"}
                    </span>
                  </header>

                  <div className="admin-dish-cards">
                    {group.dishes.map((dish) => {
                      const isActionLoading = actionLoadingId === dish.id;

                      const isInactive = view === "inactive";

                      const dishOnSale = isDishOnSale(dish);
                      const effectivePrice = getDishEffectivePrice(dish);

                      return (
                        <article
                          key={dish.id}
                          className={[
                            "admin-dish-card",
                            isInactive ? "admin-dish-card--inactive" : "",
                            editingDishId === dish.id
                              ? "admin-dish-card--editing"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div className="admin-dish-card__image">
                            <span className="admin-dish-card__image-placeholder">
                              B&amp;C
                            </span>

                            {dish.imageUrl && (
                              <img
                                src={dish.imageUrl}
                                alt={dish.name}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.hidden = true;
                                }}
                              />
                            )}

                            <span
                              className={[
                                "admin-dish-card__status",
                                isInactive
                                  ? "admin-dish-card__status--inactive"
                                  : "admin-dish-card__status--active",
                              ].join(" ")}
                            >
                              {isInactive ? "Deaktivirano" : "Aktivno"}
                            </span>

                            {dish.isRecommended && (
                              <span className="admin-dish-card__recommended">
                                Preporuka kuće
                              </span>
                            )}

                            {dishOnSale && (
                              <span className="admin-dish-card__sale-badge">
                                Akcija
                              </span>
                            )}
                          </div>

                          <div className="admin-dish-card__body">
                            <header className="admin-dish-card__header">
                              <div>
                                <span className="admin-dish-card__category">
                                  {dish.categoryName}
                                </span>

                                <h3 className="admin-dish-card__title">
                                  {dish.name}
                                </h3>
                              </div>

                              <strong
                                className={[
                                  "admin-dish-card__price",
                                  dishOnSale
                                    ? "admin-dish-card__price--sale"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {dishOnSale ? (
                                  <>
                                    <span className="admin-dish-card__old-price">
                                      {formatPrice(dish.price)}
                                    </span>

                                    <span className="admin-dish-card__new-price">
                                      {formatPrice(effectivePrice)}
                                    </span>
                                  </>
                                ) : (
                                  formatPrice(dish.price)
                                )}
                              </strong>
                            </header>

                            <p className="admin-dish-card__description">
                              {dish.description ||
                                "Za ovo jelo nije unet opis."}
                            </p>

                            {dish.isRecommended && (
                              <div className="admin-dish-card__recommendation-info">
                                <span>Redosled preporuke</span>

                                <strong>{dish.recommendedSortOrder}</strong>
                              </div>
                            )}

                            <div className="admin-dish-card__allergens">
                              <span className="admin-dish-card__allergen-label">
                                Alergeni
                              </span>

                              {dish.allergens.length === 0 ? (
                                <span className="admin-dish-card__no-allergens">
                                  Nema označenih alergena
                                </span>
                              ) : (
                                <div className="admin-dish-card__allergen-list">
                                  {dish.allergens.map((allergen) => (
                                    <span
                                      key={allergen.allergenId}
                                      className={[
                                        "admin-dish-card__allergen",
                                        allergen.isTrace
                                          ? "admin-dish-card__allergen--trace"
                                          : "",
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    >
                                      {allergen.allergenName}

                                      {allergen.isTrace && " · tragovi"}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <footer className="admin-dish-card__actions">
                              <button
                                type="button"
                                className="admin-dish-card__action admin-dish-card__action--edit"
                                disabled={isActionLoading || saving}
                                onClick={() => startEdit(dish)}
                              >
                                Izmeni
                              </button>

                              {isInactive ? (
                                <button
                                  type="button"
                                  className="admin-dish-card__action admin-dish-card__action--activate"
                                  disabled={isActionLoading || saving}
                                  onClick={() => handleActivate(dish)}
                                >
                                  {isActionLoading
                                    ? "Aktiviram..."
                                    : "Aktiviraj"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="admin-dish-card__action admin-dish-card__action--deactivate"
                                  disabled={isActionLoading || saving}
                                  onClick={() => handleDeactivate(dish)}
                                >
                                  {isActionLoading
                                    ? "Deaktiviram..."
                                    : "Deaktiviraj"}
                                </button>
                              )}
                            </footer>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
