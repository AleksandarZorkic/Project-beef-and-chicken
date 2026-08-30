import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  getAdminRestaurantSettings,
  updateRestaurantSettings,
  type DayOfWeekName,
  type RestaurantWorkingHourDto,
} from "../api/restaurantSettingsApi";
import { useAppDialog } from "../components/dialogs/AppDialogContext";
import { getApiErrorMessage } from "../utils/apiErrors";
import "../styles/AdminRestaurantSettingsPage.scss";

type SettingsFormState = {
  minimumOrderAmount: string;
  deliveryFee: string;
  freeDeliveryThreshold: string;
  isDeliveryEnabled: boolean;
  workingHours: WorkingHourFormState[];
};

type SettingsTab = "delivery" | "workingHours";

type WorkingHourFormState = {
  dayOfWeek: DayOfWeekName;
  dayName: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  closesNextDay: boolean;
};

const defaultWorkingHours: WorkingHourFormState[] = [
  {
    dayOfWeek: "Monday",
    dayName: "Ponedeljak",
    openTime: "10:00",
    closeTime: "23:00",
    isClosed: false,
    closesNextDay: false,
  },
  {
    dayOfWeek: "Tuesday",
    dayName: "Utorak",
    openTime: "10:00",
    closeTime: "23:00",
    isClosed: false,
    closesNextDay: false,
  },
  {
    dayOfWeek: "Wednesday",
    dayName: "Sreda",
    openTime: "10:00",
    closeTime: "23:00",
    isClosed: false,
    closesNextDay: false,
  },
  {
    dayOfWeek: "Thursday",
    dayName: "Četvrtak",
    openTime: "10:00",
    closeTime: "23:00",
    isClosed: false,
    closesNextDay: false,
  },
  {
    dayOfWeek: "Friday",
    dayName: "Petak",
    openTime: "10:00",
    closeTime: "01:00",
    isClosed: false,
    closesNextDay: true,
  },
  {
    dayOfWeek: "Saturday",
    dayName: "Subota",
    openTime: "12:00",
    closeTime: "01:00",
    isClosed: false,
    closesNextDay: true,
  },
  {
    dayOfWeek: "Sunday",
    dayName: "Nedelja",
    openTime: "12:00",
    closeTime: "22:00",
    isClosed: false,
    closesNextDay: false,
  },
];

const emptyForm: SettingsFormState = {
  minimumOrderAmount: "800",
  deliveryFee: "200",
  freeDeliveryThreshold: "2500",
  isDeliveryEnabled: true,
  workingHours: defaultWorkingHours,
};

