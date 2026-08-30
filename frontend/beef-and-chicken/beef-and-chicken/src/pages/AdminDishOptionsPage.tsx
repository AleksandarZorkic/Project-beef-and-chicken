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
import { useAppDialog } from "../components/dialogs/AppDialogContext";
import { getApiErrorMessage } from "../utils/apiErrors";
import "../styles/AdminDishOptionsPage.scss";

type DishOptionFormValue = CreateDishOptionRequest;

type TypeFilter = "all" | DishOptionType;

type StatusFilter = "all" | "active" | "inactive";

const optionTypes: {
  value: DishOptionType;
  label: string;
  shortLabel: string;
}[] = [
  {
    value: "SideDish",
    label: "Prilog",
    shortLabel: "Prilozi",
  },
  {
    value: "Spice",
    label: "Začin",
    shortLabel: "Začini",
  },
  {
    value: "SweetAddition",
    label: "Slatki dodatak",
    shortLabel: "Slatki",
  },
  {
    value: "SavoryPancakeAddition",
    label: "Slani dodatak za palačinke",
    shortLabel: "Slani",
  },
];

function getEmptyForm(): DishOptionFormValue {
  return {
    name: "",
    type: "SideDish",
    price: 0,
    isAlwaysPaid: false,
    sortOrder: 0,
  };
}

function formatPrice(value: number) {
  return `${value.toLocaleString("sr-RS")} RSD`;
}

function formatType(type: DishOptionType) {
  return optionTypes.find((item) => item.value === type)?.label ?? type;
}

function getTypeDescription(type: DishOptionType) {
  switch (type) {
    case "SideDish":
      return "Prilog može biti deo besplatnih izbora ili se može uvek dodatno naplaćivati.";

    case "Spice":
      return "Začin je uvek besplatan i nema dodatnu cenu.";

    case "SweetAddition":
      return "Slatki dodatak se dodatno naplaćuje i koristi kod slatkih palačinki.";

    case "SavoryPancakeAddition":
      return "Slani dodatak se dodatno naplaćuje i koristi kod slanih palačinki.";

    default:
      return "";
  }
}

function getTypeModifier(type: DishOptionType) {
  switch (type) {
    case "SideDish":
      return "side";

    case "Spice":
      return "spice";

    case "SweetAddition":
      return "sweet";

    case "SavoryPancakeAddition":
      return "savory";

    default:
      return "side";
  }
}

