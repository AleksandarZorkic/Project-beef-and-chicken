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
    return defaultWorkingHours;
  }

  return defaultWorkingHours.map((defaultDay) => {
    const existingDay = workingHours.find(
      (item) => item.dayOfWeek === defaultDay.dayOfWeek,
    );

    if (!existingDay) {
      return defaultDay;
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

  return `${day.openTime} - ${day.closeTime}${
    day.closesNextDay ? " sutradan" : ""
  }`;
}

export default function AdminRestaurantSettingsPage() {
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

    return () => {
      window.clearTimeout(timer);
    };
  }, [successMessage]);

  const preview = useMemo(() => {
    return {
      minimumOrderAmount: parseAmount(form.minimumOrderAmount),
      deliveryFee: parseAmount(form.deliveryFee),
      freeDeliveryThreshold: parseAmount(form.freeDeliveryThreshold),
      workingHours: form.workingHours,
    };
  }, [
    form.minimumOrderAmount,
    form.deliveryFee,
    form.freeDeliveryThreshold,
    form.workingHours,
  ]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(savedForm);
  }, [form, savedForm]);

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
      if (!day.openTime || !day.closeTime) {
        return `Unesite vreme otvaranja i zatvaranja za ${day.dayName}.`;
      }

      if (day.isClosed) {
        continue;
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
      const confirmed = window.confirm(
        "Imate nesačuvane izmene. Da li želite da ih odbacite i ponovo učitate podešavanja?",
      );

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
            <strong>Učitavamo podešavanja restorana</strong>

            <p>Sačekajte trenutak.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-settings-page">
      <header className="admin-settings-page__header">
        <div className="admin-settings-page__heading">
          <span className="admin-settings-page__eyebrow">
            PRAVILA PORUČIVANJA
          </span>

          <h1 className="admin-settings-page__title">Podešavanja</h1>

          <p className="admin-settings-page__description">
            Upravljajte minimalnim iznosom porudžbine, cenom dostave, pragom za
            besplatnu dostavu i dostupnošću dostave.
          </p>
        </div>

        <button
          type="button"
          className="admin-settings-page__refresh"
          disabled={refreshing || saving}
          onClick={() => void handleReloadFromServer()}
        >
          <span
            className={[
              "admin-settings-page__refresh-icon",
              refreshing ? "admin-settings-page__refresh-icon--spinning" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            ↻
          </span>

          {refreshing ? "Osvežavam..." : "Učitaj ponovo"}
        </button>
      </header>

      <section
        className="admin-settings-stats"
        aria-label="Pregled podešavanja dostave"
      >
        <article
          className={[
            "admin-settings-stat",
            form.isDeliveryEnabled
              ? "admin-settings-stat--active"
              : "admin-settings-stat--inactive",
          ].join(" ")}
        >
          <span className="admin-settings-stat__label">Status dostave</span>

          <strong className="admin-settings-stat__value admin-settings-stat__value--text">
            {form.isDeliveryEnabled ? "Dostupna" : "Isključena"}
          </strong>

          <span className="admin-settings-stat__description">
            Trenutno stanje usluge
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
            Najmanji dozvoljeni iznos
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
              <strong>Uspešno sačuvano</strong>
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
              <strong>Došlo je do greške</strong>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="admin-settings-layout">
        <section className="admin-settings-editor">
          <header className="admin-settings-editor__header">
            <div>
              <span className="admin-settings-editor__eyebrow">
                FINANSIJSKA PRAVILA
              </span>

              <h2 className="admin-settings-editor__title">
                Podešavanja porudžbina
              </h2>
            </div>

            <span className="admin-settings-editor__status">
              {form.isDeliveryEnabled ? "Dostava radi" : "Dostava ne radi"}
            </span>
          </header>

          <form className="form admin-settings-form" onSubmit={handleSubmit}>
            <div className="admin-settings-toolbar">
              <div
                className="admin-settings-tabs"
                role="tablist"
                aria-label="Sekcija podešavanja"
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
                  Dostava i porudžbine
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
                  Radno vreme
                </button>
              </div>

              <div className="admin-settings-toolbar__actions">
                {hasUnsavedChanges && (
                  <span className="admin-settings-unsaved">
                    <span
                      className="admin-settings-unsaved__dot"
                      aria-hidden="true"
                    />
                    Imate nesačuvane izmene
                  </span>
                )}

                <button
                  type="button"
                  className="admin-settings-button admin-settings-button--secondary"
                  disabled={!hasUnsavedChanges || saving || refreshing}
                  onClick={discardChanges}
                >
                  Poništi izmene
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
                    Podesite najmanju vrednost porudžbine, cenu dostave i uslove
                    za besplatnu dostavu.
                  </p>
                </header>

                <div className="form-field">
                  <label className="form-label" htmlFor="minimum-order-amount">
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
                    Kupac ne može da završi porudžbinu ispod ovog iznosa.
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
                    Unesite 0 kada ne želite da naplaćujete dostavu.
                  </p>
                </div>

                <div className="form-field">
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
                      placeholder="Nema besplatne dostave"
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
                    Ostavite prazno ako restoran nikada ne daje besplatnu
                    dostavu.
                  </p>
                </div>

                <section className="admin-settings-delivery-toggle">
                  <div className="admin-settings-delivery-toggle__content">
                    <strong>Dostava je trenutno dostupna</strong>

                    <p>
                      Kada je isključena, kupci ne mogu da izaberu dostavu
                      prilikom poručivanja.
                    </p>
                  </div>

                  <label className="admin-settings-switch">
                    <input
                      type="checkbox"
                      checked={form.isDeliveryEnabled}
                      aria-label="Dostava je dostupna"
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
                <section className="admin-settings-working-hours">
                  <header className="admin-settings-working-hours__header">
                    <div>
                      <span className="admin-settings-working-hours__eyebrow">
                        RADNO VREME
                      </span>

                      <h3 className="admin-settings-working-hours__title">
                        Kada restoran prima porudžbine
                      </h3>

                      <p className="admin-settings-working-hours__description">
                        Radno vreme važi i za dostavu i za lično preuzimanje.
                        Kada je restoran zatvoren, kupci ne mogu da završe
                        porudžbinu.
                      </p>
                    </div>
                  </header>

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
                        <div className="admin-settings-working-day__heading">
                          <strong>{day.dayName}</strong>

                          <span>{formatWorkingHourPreview(day)}</span>
                        </div>

                        <div className="admin-settings-working-day__controls">
                          <label className="admin-settings-working-day__field">
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

                          <label className="admin-settings-working-day__field">
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

                          <label className="admin-settings-working-day__checkbox">
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

                            <span>Radi preko ponoći</span>
                          </label>

                          <label className="admin-settings-working-day__checkbox">
                            <input
                              type="checkbox"
                              checked={day.isClosed}
                              onChange={(event) =>
                                updateWorkingHour(day.dayOfWeek, {
                                  isClosed: event.target.checked,
                                })
                              }
                            />

                            <span>Zatvoreno</span>
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </section>
            )}

            <div className="admin-settings-form__updated">
              <span>Poslednja izmena</span>

              <strong>{formatDate(updatedAt)}</strong>
            </div>
          </form>
        </section>

        <aside className="admin-settings-preview">
          <header className="admin-settings-preview__header">
            <span className="admin-settings-preview__eyebrow">
              PREGLED ZA KUPCA
            </span>

            <h2 className="admin-settings-preview__title">
              {activeTab === "delivery"
                ? "Kako pravila dostave trenutno rade"
                : "Pregled radnog vremena"}
            </h2>

            <p className="admin-settings-preview__description">
              Ovaj prikaz se menja odmah dok unosite vrednosti. Podešavanja se
              ne primenjuju dok ne kliknete na čuvanje.
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
                      : "Dostava je trenutno isključena"}
                  </strong>

                  <p>
                    {form.isDeliveryEnabled
                      ? "Kupci mogu da poručuju hranu na svoju adresu."
                      : "Kupci trenutno ne mogu da izaberu dostavu."}
                  </p>
                </div>
              </div>

              <div className="admin-settings-preview__rules">
                <article className="admin-settings-rule">
                  <span className="admin-settings-rule__number">01</span>

                  <div>
                    <strong>Minimalna vrednost porudžbine</strong>

                    <p>
                      Porudžbina mora imati najmanje{" "}
                      <b>{formatAmount(preview.minimumOrderAmount)}</b>.
                    </p>
                  </div>
                </article>

                <article className="admin-settings-rule">
                  <span className="admin-settings-rule__number">02</span>

                  <div>
                    <strong>Standardna cena dostave</strong>

                    <p>
                      Dostava se standardno naplaćuje{" "}
                      <b>{formatAmount(preview.deliveryFee)}</b>.
                    </p>
                  </div>
                </article>

                <article className="admin-settings-rule">
                  <span className="admin-settings-rule__number">03</span>

                  <div>
                    <strong>Besplatna dostava</strong>

                    <p>
                      {preview.freeDeliveryThreshold === null
                        ? "Besplatna dostava trenutno nije omogućena."
                        : `Dostava je besplatna kada porudžbina dostigne ${formatAmount(
                            preview.freeDeliveryThreshold,
                          )}.`}
                    </p>
                  </div>
                </article>
              </div>
            </>
          ) : (
            <div className="admin-settings-working-preview">
              {preview.workingHours.map((day) => (
                <div
                  key={day.dayOfWeek}
                  className="admin-settings-working-preview__row"
                >
                  <span>{day.dayName}</span>

                  <strong>{formatWorkingHourPreview(day)}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="admin-settings-preview__rules">
            <article className="admin-settings-rule">
              <span className="admin-settings-rule__number">01</span>

              <div>
                <strong>Minimalna vrednost porudžbine</strong>

                <p>
                  Porudžbina mora imati najmanje{" "}
                  <b>{formatAmount(preview.minimumOrderAmount)}</b>.
                </p>
              </div>
            </article>

            <article className="admin-settings-rule">
              <span className="admin-settings-rule__number">02</span>

              <div>
                <strong>Standardna cena dostave</strong>

                <p>
                  Dostava se standardno naplaćuje{" "}
                  <b>{formatAmount(preview.deliveryFee)}</b>.
                </p>
              </div>
            </article>

            <article className="admin-settings-rule">
              <span className="admin-settings-rule__number">03</span>

              <div>
                <strong>Besplatna dostava</strong>

                <p>
                  {preview.freeDeliveryThreshold === null
                    ? "Besplatna dostava trenutno nije omogućena."
                    : `Dostava je besplatna kada porudžbina dostigne ${formatAmount(
                        preview.freeDeliveryThreshold,
                      )}.`}
                </p>
              </div>
            </article>

            <article className="admin-settings-rule">
              <span className="admin-settings-rule__number">04</span>

              <div>
                <strong>Radno vreme restorana</strong>

                <p>
                  Restoran prima porudžbine samo u podešenom radnom vremenu.
                </p>

                <div className="admin-settings-working-preview">
                  {preview.workingHours.map((day) => (
                    <div
                      key={day.dayOfWeek}
                      className="admin-settings-working-preview__row"
                    >
                      <span>{day.dayName}</span>
                      <strong>{formatWorkingHourPreview(day)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>

          {preview.freeDeliveryThreshold !== null &&
            preview.minimumOrderAmount !== null &&
            preview.freeDeliveryThreshold < preview.minimumOrderAmount && (
              <div className="admin-settings-preview__warning">
                <strong>Proverite iznose</strong>

                <p>Prag besplatne dostave je niži od minimalne porudžbine.</p>
              </div>
            )}
        </aside>
      </div>
    </main>
  );
}