function cloneSettingsForm(value: SettingsFormState): SettingsFormState {
  return {
    ...value,
    workingHours: value.workingHours.map((day) => ({
      ...day,
    })),
  };
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Nema podataka";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Nepoznat datum";
  }

  return date.toLocaleString("sr-RS", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseAmount(value: string) {
  if (!value.trim()) {
    return null;
  }

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
}

function formatAmount(value: number | null) {
  if (value === null) {
    return "Nije podešeno";
  }

  return `${value.toLocaleString("sr-RS")} RSD`;
}

function mapWorkingHours(
  workingHours?: RestaurantWorkingHourDto[] | null,
): WorkingHourFormState[] {
  if (!workingHours || workingHours.length === 0) {
    return defaultWorkingHours.map((day) => ({
      ...day,
    }));
  }

  return defaultWorkingHours.map((defaultDay) => {
    const existingDay = workingHours.find(
      (item) => item.dayOfWeek === defaultDay.dayOfWeek,
    );

    if (!existingDay) {
      return {
        ...defaultDay,
      };
    }

    return {
      dayOfWeek: existingDay.dayOfWeek,
      dayName: existingDay.dayName || defaultDay.dayName,
      openTime: existingDay.openTime || defaultDay.openTime,
      closeTime: existingDay.closeTime || defaultDay.closeTime,
      isClosed: existingDay.isClosed,
      closesNextDay: existingDay.closesNextDay,
    };
  });
}

function formatWorkingHourPreview(day: WorkingHourFormState) {
  if (day.isClosed) {
    return "Zatvoreno";
  }

  return `${day.openTime} – ${day.closeTime}${
    day.closesNextDay ? " sutradan" : ""
  }`;
}

export default function AdminRestaurantSettingsPage() {
  const { confirm } = useAppDialog();

  const [form, setForm] = useState<SettingsFormState>(emptyForm);

  const [savedForm, setSavedForm] = useState<SettingsFormState>(
    cloneSettingsForm(emptyForm),
  );

  const [activeTab, setActiveTab] = useState<SettingsTab>("delivery");

  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async (showInitialLoading = true) => {
    try {
      setError(null);

      if (showInitialLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const settings = await getAdminRestaurantSettings();

      const nextForm: SettingsFormState = {
        minimumOrderAmount: String(settings.minimumOrderAmount),
        deliveryFee: String(settings.deliveryFee),
        freeDeliveryThreshold:
          settings.freeDeliveryThreshold === null ||
          settings.freeDeliveryThreshold === undefined
            ? ""
            : String(settings.freeDeliveryThreshold),
        isDeliveryEnabled: settings.isDeliveryEnabled,
        workingHours: mapWorkingHours(settings.workingHours),
      };

      setForm(cloneSettingsForm(nextForm));

      setSavedForm(cloneSettingsForm(nextForm));

      setUpdatedAt(settings.updatedAt);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const preview = useMemo(() => {
    return {
      minimumOrderAmount: parseAmount(form.minimumOrderAmount),
      deliveryFee: parseAmount(form.deliveryFee),
      freeDeliveryThreshold: parseAmount(form.freeDeliveryThreshold),
      workingHours: form.workingHours,
    };
  }, [form]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(savedForm);
  }, [form, savedForm]);

  const scheduleSummary = useMemo(() => {
    const closedDays = form.workingHours.filter((day) => day.isClosed).length;

    const overnightDays = form.workingHours.filter(
      (day) => !day.isClosed && day.closesNextDay,
    ).length;

    return {
      openDays: form.workingHours.length - closedDays,
      closedDays,
      overnightDays,
    };
  }, [form.workingHours]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  function validateForm() {
    const minimumOrderAmount = Number(form.minimumOrderAmount);

    const deliveryFee = Number(form.deliveryFee);

    const freeDeliveryThreshold = form.freeDeliveryThreshold.trim()
      ? Number(form.freeDeliveryThreshold)
      : null;

    if (!Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0) {
      return "Minimalna porudžbina mora biti 0 ili veća.";
    }

    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
      return "Cena dostave mora biti 0 ili veća.";
    }

    if (
      freeDeliveryThreshold !== null &&
      (!Number.isFinite(freeDeliveryThreshold) || freeDeliveryThreshold <= 0)
    ) {
      return "Iznos za besplatnu dostavu mora biti veći od 0 ili prazan.";
    }

    if (
      freeDeliveryThreshold !== null &&
      freeDeliveryThreshold < minimumOrderAmount
    ) {
      return "Besplatna dostava ne treba da bude ispod minimalne porudžbine.";
    }

    for (const day of form.workingHours) {
      // Closed days do not need time validation.
      if (day.isClosed) {
        continue;
      }

      if (!day.openTime || !day.closeTime) {
        return `Unesite vreme otvaranja i zatvaranja za ${day.dayName}.`;
      }

      if (day.openTime === day.closeTime) {
        return `Vreme otvaranja i zatvaranja ne mogu biti ista za ${day.dayName}.`;
      }

      if (!day.closesNextDay && day.openTime > day.closeTime) {
        return `Za ${day.dayName} uključite rad preko ponoći ili promenite vreme zatvaranja.`;
      }

      if (day.closesNextDay && day.openTime < day.closeTime) {
        return `Za ${day.dayName} rad preko ponoći nije potreban.`;
      }
    }

    return null;
  }

  function updateWorkingHour(
    dayOfWeek: DayOfWeekName,
    changes: Partial<WorkingHourFormState>,
  ) {
    setForm((current) => ({
      ...current,

      workingHours: current.workingHours.map((day) => {
        if (day.dayOfWeek !== dayOfWeek) {
          return day;
        }

        const nextDay = {
          ...day,
          ...changes,
        };

        if (changes.isClosed === true) {
          nextDay.closesNextDay = false;
        }

        return nextDay;
      }),
    }));
  }

  function discardChanges() {
    setForm(cloneSettingsForm(savedForm));

    setError(null);
    setSuccessMessage(null);
  }

  async function handleReloadFromServer() {
    if (hasUnsavedChanges) {
      const confirmed = await confirm({
        title: "Ponovno učitavanje",
        message: (
          <p>
            Imate nesačuvane izmene. Ponovno učitavanje će ih odbaciti i vratiti
            poslednja podešavanja sa servera.
          </p>
        ),
        confirmText: "Učitaj ponovo",
        cancelText: "Odustani",
        tone: "danger",
      });

      if (!confirmed) {
        return;
      }
    }

    await loadSettings(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setSuccessMessage(null);
      return;
    }

    const payload = {
      minimumOrderAmount: Number(form.minimumOrderAmount),

      deliveryFee: Number(form.deliveryFee),

      freeDeliveryThreshold: form.freeDeliveryThreshold.trim()
        ? Number(form.freeDeliveryThreshold)
        : null,

      isDeliveryEnabled: form.isDeliveryEnabled,

      workingHours: form.workingHours.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        openTime: day.openTime,
        closeTime: day.closeTime,
        isClosed: day.isClosed,
        closesNextDay: day.isClosed ? false : day.closesNextDay,
      })),
    };

    try {
      setSaving(true);

      setError(null);
      setSuccessMessage(null);

      const updated = await updateRestaurantSettings(payload);

      setUpdatedAt(updated.updatedAt);

      setSavedForm(cloneSettingsForm(form));

      setSuccessMessage("Podešavanja restorana su uspešno sačuvana.");
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="admin-settings-page">
        <section className="admin-settings-loading" aria-live="polite">
          <span
            className="admin-settings-loading__spinner"
            aria-hidden="true"
          />

          <div>
            <strong>Učitavamo podešavanja</strong>

            <p>Pripremamo pravila dostave i radno vreme restorana.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-settings-page">
      <section className="admin-settings-hero">
        <div className="admin-settings-hero__content">
          <span className="admin-settings-hero__eyebrow">
            BEEF N&apos; CHICKEN • ADMIN
          </span>

          <h1 className="admin-settings-hero__title">Podešavanja</h1>

          <p className="admin-settings-hero__description">
            Upravljajte pravilima poručivanja, dostavom i radnim vremenom
            restorana sa jednog mesta.
          </p>

          <div className="admin-settings-hero__meta">
            <span
              className={[
                "admin-settings-hero__delivery",
                form.isDeliveryEnabled
                  ? "admin-settings-hero__delivery--active"
                  : "admin-settings-hero__delivery--inactive",
              ].join(" ")}
            >
              <span aria-hidden="true" />

              {form.isDeliveryEnabled
                ? "Dostava dostupna"
                : "Dostava isključena"}
            </span>

            <span className="admin-settings-hero__hours">
              {scheduleSummary.openDays}/7 radnih dana
            </span>
          </div>
        </div>

        <aside className="admin-settings-summary">
          <header className="admin-settings-summary__header">
            <span className="admin-settings-summary__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />

                <circle
                  cx="12"
                  cy="12"
                  r="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
            </span>

            <span className="admin-settings-summary__label">SISTEM</span>
          </header>

          <div className="admin-settings-summary__value">
            <strong>{hasUnsavedChanges ? "!" : "✓"}</strong>

            <span>
              {hasUnsavedChanges
                ? "izmene čekaju čuvanje"
                : "podešavanja sačuvana"}
            </span>
          </div>

          <footer className="admin-settings-summary__footer">
            <div>
              <span>Poslednja izmena</span>

              <strong>{formatDate(updatedAt)}</strong>
            </div>

            <button
              type="button"
              className="admin-settings-summary__refresh"
              disabled={refreshing || saving}
              onClick={() => void handleReloadFromServer()}
              aria-label="Ponovo učitaj podešavanja"
            >
              {refreshing ? (
                <span className="admin-settings-spinner" />
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
            </button>
          </footer>
        </aside>
      </section>

      <section
        className="admin-settings-stats"
        aria-label="Pregled podešavanja"
      >
        <article
          className={[
            "admin-settings-stat",
            form.isDeliveryEnabled
              ? "admin-settings-stat--active"
              : "admin-settings-stat--inactive",
          ].join(" ")}
        >
          <span className="admin-settings-stat__label">Dostava</span>

          <strong className="admin-settings-stat__value admin-settings-stat__value--text">
            {form.isDeliveryEnabled ? "Dostupna" : "Isključena"}
          </strong>

          <span className="admin-settings-stat__description">
            Trenutni status
          </span>
        </article>

        <article className="admin-settings-stat">
          <span className="admin-settings-stat__label">
            Minimalna porudžbina
          </span>

          <strong className="admin-settings-stat__value">
            {formatAmount(preview.minimumOrderAmount)}
          </strong>

          <span className="admin-settings-stat__description">
            Minimalni iznos korpe
          </span>
        </article>

        <article className="admin-settings-stat">
          <span className="admin-settings-stat__label">Cena dostave</span>

          <strong className="admin-settings-stat__value">
            {formatAmount(preview.deliveryFee)}
          </strong>

          <span className="admin-settings-stat__description">
            Standardna naknada
          </span>
        </article>

        <article className="admin-settings-stat admin-settings-stat--free">
          <span className="admin-settings-stat__label">Besplatna dostava</span>

          <strong className="admin-settings-stat__value">
            {formatAmount(preview.freeDeliveryThreshold)}
          </strong>

          <span className="admin-settings-stat__description">
            Prag za besplatnu dostavu
          </span>
        </article>
      </section>

      <div className="admin-settings-page__messages" aria-live="polite">
        {successMessage && (
          <div className="admin-settings-alert admin-settings-alert--success">
            <span className="admin-settings-alert__icon" aria-hidden="true">
              ✓
            </span>

            <div>
              <strong>Podešavanja su sačuvana</strong>

              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div
            className="admin-settings-alert admin-settings-alert--error"
            role="alert"
          >
            <span className="admin-settings-alert__icon" aria-hidden="true">
              !
            </span>

            <div>
              <strong>Proverite podešavanja</strong>

              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <div className="admin-settings-workspace">
          <section className="admin-settings-editor">
            <header className="admin-settings-editor__header">
              <div>
                <span className="admin-settings-editor__eyebrow">
                  KONFIGURACIJA RESTORANA
                </span>

                <h2 className="admin-settings-editor__title">
                  Pravila poslovanja
                </h2>

                <p>Izaberite sekciju koju želite da promenite.</p>
              </div>

              <span
                className={[
                  "admin-settings-editor__status",
                  hasUnsavedChanges
                    ? "admin-settings-editor__status--unsaved"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {hasUnsavedChanges ? "Nesačuvano" : "Sačuvano"}
              </span>
            </header>

            <div
              className="admin-settings-tabs"
              role="tablist"
              aria-label="Podešavanja restorana"
            >
              <button
                id="delivery-settings-tab"
                type="button"
                role="tab"
                aria-selected={activeTab === "delivery"}
                aria-controls="delivery-settings-panel"
                className={[
                  "admin-settings-tabs__button",
                  activeTab === "delivery"
                    ? "admin-settings-tabs__button--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setActiveTab("delivery")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M3 16h11V6H3v10Zm11-6h4l3 3v3h-7v-6Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />

                  <circle
                    cx="7"
                    cy="18"
                    r="2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />

                  <circle
                    cx="18"
                    cy="18"
                    r="2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>

                <span>Dostava i porudžbine</span>
              </button>

              <button
                id="working-hours-settings-tab"
                type="button"
                role="tab"
                aria-selected={activeTab === "workingHours"}
                aria-controls="working-hours-settings-panel"
                className={[
                  "admin-settings-tabs__button",
                  activeTab === "workingHours"
                    ? "admin-settings-tabs__button--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setActiveTab("workingHours")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle
                    cx="12"
                    cy="12"
                    r="8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />

                  <path
                    d="M12 7.5V12l3 2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>

                <span>Radno vreme</span>
              </button>
            </div>

            {activeTab === "delivery" && (
              <section
                id="delivery-settings-panel"
                className="admin-settings-tab-panel"
                role="tabpanel"
                aria-labelledby="delivery-settings-tab"
              >
                <header className="admin-settings-tab-panel__header">
                  <span className="admin-settings-tab-panel__eyebrow">
                    DOSTAVA I PORUDŽBINE
                  </span>

                  <h3 className="admin-settings-tab-panel__title">
                    Finansijska pravila
                  </h3>

                  <p className="admin-settings-tab-panel__description">
                    Podesite minimalnu porudžbinu, cenu dostave i pravila
                    besplatne dostave.
                  </p>
                </header>

                <div className="admin-settings-delivery-fields">
                  <div className="form-field">
                    <label
                      className="form-label"
                      htmlFor="minimum-order-amount"
                    >
                      Minimalna porudžbina
                      <span className="form-label__required">*</span>
                    </label>

                    <div className="admin-settings-money-control">
                      <input
                        id="minimum-order-amount"
                        className="form-control"
                        type="number"
                        min="0"
                        step="1"
                        value={form.minimumOrderAmount}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,

                            minimumOrderAmount: event.target.value,
                          }))
                        }
                      />

                      <span>RSD</span>
                    </div>

                    <p className="form-help">
                      Najmanji dozvoljeni iznos porudžbine.
                    </p>
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="delivery-fee">
                      Cena dostave
                      <span className="form-label__required">*</span>
                    </label>

                    <div className="admin-settings-money-control">
                      <input
                        id="delivery-fee"
                        className="form-control"
                        type="number"
                        min="0"
                        step="1"
                        value={form.deliveryFee}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,

                            deliveryFee: event.target.value,
                          }))
                        }
                      />

                      <span>RSD</span>
                    </div>

                    <p className="form-help">
                      Unesite 0 za besplatnu standardnu dostavu.
                    </p>
                  </div>

                  <div className="form-field admin-settings-delivery-fields__wide">
                    <label
                      className="form-label"
                      htmlFor="free-delivery-threshold"
                    >
                      Besplatna dostava preko
                      <span className="form-label__optional">opciono</span>
                    </label>

                    <div className="admin-settings-money-control">
                      <input
                        id="free-delivery-threshold"
                        className="form-control"
                        type="number"
                        min="1"
                        step="1"
                        value={form.freeDeliveryThreshold}
                        placeholder="Nema praga"
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,

                            freeDeliveryThreshold: event.target.value,
                          }))
                        }
                      />

                      <span>RSD</span>
                    </div>

                    <p className="form-help">
                      Ostavite prazno ako nema automatske besplatne dostave.
                    </p>
                  </div>
                </div>

                <section
                  className={[
                    "admin-settings-delivery-toggle",
                    !form.isDeliveryEnabled
                      ? "admin-settings-delivery-toggle--disabled"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="admin-settings-delivery-toggle__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M3 16h11V6H3v10Zm11-6h4l3 3v3h-7v-6Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                      />

                      <circle
                        cx="7"
                        cy="18"
                        r="2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />

                      <circle
                        cx="18"
                        cy="18"
                        r="2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                    </svg>
                  </div>

                  <div className="admin-settings-delivery-toggle__content">
                    <strong>
                      {form.isDeliveryEnabled
                        ? "Dostava je uključena"
                        : "Dostava je isključena"}
                    </strong>

                    <p>
                      {form.isDeliveryEnabled
                        ? "Kupci mogu da izaberu dostavu na adresu."
                        : "Kupci trenutno ne mogu da koriste dostavu."}
                    </p>
                  </div>

                  <label className="admin-settings-switch">
                    <input
                      type="checkbox"
                      checked={form.isDeliveryEnabled}
                      aria-label="Omogući dostavu"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,

                          isDeliveryEnabled: event.target.checked,
                        }))
                      }
                    />

                    <span
                      className="admin-settings-switch__control"
                      aria-hidden="true"
                    >
                      <span className="admin-settings-switch__thumb" />
                    </span>
                  </label>
                </section>
              </section>
            )}

            {activeTab === "workingHours" && (
              <section
                id="working-hours-settings-panel"
                className="admin-settings-tab-panel"
                role="tabpanel"
                aria-labelledby="working-hours-settings-tab"
              >
                <header className="admin-settings-tab-panel__header">
                  <span className="admin-settings-tab-panel__eyebrow">
                    RADNO VREME
                  </span>

                  <h3 className="admin-settings-tab-panel__title">
                    Nedeljni raspored
                  </h3>

                  <p className="admin-settings-tab-panel__description">
                    Radno vreme važi za dostavu i lično preuzimanje.
                  </p>
                </header>

                <div className="admin-settings-working-hours">
                  <div className="admin-settings-working-hours__head">
                    <span>Dan</span>
                    <span>Otvaranje</span>
                    <span>Zatvaranje</span>
                    <span>Preko ponoći</span>
                    <span>Zatvoreno</span>
                  </div>

                  <div className="admin-settings-working-hours__list">
                    {form.workingHours.map((day) => (
                      <article
                        key={day.dayOfWeek}
                        className={[
                          "admin-settings-working-day",
                          day.isClosed
                            ? "admin-settings-working-day--closed"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="admin-settings-working-day__name">
                          <strong>{day.dayName}</strong>

                          <span>{formatWorkingHourPreview(day)}</span>
                        </div>

                        <label className="admin-settings-working-day__time">
                          <span>Otvaranje</span>

                          <input
                            type="time"
                            value={day.openTime}
                            disabled={day.isClosed}
                            onChange={(event) =>
                              updateWorkingHour(day.dayOfWeek, {
                                openTime: event.target.value,
                              })
                            }
                          />
                        </label>

                        <label className="admin-settings-working-day__time">
                          <span>Zatvaranje</span>

                          <input
                            type="time"
                            value={day.closeTime}
                            disabled={day.isClosed}
                            onChange={(event) =>
                              updateWorkingHour(day.dayOfWeek, {
                                closeTime: event.target.value,
                              })
                            }
                          />
                        </label>

                        <label
                          className={[
                            "admin-settings-working-day__check",
                            day.closesNextDay
                              ? "admin-settings-working-day__check--active"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={day.closesNextDay}
                            disabled={day.isClosed}
                            onChange={(event) =>
                              updateWorkingHour(day.dayOfWeek, {
                                closesNextDay: event.target.checked,
                              })
                            }
                          />

                          <span>{day.closesNextDay ? "Da" : "Ne"}</span>
                        </label>

                        <label
                          className={[
                            "admin-settings-working-day__check",
                            "admin-settings-working-day__check--closed",
                            day.isClosed
                              ? "admin-settings-working-day__check--active"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={day.isClosed}
                            onChange={(event) =>
                              updateWorkingHour(day.dayOfWeek, {
                                isClosed: event.target.checked,
                              })
                            }
                          />

                          <span>{day.isClosed ? "Da" : "Ne"}</span>
                        </label>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <footer className="admin-settings-editor__footer">
              <div className="admin-settings-editor__updated">
                <span>Poslednja sačuvana izmena</span>

                <strong>{formatDate(updatedAt)}</strong>
              </div>
            </footer>
          </section>

          <aside className="admin-settings-preview">
            <header className="admin-settings-preview__header">
              <span className="admin-settings-preview__eyebrow">PREGLED</span>

              <h2 className="admin-settings-preview__title">
                {activeTab === "delivery"
                  ? "Kako kupac vidi pravila"
                  : "Radno vreme restorana"}
              </h2>

              <p className="admin-settings-preview__description">
                Pregled prati izmene odmah, ali one nisu aktivne dok ih ne
                sačuvate.
              </p>
            </header>

            {activeTab === "delivery" ? (
              <>
                <div
                  className={[
                    "admin-settings-delivery-status",
                    form.isDeliveryEnabled
                      ? "admin-settings-delivery-status--active"
                      : "admin-settings-delivery-status--inactive",
                  ].join(" ")}
                >
                  <span className="admin-settings-delivery-status__dot" />

                  <div>
                    <strong>
                      {form.isDeliveryEnabled
                        ? "Dostava je dostupna"
                        : "Dostava je isključena"}
                    </strong>

                    <p>
                      {form.isDeliveryEnabled
                        ? "Kupci mogu da poruče hranu na svoju adresu."
                        : "Dostava trenutno nije ponuđena pri poručivanju."}
                    </p>
                  </div>
                </div>

                <div className="admin-settings-preview__rules">
                  <article className="admin-settings-rule">
                    <span className="admin-settings-rule__number">01</span>

                    <div>
                      <strong>Minimalna porudžbina</strong>

                      <p>
                        Korpa mora imati najmanje{" "}
                        <b>{formatAmount(preview.minimumOrderAmount)}</b>.
                      </p>
                    </div>
                  </article>

                  <article className="admin-settings-rule">
                    <span className="admin-settings-rule__number">02</span>

                    <div>
                      <strong>Cena dostave</strong>

                      <p>
                        Standardna dostava košta{" "}
                        <b>{formatAmount(preview.deliveryFee)}</b>.
                      </p>
                    </div>
                  </article>

                  <article className="admin-settings-rule">
                    <span className="admin-settings-rule__number">03</span>

                    <div>
                      <strong>Besplatna dostava</strong>

                      <p>
                        {preview.freeDeliveryThreshold === null ? (
                          "Automatska besplatna dostava nije omogućena."
                        ) : (
                          <>
                            Dostava postaje besplatna preko{" "}
                            <b>{formatAmount(preview.freeDeliveryThreshold)}</b>
                            .
                          </>
                        )}
                      </p>
                    </div>
                  </article>
                </div>
              </>
            ) : (
              <>
                <div className="admin-settings-hours-summary">
                  <div>
                    <span>Radnih dana</span>

                    <strong>{scheduleSummary.openDays}</strong>
                  </div>

                  <div>
                    <span>Zatvorenih</span>

                    <strong>{scheduleSummary.closedDays}</strong>
                  </div>

                  <div>
                    <span>Preko ponoći</span>

                    <strong>{scheduleSummary.overnightDays}</strong>
                  </div>
                </div>

                <div className="admin-settings-working-preview">
                  {preview.workingHours.map((day) => (
                    <div
                      key={day.dayOfWeek}
                      className={[
                        "admin-settings-working-preview__row",
                        day.isClosed
                          ? "admin-settings-working-preview__row--closed"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span>{day.dayName}</span>

                      <strong>{formatWorkingHourPreview(day)}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}

            {preview.freeDeliveryThreshold !== null &&
              preview.minimumOrderAmount !== null &&
              preview.freeDeliveryThreshold < preview.minimumOrderAmount && (
                <div className="admin-settings-preview__warning">
                  <strong>Proverite iznose</strong>

                  <p>
                    Prag besplatne dostave je niži od minimalnog iznosa
                    porudžbine.
                  </p>
                </div>
              )}
          </aside>
        </div>

        <div
          className={[
            "admin-settings-actions",
            hasUnsavedChanges ? "admin-settings-actions--visible" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="admin-settings-actions__status">
            <span className="admin-settings-actions__dot" aria-hidden="true" />

            <div>
              <strong>
                {hasUnsavedChanges
                  ? "Imate nesačuvane izmene"
                  : "Sve izmene su sačuvane"}
              </strong>

              <span>
                {hasUnsavedChanges
                  ? "Sačuvajte ih pre napuštanja stranice."
                  : "Podešavanja su sinhronizovana sa serverom."}
              </span>
            </div>
          </div>

          <div className="admin-settings-actions__buttons">
            <button
              type="button"
              className="admin-settings-button admin-settings-button--secondary"
              disabled={!hasUnsavedChanges || saving || refreshing}
              onClick={discardChanges}
            >
              Vrati sačuvano
            </button>

            <button
              type="submit"
              className="admin-settings-button admin-settings-button--primary"
              disabled={!hasUnsavedChanges || saving || refreshing}
            >
              {saving ? (
                <>
                  <span
                    className="admin-settings-button__spinner"
                    aria-hidden="true"
                  />
                  Čuvam...
                </>
              ) : (
                "Sačuvaj podešavanja"
              )}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