function getPaymentDescription(option: DishOptionDto) {
  if (option.type === "Spice") {
    return {
      label: "Bez doplate",
      value: "Besplatno",
    };
  }

  if (
    option.type === "SweetAddition" ||
    option.type === "SavoryPancakeAddition"
  ) {
    return {
      label: "Cena dodatka",
      value: formatPrice(option.price),
    };
  }

  if (option.isAlwaysPaid) {
    return {
      label: "Uvek se naplaćuje",
      value: formatPrice(option.price),
    };
  }

  return {
    label: "Pravilo naplate",
    value: "Prva 4 besplatna",
  };
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

  if (
    value.type === "SweetAddition" ||
    value.type === "SavoryPancakeAddition"
  ) {
    return {
      name,
      type: value.type,
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
    return "Naziv opcije je obavezan.";
  }

  if (name.length < 2) {
    return "Naziv mora imati najmanje 2 karaktera.";
  }

  if (name.length > 100) {
    return "Naziv može imati najviše 100 karaktera.";
  }

  if (
    !Number.isFinite(value.sortOrder) ||
    !Number.isInteger(value.sortOrder) ||
    value.sortOrder < 0
  ) {
    return "Redosled mora biti ceo broj 0 ili veći.";
  }

  if (!Number.isFinite(value.price) || value.price < 0) {
    return "Cena ne može biti negativna.";
  }

  if (value.type === "SideDish" && value.isAlwaysPaid && value.price <= 0) {
    return "Prilog koji se uvek naplaćuje mora imati cenu veću od 0.";
  }

  if (
    (value.type === "SweetAddition" ||
      value.type === "SavoryPancakeAddition") &&
    value.price <= 0
  ) {
    return "Dodatak mora imati cenu veću od 0.";
  }

  return null;
}

export default function AdminDishOptionsPage() {
  const { confirm } = useAppDialog();

  const [options, setOptions] = useState<DishOptionDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [formValue, setFormValue] =
    useState<DishOptionFormValue>(getEmptyForm());

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [searchTerm, setSearchTerm] = useState("");

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditing = editingId !== null;

  const loadOptions = useCallback(async (showInitialLoading = true) => {
    try {
      setError(null);

      if (showInitialLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      /*
       * Always load the complete admin catalog.
       * Filtering is handled client-side so summary
       * statistics always represent the whole system.
       */
      const data = await getAdminDishOptions({
        includeInactive: true,
      });

      setOptions(data);
    } catch (error) {
      setError(getApiErrorMessage(error) || "Greška pri učitavanju opcija.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const optionCounts = useMemo(() => {
    const active = options.filter((option) => option.isActive).length;

    const sideDishes = options.filter(
      (option) => option.type === "SideDish",
    ).length;

    const spices = options.filter((option) => option.type === "Spice").length;

    const sweetAdditions = options.filter(
      (option) => option.type === "SweetAddition",
    ).length;

    const savoryAdditions = options.filter(
      (option) => option.type === "SavoryPancakeAddition",
    ).length;

    const paid = options.filter(
      (option) => option.isAlwaysPaid && option.isActive,
    ).length;

    return {
      all: options.length,
      active,
      inactive: options.length - active,
      sideDishes,
      spices,
      sweetAdditions,
      savoryAdditions,
      paid,
    };
  }, [options]);

  const visibleOptions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("sr-RS");

    return options
      .filter((option) => {
        if (typeFilter !== "all" && option.type !== typeFilter) {
          return false;
        }

        if (statusFilter === "active" && !option.isActive) {
          return false;
        }

        if (statusFilter === "inactive" && option.isActive) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const searchableText = [option.name, formatType(option.type)]
          .join(" ")
          .toLocaleLowerCase("sr-RS");

        return searchableText.includes(normalizedSearch);
      })
      .sort((firstOption, secondOption) => {
        if (firstOption.sortOrder !== secondOption.sortOrder) {
          return firstOption.sortOrder - secondOption.sortOrder;
        }

        return firstOption.name.localeCompare(secondOption.name, "sr-RS");
      });
  }, [options, searchTerm, typeFilter, statusFilter]);

  const hasFilters =
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    searchTerm.trim().length > 0;

  function clearForm() {
    setEditingId(null);
    setFormValue(getEmptyForm());
  }

  function resetForm() {
    clearForm();

    setError(null);
    setSuccessMessage(null);
  }

  function clearFilters() {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
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
          : nextType === "SweetAddition" || nextType === "SavoryPancakeAddition"
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

    const wasEditing = editingId !== null;

    try {
      setSaving(true);

      if (editingId === null) {
        await createDishOption(payload);
      } else {
        await updateDishOption(editingId, payload);
      }

      await loadOptions(false);

      clearForm();

      setSuccessMessage(
        wasEditing
          ? "Opcija je uspešno izmenjena."
          : "Opcija je uspešno dodata.",
      );
    } catch (error) {
      setError(getApiErrorMessage(error) || "Greška pri čuvanju opcije.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(option: DishOptionDto) {
    const confirmed = await confirm({
      title: "Deaktivacija opcije",
      message: (
        <p>
          Da li želite da deaktivirate <strong>„{option.name}“</strong>? Kupci
          je više neće videti među dostupnim dodacima, ali je kasnije možete
          ponovo aktivirati.
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

      setActionLoadingId(option.id);

      await deactivateDishOption(option.id);

      if (editingId === option.id) {
        clearForm();
      }

      await loadOptions(false);

      setSuccessMessage(`Opcija „${option.name}“ je deaktivirana.`);
    } catch (error) {
      setError(getApiErrorMessage(error) || "Greška pri deaktivaciji opcije.");
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

      setSuccessMessage(`Opcija „${option.name}“ je aktivirana.`);
    } catch (error) {
      setError(getApiErrorMessage(error) || "Greška pri aktivaciji opcije.");
    } finally {
      setActionLoadingId(null);
    }
  }

  if (loading) {
    return (
      <main className="admin-dish-options-page">
        <section className="admin-dish-options-state" aria-live="polite">
          <span
            className="admin-dish-options-state__spinner"
            aria-hidden="true"
          />

          <div>
            <strong>Učitavamo dodatke</strong>

            <p>Pripremamo priloge, začine i dodatke za palačinke.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-dish-options-page">
      <section className="admin-dish-options-hero">
        <div className="admin-dish-options-hero__content">
          <span className="admin-dish-options-hero__eyebrow">
            BEEF N&apos; CHICKEN • ADMIN
          </span>

          <h1 className="admin-dish-options-hero__title">Prilozi i začini</h1>

          <p className="admin-dish-options-hero__description">
            Upravljajte prilozima, začinima i dodacima za palačinke, njihovom
            cenom, redosledom i dostupnošću.
          </p>

          <div className="admin-dish-options-hero__meta">
            <span className="admin-dish-options-hero__active">
              <span aria-hidden="true" />
              {optionCounts.active} aktivnih opcija
            </span>

            <span className="admin-dish-options-hero__inactive">
              {optionCounts.inactive} neaktivnih
            </span>
          </div>
        </div>

        <aside className="admin-dish-options-summary">
          <header className="admin-dish-options-summary__header">
            <span
              className="admin-dish-options-summary__icon"
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
            </span>

            <span className="admin-dish-options-summary__label">OPCIJE</span>
          </header>

          <div className="admin-dish-options-summary__value">
            <strong>{optionCounts.all}</strong>

            <span>dodataka u sistemu</span>
          </div>

          <footer className="admin-dish-options-summary__footer">
            <div>
              <span>Prilozi</span>
              <strong>{optionCounts.sideDishes}</strong>
            </div>

            <div>
              <span>Začini</span>
              <strong>{optionCounts.spices}</strong>
            </div>

            <button
              type="button"
              className="admin-dish-options-summary__new"
              onClick={startNewOption}
              aria-label="Dodaj novu opciju"
            >
              +
            </button>
          </footer>
        </aside>
      </section>

      <section
        className="admin-dish-option-stats"
        aria-label="Pregled dodataka"
      >
        <article className="admin-dish-option-stat">
          <span className="admin-dish-option-stat__label">Ukupno</span>

          <strong className="admin-dish-option-stat__value">
            {optionCounts.all}
          </strong>

          <span className="admin-dish-option-stat__description">
            Sve opcije
          </span>
        </article>

        <article className="admin-dish-option-stat admin-dish-option-stat--active">
          <span className="admin-dish-option-stat__label">Aktivne</span>

          <strong className="admin-dish-option-stat__value">
            {optionCounts.active}
          </strong>

          <span className="admin-dish-option-stat__description">
            Dostupne kupcima
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
            Bez doplate
          </span>
        </article>

        <article className="admin-dish-option-stat admin-dish-option-stat--sweet">
          <span className="admin-dish-option-stat__label">Slatki dodaci</span>

          <strong className="admin-dish-option-stat__value">
            {optionCounts.sweetAdditions}
          </strong>

          <span className="admin-dish-option-stat__description">
            Za slatke palačinke
          </span>
        </article>

        <article className="admin-dish-option-stat admin-dish-option-stat--savory">
          <span className="admin-dish-option-stat__label">Slani dodaci</span>

          <strong className="admin-dish-option-stat__value">
            {optionCounts.savoryAdditions}
          </strong>

          <span className="admin-dish-option-stat__description">
            Za slane palačinke
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
              <strong>Promena je sačuvana</strong>

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
              <strong>Proverite podatke</strong>

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
                {isEditing ? "Izmeni dodatak" : "Dodaj dodatak"}
              </h2>

              <p>
                {isEditing
                  ? "Promenite podatke i sačuvajte izmene."
                  : "Dodajte novu opciju koju kupci mogu izabrati uz jelo."}
              </p>
            </div>

            <span
              className={[
                "admin-dish-option-editor__mode",
                isEditing ? "admin-dish-option-editor__mode--editing" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isEditing ? "Izmena" : "Kreiranje"}
            </span>
          </header>

          <form className="form admin-dish-option-form" onSubmit={handleSave}>
            <section className="admin-dish-option-form-section">
              <header className="admin-dish-option-form-section__header">
                <span>01</span>

                <div>
                  <strong>Osnovni podaci</strong>

                  <p>Naziv, tip i redosled prikazivanja.</p>
                </div>
              </header>

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

                <p className="form-help">{formValue.name.length}/100</p>
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
                  {optionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className={[
                  "admin-dish-option-type-info",
                  `admin-dish-option-type-info--${getTypeModifier(
                    formValue.type,
                  )}`,
                ].join(" ")}
              >
                <span className="admin-dish-option-type-info__icon">
                  {formValue.type === "SideDish"
                    ? "P"
                    : formValue.type === "Spice"
                      ? "Z"
                      : formValue.type === "SweetAddition"
                        ? "S"
                        : "SL"}
                </span>

                <div>
                  <strong>{formatType(formValue.type)}</strong>

                  <p>{getTypeDescription(formValue.type)}</p>
                </div>
              </div>

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

                <p className="form-help">Manji broj znači višu poziciju.</p>
              </div>
            </section>

            <section className="admin-dish-option-payment-section">
              <header className="admin-dish-option-payment-section__header">
                <span>02</span>

                <div>
                  <strong>Pravilo naplate</strong>

                  <p>Odredite da li i koliko se dodatak naplaćuje.</p>
                </div>
              </header>

              {formValue.type === "Spice" ? (
                <div className="admin-dish-option-payment-note admin-dish-option-payment-note--free">
                  <span aria-hidden="true">✓</span>

                  <div>
                    <strong>Začin je besplatan</strong>

                    <p>Začini nemaju dodatnu cenu i kupcu se ne naplaćuju.</p>
                  </div>
                </div>
              ) : (
                <>
                  {formValue.type === "SideDish" && (
                    <section className="admin-dish-option-payment">
                      <div className="admin-dish-option-payment__content">
                        <strong>Uvek se naplaćuje</strong>

                        <p>
                          Ako je isključeno, prilog ulazi u pravilo za prve
                          četiri besplatne opcije.
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

                  {(formValue.type !== "SideDish" ||
                    formValue.isAlwaysPaid) && (
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

                      <p className="form-help">Cena mora biti veća od 0 RSD.</p>
                    </div>
                  )}

                  {formValue.type === "SideDish" && !formValue.isAlwaysPaid && (
                    <div className="admin-dish-option-payment-note">
                      <span aria-hidden="true">4</span>

                      <div>
                        <strong>Prve četiri opcije su besplatne</strong>

                        <p>
                          Ovaj prilog koristi standardno pravilo besplatnih
                          dodataka.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            <div className="admin-dish-option-form__actions">
              <button
                type="submit"
                className="admin-dish-option-button admin-dish-option-button--primary"
                disabled={saving}
              >
                {saving && (
                  <span
                    className="admin-dish-option-button__spinner"
                    aria-hidden="true"
                  />
                )}

                {saving
                  ? "Čuvam..."
                  : isEditing
                    ? "Sačuvaj izmene"
                    : "Dodaj opciju"}
              </button>

              {isEditing && (
                <button
                  type="button"
                  className="admin-dish-option-button admin-dish-option-button--secondary"
                  disabled={saving}
                  onClick={resetForm}
                >
                  Odustani
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-dish-option-catalog">
          <header className="admin-dish-option-catalog__header">
            <div>
              <span className="admin-dish-option-catalog__eyebrow">
                KATALOG DODATAKA
              </span>

              <h2 className="admin-dish-option-catalog__title">Sve opcije</h2>

              <p>Pretražite, filtrirajte i upravljajte dostupnim dodacima.</p>
            </div>

            <div className="admin-dish-option-catalog__actions">
              <div className="admin-dish-option-catalog__result">
                <strong>{visibleOptions.length}</strong>

                <span>prikazano</span>
              </div>

              <button
                type="button"
                className="admin-dish-option-catalog__refresh"
                disabled={refreshing}
                onClick={() => void loadOptions(false)}
              >
                {refreshing ? (
                  <span className="admin-dish-option-catalog__spinner" />
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
                type="search"
                value={searchTerm}
                placeholder="Pretraži po nazivu..."
                aria-label="Pretraži dodatke"
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div
              className="admin-dish-option-status-tabs"
              role="group"
              aria-label="Status dodatka"
            >
              <button
                type="button"
                className={[
                  "admin-dish-option-status-tabs__button",
                  statusFilter === "all"
                    ? "admin-dish-option-status-tabs__button--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setStatusFilter("all")}
              >
                Sve
                <span>{optionCounts.all}</span>
              </button>

              <button
                type="button"
                className={[
                  "admin-dish-option-status-tabs__button",
                  statusFilter === "active"
                    ? "admin-dish-option-status-tabs__button--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setStatusFilter("active")}
              >
                Aktivne
                <span>{optionCounts.active}</span>
              </button>

              <button
                type="button"
                className={[
                  "admin-dish-option-status-tabs__button",
                  statusFilter === "inactive"
                    ? "admin-dish-option-status-tabs__button--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setStatusFilter("inactive")}
              >
                Neaktivne
                <span>{optionCounts.inactive}</span>
              </button>
            </div>

            <div
              className="admin-dish-option-type-tabs"
              role="group"
              aria-label="Tip dodatka"
            >
              <button
                type="button"
                className={[
                  "admin-dish-option-type-tabs__button",
                  typeFilter === "all"
                    ? "admin-dish-option-type-tabs__button--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setTypeFilter("all")}
              >
                Sve vrste
              </button>

              {optionTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={[
                    "admin-dish-option-type-tabs__button",
                    typeFilter === type.value
                      ? "admin-dish-option-type-tabs__button--active"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setTypeFilter(type.value)}
                >
                  {type.shortLabel}
                </button>
              ))}
            </div>

            {hasFilters && (
              <button
                type="button"
                className="admin-dish-option-filters__clear"
                onClick={clearFilters}
              >
                Poništi filtere
              </button>
            )}
          </div>

          {visibleOptions.length === 0 ? (
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
                Nema dodataka za prikaz
              </h3>

              <p className="admin-dish-options-empty__description">
                Promenite filter ili dodajte novu opciju.
              </p>
            </div>
          ) : (
            <div className="admin-dish-option-cards">
              {visibleOptions.map((option) => {
                const isActionLoading = actionLoadingId === option.id;

                const payment = getPaymentDescription(option);

                const typeModifier = getTypeModifier(option.type);

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
                        `admin-dish-option-type--${typeModifier}`,
                      ].join(" ")}
                    >
                      {formatType(option.type)}
                    </span>

                    <h3 className="admin-dish-option-card__title">
                      {option.name}
                    </h3>

                    <p className="admin-dish-option-card__description">
                      {getTypeDescription(option.type)}
                    </p>

                    <div className="admin-dish-option-card__rule">
                      <span>{payment.label}</span>

                      <strong>{payment.value}</strong>
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
                          onClick={() => void handleDeactivate(option)}
                        >
                          {isActionLoading ? "Obrađujem..." : "Deaktiviraj"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-dish-option-card__action admin-dish-option-card__action--activate"
                          disabled={saving || isActionLoading}
                          onClick={() => void handleActivate(option)}
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
