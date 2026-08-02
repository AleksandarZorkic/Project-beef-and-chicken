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
} from "../api/restaurantSettingsApi";
import { getApiErrorMessage } from "../utils/apiErrors";
import "../styles/AdminRestaurantSettingsPage.scss";

type SettingsFormState = {
  minimumOrderAmount: string;
  deliveryFee: string;
  freeDeliveryThreshold: string;
  isDeliveryEnabled: boolean;
};

const emptyForm: SettingsFormState = {
  minimumOrderAmount: "800",
  deliveryFee: "200",
  freeDeliveryThreshold: "2500",
  isDeliveryEnabled: true,
};

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

export default function AdminRestaurantSettingsPage() {
  const [form, setForm] = useState<SettingsFormState>(emptyForm);

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

      setForm({
        minimumOrderAmount: String(settings.minimumOrderAmount),
        deliveryFee: String(settings.deliveryFee),
        freeDeliveryThreshold:
          settings.freeDeliveryThreshold === null ||
          settings.freeDeliveryThreshold === undefined
            ? ""
            : String(settings.freeDeliveryThreshold),
        isDeliveryEnabled: settings.isDeliveryEnabled,
      });

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
    };
  }, [form.minimumOrderAmount, form.deliveryFee, form.freeDeliveryThreshold]);

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

    const payload = {
      minimumOrderAmount: Number(form.minimumOrderAmount),
      deliveryFee: Number(form.deliveryFee),
      freeDeliveryThreshold: form.freeDeliveryThreshold.trim()
        ? Number(form.freeDeliveryThreshold)
        : null,
      isDeliveryEnabled: form.isDeliveryEnabled,
    };

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updated = await updateRestaurantSettings(payload);

      setUpdatedAt(updated.updatedAt);

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
          onClick={() => void loadSettings(false)}
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
              <label className="form-label" htmlFor="free-delivery-threshold">
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
                Ostavite prazno ako restoran nikada ne daje besplatnu dostavu.
              </p>
            </div>

            <section className="admin-settings-delivery-toggle">
              <div className="admin-settings-delivery-toggle__content">
                <strong>Dostava je trenutno dostupna</strong>

                <p>
                  Kada je isključena, kupci ne mogu da izaberu dostavu prilikom
                  poručivanja.
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

            <div className="admin-settings-form__updated">
              <span>Poslednja izmena</span>
              <strong>{formatDate(updatedAt)}</strong>
            </div>

            <div className="admin-settings-form__actions">
              <button
                type="submit"
                className="admin-settings-button admin-settings-button--primary"
                disabled={saving || refreshing}
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

              <button
                type="button"
                className="admin-settings-button admin-settings-button--secondary"
                disabled={saving || refreshing}
                onClick={() => void loadSettings(false)}
              >
                Poništi izmene
              </button>
            </div>
          </form>
        </section>

        <aside className="admin-settings-preview">
          <header className="admin-settings-preview__header">
            <span className="admin-settings-preview__eyebrow">
              PREGLED ZA KUPCA
            </span>

            <h2 className="admin-settings-preview__title">
              Kako pravila trenutno rade
            </h2>

            <p className="admin-settings-preview__description">
              Ovaj prikaz se menja odmah dok unosite vrednosti. Podešavanja se
              ne primenjuju dok ne kliknete na čuvanje.
            </p>
          </header>

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
