import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  activateDishOption,
  createDishOption,
  deactivateDishOption,
  getAdminDishOptions,
  updateDishOption,
  type CreateDishOptionRequest,
  type DishOptionDto,
  type DishOptionType,
} from "../api/dishOptionsApi";
import "../styles/AdminDishOptionsPage.scss";

type DishOptionFormValue = CreateDishOptionRequest;

type TypeFilter = "all" | DishOptionType;

const emptyForm: DishOptionFormValue = {
  name: "",
  type: "SideDish",
  price: 0,
  isAlwaysPaid: false,
  sortOrder: 0,
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

function formatPrice(value: number) {
  return `${value.toLocaleString("sr-RS")} RSD`;
}

function formatType(type: DishOptionType) {
  switch (type) {
    case "SideDish":
      return "Prilog";

    case "Spice":
      return "Začin";

    case "SweetAddition":
      return "Slatki dodatak";

    default:
      return type;
  }
}

function normalizeForm(value: DishOptionFormValue): DishOptionFormValue {
  const name = value.name.trim();

  if (value.type === "Spice") {
    return {
      name,
      type: "Spice",
      price: 0,
      isAlwaysPaid: false,
      sortOrder: value.sortOrder,
    };
  }

  if (value.type === "SweetAddition") {
    return {
      name,
      type: "SweetAddition",
      price: value.price,
      isAlwaysPaid: true,
      sortOrder: value.sortOrder,
    };
  }

  if (!value.isAlwaysPaid) {
    return {
      name,
      type: "SideDish",
      price: 0,
      isAlwaysPaid: false,
      sortOrder: value.sortOrder,
    };
  }

  return {
    name,
    type: "SideDish",
    price: value.price,
    isAlwaysPaid: true,
    sortOrder: value.sortOrder,
  };
}
function validateForm(value: DishOptionFormValue) {
  const name = value.name.trim();

  if (!name) {
    return "Naziv je obavezan.";
  }

  if (name.length > 100) {
    return "Naziv može imati najviše 100 karaktera.";
  }

  if (value.price < 0) {
    return "Cena ne može biti negativna.";
  }

  if (value.sortOrder < 0) {
    return "Redosled ne može biti negativan.";
  }

  if (value.type === "Spice" && value.price !== 0) {
    return "Začin ne može imati cenu.";
  }

  if (value.type === "Spice" && value.isAlwaysPaid) {
    return "Začin ne može biti opcija koja se odmah naplaćuje.";
  }

  if (value.type === "SideDish" && value.isAlwaysPaid && value.price <= 0) {
    return "Prilog koji se odmah naplaćuje mora imati cenu veću od 0.";
  }

  if (value.type === "SweetAddition" && value.price <= 0) {
    return "Slatki dodatak mora imati cenu veću od 0.";
  }

  return null;
}

export default function AdminDishOptionsPage() {
  const [options, setOptions] = useState<DishOptionDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [formValue, setFormValue] = useState<DishOptionFormValue>(emptyForm);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const [includeInactive, setIncludeInactive] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditing = editingId !== null;

  const loadOptions = useCallback(
    async (showInitialLoading = true) => {
      try {
        setError(null);

        if (showInitialLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const data = await getAdminDishOptions({
          includeInactive,
          type: typeFilter === "all" ? undefined : typeFilter,
        });

        setOptions(data);
      } catch (error: any) {
        setError(getErrorMessage(error, "Greška pri učitavanju opcija."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [includeInactive, typeFilter],
  );

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

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

  const visibleOptions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("sr-RS");

    return [...options]
      .filter((option) => {
        if (!normalizedSearch) {
          return true;
        }

        return option.name
          .toLocaleLowerCase("sr-RS")
          .includes(normalizedSearch);
      })
      .sort((firstOption, secondOption) => {
        if (firstOption.sortOrder !== secondOption.sortOrder) {
          return firstOption.sortOrder - secondOption.sortOrder;
        }

        return firstOption.name.localeCompare(secondOption.name, "sr-RS");
      });
  }, [options, searchTerm]);

  const optionCounts = useMemo(() => {
    const active = options.filter((option) => option.isActive).length;

    const sideDishes = options.filter(
      (option) => option.type === "SideDish",
    ).length;

    const spices = options.filter((option) => option.type === "Spice").length;

    const sweetAdditions = options.filter(
      (option) => option.type === "SweetAddition",
    ).length;

    return {
      all: options.length,
      active,
      inactive: options.length - active,
      sideDishes,
      spices,
      sweetAdditions,
    };
  }, [options]);

  function clearForm() {
    setEditingId(null);
    setFormValue(emptyForm);
  }

  function resetForm() {
    clearForm();
    setError(null);
    setSuccessMessage(null);
  }

  function scrollToEditor() {
    const editor = document.getElementById("admin-dish-option-editor");

    if (!editor) {
      return;
    }

    editor.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function startNewOption() {
    resetForm();

    window.setTimeout(scrollToEditor, 0);
  }

  function handleEdit(option: DishOptionDto) {
    setError(null);
    setSuccessMessage(null);
    setEditingId(option.id);

    setFormValue({
      name: option.name,
      type: option.type,
      price: option.price,
      isAlwaysPaid: option.isAlwaysPaid,
      sortOrder: option.sortOrder,
    });

    window.setTimeout(scrollToEditor, 0);
  }

  function handleTypeChange(nextType: DishOptionType) {
    setFormValue((current) => ({
      ...current,
      type: nextType,
      price: nextType === "Spice" ? 0 : current.price,
      isAlwaysPaid:
        nextType === "Spice"
          ? false
          : nextType === "SweetAddition"
            ? true
            : current.isAlwaysPaid,
    }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccessMessage(null);

    const validationError = validateForm(formValue);

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = normalizeForm(formValue);

    try {
      setSaving(true);

      const message =
        editingId === null
          ? "Opcija je uspešno dodata."
          : "Opcija je uspešno izmenjena.";

      if (editingId === null) {
        await createDishOption(payload);
      } else {
        await updateDishOption(editingId, payload);
      }

      await loadOptions(false);
      clearForm();

      setSuccessMessage(message);
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri čuvanju opcije."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(option: DishOptionDto) {
    const confirmed = window.confirm(
      `Da li želiš da deaktiviraš opciju "${option.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(option.id);

      await deactivateDishOption(option.id);

      if (editingId === option.id) {
        clearForm();
      }

      await loadOptions(false);

      setSuccessMessage(`Opcija "${option.name}" je deaktivirana.`);
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri deaktivaciji opcije."));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleActivate(option: DishOptionDto) {
    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(option.id);

      await activateDishOption(option.id);
      await loadOptions(false);

      setSuccessMessage(`Opcija "${option.name}" je aktivirana.`);
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri aktivaciji opcije."));
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <main className="admin-dish-options-page">
      <header className="admin-dish-options-page__header">
        <div className="admin-dish-options-page__heading">
          <span className="admin-dish-options-page__eyebrow">
            DODACI UZ JELA
          </span>

          <h1 className="admin-dish-options-page__title">Prilozi i začini</h1>

          <p className="admin-dish-options-page__description">
            Kreirajte priloge i začine, odredite redosled prikaza i podesite
            koje opcije se dodatno naplaćuju.
          </p>
        </div>

        <button
          type="button"
          className="admin-dish-options-page__new-button"
          onClick={startNewOption}
        >
          <span aria-hidden="true">+</span>
          Nova opcija
        </button>
      </header>

      <section className="admin-dish-option-stats" aria-label="Pregled opcija">
        <article className="admin-dish-option-stat">
          <span className="admin-dish-option-stat__label">Prikazano</span>

          <strong className="admin-dish-option-stat__value">
            {optionCounts.all}
          </strong>

          <span className="admin-dish-option-stat__description">
            Opcije trenutnog filtera
          </span>
        </article>

        <article className="admin-dish-option-stat admin-dish-option-stat--active">
          <span className="admin-dish-option-stat__label">Aktivne</span>

          <strong className="admin-dish-option-stat__value">
            {optionCounts.active}
          </strong>

          <span className="admin-dish-option-stat__description">
            Dostupne za izbor
          </span>
        </article>

        <article className="admin-dish-option-stat admin-dish-option-stat--side">
          <span className="admin-dish-option-stat__label">Prilozi</span>

          <strong className="admin-dish-option-stat__value">
            {optionCounts.sideDishes}
          </strong>

          <span className="admin-dish-option-stat__description">
            Besplatni ili plaćeni
          </span>
        </article>

        <article className="admin-dish-option-stat admin-dish-option-stat--spice">
          <span className="admin-dish-option-stat__label">Začini</span>

          <strong className="admin-dish-option-stat__value">
            {optionCounts.spices}
          </strong>

          <span className="admin-dish-option-stat__description">
            Uvek bez doplate
          </span>
        </article>
      </section>

      <div className="admin-dish-options-page__messages" aria-live="polite">
        {successMessage && (
          <div className="admin-dish-option-alert admin-dish-option-alert--success">
            <span className="admin-dish-option-alert__icon" aria-hidden="true">
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
            className="admin-dish-option-alert admin-dish-option-alert--error"
            role="alert"
          >
            <span className="admin-dish-option-alert__icon" aria-hidden="true">
              !
            </span>

            <div>
              <strong>Došlo je do greške</strong>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="admin-dish-options-layout">
        <section
          id="admin-dish-option-editor"
          className={[
            "admin-dish-option-editor",
            isEditing ? "admin-dish-option-editor--editing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <header className="admin-dish-option-editor__header">
            <div>
              <span className="admin-dish-option-editor__eyebrow">
                {isEditing ? "IZMENA OPCIJE" : "NOVA OPCIJA"}
              </span>

              <h2 className="admin-dish-option-editor__title">
                {isEditing ? "Izmeni opciju" : "Dodaj opciju"}
              </h2>
            </div>

            <span className="admin-dish-option-editor__mode">
              {isEditing ? "Izmena" : "Kreiranje"}
            </span>
          </header>

          <form className="form admin-dish-option-form" onSubmit={handleSave}>
            <div className="form-field">
              <label className="form-label" htmlFor="dish-option-name">
                Naziv
                <span className="form-label__required">*</span>
              </label>

              <input
                id="dish-option-name"
                className="form-control"
                type="text"
                value={formValue.name}
                maxLength={100}
                disabled={saving}
                placeholder="Na primer: Pomfrit"
                onChange={(event) =>
                  setFormValue((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />

              <p className="form-help">{formValue.name.length}/100 karaktera</p>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="dish-option-type">
                Tip opcije
                <span className="form-label__required">*</span>
              </label>

              <select
                id="dish-option-type"
                className="form-select"
                value={formValue.type}
                disabled={saving}
                onChange={(event) =>
                  handleTypeChange(event.target.value as DishOptionType)
                }
              >
                <option value="SideDish">Prilog</option>

                <option value="Spice">Začin</option>

                <option value="SweetAddition">Slatki dodatak</option>
              </select>
            </div>

            <div className="admin-dish-option-type-info">
              <strong>{formatType(formValue.type)}</strong>

              <p>
                {formValue.type === "SideDish" &&
                  "Prilog može biti deo pravila za besplatne dodatke ili se može uvek dodatno naplaćivati."}

                {formValue.type === "Spice" &&
                  "Začin je uvek besplatan i ne može imati cenu."}

                {formValue.type === "SweetAddition" &&
                  "Slatki dodatak se koristi za palačinke i uvek se dodatno naplaćuje."}
              </p>
            </div>

            {formValue.type === "SideDish" && (
              <section className="admin-dish-option-payment">
                <div className="admin-dish-option-payment__content">
                  <strong>Uvek se dodatno naplaćuje</strong>

                  <p>
                    Kada je isključeno, prilog ulazi u pravilo za prve četiri
                    besplatne opcije.
                  </p>
                </div>

                <label className="admin-dish-option-switch">
                  <input
                    type="checkbox"
                    checked={formValue.isAlwaysPaid}
                    disabled={saving}
                    aria-label="Prilog se uvek naplaćuje"
                    onChange={(event) =>
                      setFormValue((current) => ({
                        ...current,
                        isAlwaysPaid: event.target.checked,
                        price: event.target.checked ? current.price : 0,
                      }))
                    }
                  />

                  <span
                    className="admin-dish-option-switch__control"
                    aria-hidden="true"
                  >
                    <span className="admin-dish-option-switch__thumb" />
                  </span>
                </label>
              </section>
            )}

            {((formValue.type === "SideDish" && formValue.isAlwaysPaid) ||
              formValue.type === "SweetAddition") && (
              <div className="form-field">
                <label className="form-label" htmlFor="dish-option-price">
                  Cena
                  <span className="form-label__required">*</span>
                </label>

                <div className="admin-dish-option-money-control">
                  <input
                    id="dish-option-price"
                    className="form-control"
                    type="number"
                    min={1}
                    step={1}
                    value={formValue.price}
                    disabled={saving}
                    onChange={(event) =>
                      setFormValue((current) => ({
                        ...current,
                        price: Number(event.target.value),
                      }))
                    }
                  />

                  <span>RSD</span>
                </div>

                <p className="form-help">
                  {formValue.type === "SweetAddition"
                    ? "Slatki dodatak mora imati cenu veću od nule."
                    : "Cena mora biti veća od nule."}
                </p>
              </div>
            )}

            <div className="form-field">
              <label className="form-label" htmlFor="dish-option-sort-order">
                Redosled prikaza
              </label>

              <input
                id="dish-option-sort-order"
                className="form-control"
                type="number"
                min={0}
                step={1}
                value={formValue.sortOrder}
                disabled={saving}
                onChange={(event) =>
                  setFormValue((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value),
                  }))
                }
              />

              <p className="form-help">Manji broj znači ranije prikazivanje.</p>
            </div>

            <div className="admin-dish-option-form__actions">
              <button
                type="submit"
                className="admin-dish-option-button admin-dish-option-button--primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span
                      className="admin-dish-option-button__spinner"
                      aria-hidden="true"
                    />
                    Čuvam...
                  </>
                ) : isEditing ? (
                  "Sačuvaj izmene"
                ) : (
                  "Dodaj opciju"
                )}
              </button>

              {isEditing && (
                <button
                  type="button"
                  className="admin-dish-option-button admin-dish-option-button--secondary"
                  disabled={saving}
                  onClick={resetForm}
                >
                  Otkaži izmenu
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-dish-option-catalog">
          <header className="admin-dish-option-catalog__header">
            <div>
              <span className="admin-dish-option-catalog__eyebrow">
                PREGLED OPCIJA
              </span>

              <h2 className="admin-dish-option-catalog__title">
                Dostupni dodaci
              </h2>
            </div>

            <button
              type="button"
              className="admin-dish-option-catalog__refresh"
              disabled={refreshing}
              onClick={() => void loadOptions(false)}
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

              {refreshing ? "Osvežavam..." : "Osveži"}
            </button>
          </header>

          <div className="admin-dish-option-filters">
            <div className="admin-dish-option-search">
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
                className="form-control"
                type="search"
                value={searchTerm}
                placeholder="Pretraži opcije..."
                aria-label="Pretraži opcije"
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div
              className="admin-dish-option-filter-tabs"
              role="group"
              aria-label="Tip opcije"
            >
              <button
                type="button"
                className={[
                  "admin-dish-option-filter-tabs__button",
                  typeFilter === "all"
                    ? "admin-dish-option-filter-tabs__button--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={typeFilter === "all"}
                onClick={() => setTypeFilter("all")}
              >
                Sve
              </button>

              <button
                type="button"
                className={[
                  "admin-dish-option-filter-tabs__button",
                  typeFilter === "SideDish"
                    ? "admin-dish-option-filter-tabs__button--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={typeFilter === "SideDish"}
                onClick={() => setTypeFilter("SideDish")}
              >
                Prilozi
              </button>

              <button
                type="button"
                className={[
                  "admin-dish-option-filter-tabs__button",
                  typeFilter === "Spice"
                    ? "admin-dish-option-filter-tabs__button--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={typeFilter === "Spice"}
                onClick={() => setTypeFilter("Spice")}
              >
                Začini
              </button>

              <button
                type="button"
                className={[
                  "admin-dish-option-filter-tabs__button",
                  typeFilter === "SweetAddition"
                    ? "admin-dish-option-filter-tabs__button--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={typeFilter === "SweetAddition"}
                onClick={() => setTypeFilter("SweetAddition")}
              >
                Slatki dodaci
              </button>
            </div>

            <label className="admin-dish-option-inactive-filter">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
              />

              <span
                className="admin-dish-option-inactive-filter__control"
                aria-hidden="true"
              >
                ✓
              </span>

              <span>Prikaži neaktivne opcije</span>
            </label>
          </div>

          {loading ? (
            <div className="admin-dish-options-state">
              <span
                className="admin-dish-options-state__spinner"
                aria-hidden="true"
              />

              <div>
                <strong>Učitavamo opcije</strong>
                <p>Sačekajte trenutak.</p>
              </div>
            </div>
          ) : visibleOptions.length === 0 ? (
            <div className="admin-dish-options-empty">
              <div
                className="admin-dish-options-empty__icon"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24">
                  <path
                    d="M5 6h14v12H5V6Zm3 4h8M8 14h5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <span className="admin-dish-options-empty__eyebrow">
                NEMA REZULTATA
              </span>

              <h3 className="admin-dish-options-empty__title">
                Nema opcija za prikaz
              </h3>

              <p className="admin-dish-options-empty__description">
                Promenite filter ili dodajte novu opciju.
              </p>
            </div>
          ) : (
            <div className="admin-dish-option-cards">
              {visibleOptions.map((option) => {
                const isActionLoading = actionLoadingId === option.id;

                return (
                  <article
                    key={option.id}
                    className={[
                      "admin-dish-option-card",
                      !option.isActive
                        ? "admin-dish-option-card--inactive"
                        : "",
                      editingId === option.id
                        ? "admin-dish-option-card--editing"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <header className="admin-dish-option-card__header">
                      <span className="admin-dish-option-card__order">
                        {String(option.sortOrder).padStart(2, "0")}
                      </span>

                      <span
                        className={[
                          "admin-dish-option-status",
                          option.isActive
                            ? "admin-dish-option-status--active"
                            : "admin-dish-option-status--inactive",
                        ].join(" ")}
                      >
                        <span
                          className="admin-dish-option-status__dot"
                          aria-hidden="true"
                        />

                        {option.isActive ? "Aktivna" : "Neaktivna"}
                      </span>
                    </header>

                    <span
                      className={[
                        "admin-dish-option-type",
                        option.type === "SideDish"
                          ? "admin-dish-option-type--side"
                          : option.type === "Spice"
                            ? "admin-dish-option-type--spice"
                            : "admin-dish-option-type--sweet",
                      ].join(" ")}
                    >
                      {formatType(option.type)}
                    </span>

                    <h3 className="admin-dish-option-card__title">
                      {option.name}
                    </h3>

                    <div className="admin-dish-option-card__rule">
                      {option.type === "Spice" ? (
                        <>
                          <span>Pravilo naplate</span>
                          <strong>Uvek besplatno</strong>
                        </>
                      ) : option.type === "SweetAddition" ? (
                        <>
                          <span>Uvek se naplaćuje</span>
                          <strong>{formatPrice(option.price)}</strong>
                        </>
                      ) : option.isAlwaysPaid ? (
                        <>
                          <span>Uvek se naplaćuje</span>
                          <strong>{formatPrice(option.price)}</strong>
                        </>
                      ) : (
                        <>
                          <span>Pravilo naplate</span>
                          <strong>Prva 4 besplatna</strong>
                        </>
                      )}
                    </div>

                    <footer className="admin-dish-option-card__actions">
                      <button
                        type="button"
                        className="admin-dish-option-card__action admin-dish-option-card__action--edit"
                        disabled={saving || isActionLoading}
                        onClick={() => handleEdit(option)}
                      >
                        Izmeni
                      </button>

                      {option.isActive ? (
                        <button
                          type="button"
                          className="admin-dish-option-card__action admin-dish-option-card__action--deactivate"
                          disabled={saving || isActionLoading}
                          onClick={() => handleDeactivate(option)}
                        >
                          {isActionLoading ? "Obrađujem..." : "Deaktiviraj"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-dish-option-card__action admin-dish-option-card__action--activate"
                          disabled={saving || isActionLoading}
                          onClick={() => handleActivate(option)}
                        >
                          {isActionLoading ? "Obrađujem..." : "Aktiviraj"}
                        </button>
                      )}
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
