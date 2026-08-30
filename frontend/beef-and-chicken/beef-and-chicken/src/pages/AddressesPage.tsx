import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AddressForm from "../components/address/AddressForm";
import {
  getAllAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  type AddressDto,
  type AddressUpsertDto,
} from "../api/addressApi";
import { useAuth } from "../auth/AuthContext";
import { useAppDialog } from "../components/dialogs/AppDialogContext";
import "../styles/AddressesPage.scss";

function createEmptyAddress(): AddressUpsertDto {
  return {
    street: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    label: "",
    note: "",
    isDefault: false,
  };
}

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error ??
    error?.response?.data?.message ??
    error?.response?.data?.title ??
    error?.message ??
    fallback
  );
}

function getAddressCountLabel(count: number) {
  if (count === 1) {
    return "sačuvana adresa";
  }

  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "sačuvanih adresa";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "sačuvane adrese";
  }

  return "sačuvanih adresa";
}

export default function AddressesPage() {
  const { user } = useAuth();
  const { confirm } = useAppDialog();

  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);

  const [formValue, setFormValue] =
    useState<AddressUpsertDto>(createEmptyAddress());

  const defaultAddress = addresses.find((address) => address.isDefault) ?? null;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    void loadAddresses();
  }, [user]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  async function loadAddresses() {
    try {
      setError(null);
      setLoading(true);

      const data = await getAllAddresses();

      setAddresses(data);
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri učitavanju adresa."));
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setError(null);
    setSuccessMessage(null);

    setEditingAddressId(null);
    setFormValue(createEmptyAddress());
    setShowForm(true);
  }

  function closeAddressForm() {
    setShowForm(false);
    setEditingAddressId(null);
    setFormValue(createEmptyAddress());
    setError(null);
  }

  function openEditForm(address: AddressDto) {
    setError(null);
    setSuccessMessage(null);

    setEditingAddressId(address.id);

    setFormValue({
      street: address.street,
      houseNumber: address.houseNumber,
      postalCode: address.postalCode ?? "",
      city: address.city,
      label: address.label ?? "",
      note: address.note ?? "",
      isDefault: address.isDefault,
    });

    setShowForm(true);
  }

  function normalizeAddress(value: AddressUpsertDto): AddressUpsertDto {
    return {
      street: value.street.trim(),
      houseNumber: value.houseNumber.trim(),
      postalCode: value.postalCode?.trim() || null,
      city: value.city.trim(),
      label: value.label?.trim() || null,
      note: value.note?.trim() || null,
      isDefault: value.isDefault,
    };
  }

  function validateAddress(value: AddressUpsertDto) {
    const street = value.street.trim();
    const houseNumber = value.houseNumber.trim();
    const postalCode = value.postalCode?.trim() ?? "";
    const city = value.city.trim();
    const label = value.label?.trim() ?? "";
    const note = value.note?.trim() ?? "";

    if (!street) {
      return "Ulica je obavezna.";
    }

    if (!houseNumber) {
      return "Broj je obavezan.";
    }

    if (!city) {
      return "Grad je obavezan.";
    }

    if (street.length > 100) {
      return "Naziv ulice može imati najviše 100 karaktera.";
    }

    if (houseNumber.length > 20) {
      return "Kućni broj može imati najviše 20 karaktera.";
    }

    if (postalCode.length > 20) {
      return "Poštanski broj može imati najviše 20 karaktera.";
    }

    if (city.length > 100) {
      return "Naziv grada može imati najviše 100 karaktera.";
    }

    if (label.length > 50) {
      return "Naziv adrese može imati najviše 50 karaktera.";
    }

    if (note.length > 200) {
      return "Napomena može imati najviše 200 karaktera.";
    }

    return null;
  }

  async function handleSave() {
    setError(null);
    setSuccessMessage(null);

    const validationError = validateAddress(formValue);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      if (editingAddressId === null) {
        await createAddress(normalizeAddress(formValue));

        setSuccessMessage("Nova adresa je uspešno sačuvana.");
      } else {
        await updateAddress(editingAddressId, normalizeAddress(formValue));

        setSuccessMessage("Podaci adrese su uspešno izmenjeni.");
      }

      await loadAddresses();

      setShowForm(false);
      setEditingAddressId(null);
      setFormValue(createEmptyAddress());
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri čuvanju adrese."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(address: AddressDto) {
    const addressName =
      address.label?.trim() ||
      `${address.street} ${address.houseNumber}`.trim();

    const confirmed = await confirm({
      title: "Brisanje adrese",
      message: (
        <p>
          Da li sigurno želite da obrišete adresu <strong>{addressName}</strong>
          ? Ovu radnju nije moguće poništiti.
        </p>
      ),
      confirmText: "Obriši adresu",
      cancelText: "Odustani",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setDeletingId(address.id);

      await deleteAddress(address.id);
      await loadAddresses();

      setSuccessMessage("Adresa je uspešno obrisana.");

      if (editingAddressId === address.id) {
        setEditingAddressId(null);
        setShowForm(false);
        setFormValue(createEmptyAddress());
      }
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri brisanju adrese."));
    } finally {
      setDeletingId(null);
    }
  }

  if (!user) {
    return (
      <main className="addresses-guest">
        <section className="addresses-guest__card">
          <div className="addresses-guest__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <circle
                cx="12"
                cy="9"
                r="2.3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </div>

          <span className="addresses-guest__eyebrow">PRIJAVA JE POTREBNA</span>

          <h1>Niste prijavljeni</h1>

          <p>
            Prijavite se kako biste sačuvali adrese i ubrzali sledeću
            porudžbinu.
          </p>

          <Link to="/login" className="btn btn--primary">
            Prijavi se
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="addresses-page">
      <section className="addresses-hero">
        <div className="addresses-hero__content">
          <span className="addresses-hero__eyebrow">DOSTAVA PO VAŠOJ MERI</span>

          <h1 className="addresses-hero__title">Moje adrese</h1>

          <p className="addresses-hero__description">
            Sačuvajte lokacije na koje najčešće poručujete i završite sledeću
            porudžbinu bez ponovnog unošenja podataka.
          </p>

          <div className="addresses-hero__note">
            <span className="addresses-hero__note-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <circle
                  cx="12"
                  cy="9"
                  r="2.3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
            </span>

            <span>
              Podrazumevana adresa će biti automatski ponuđena prilikom
              poručivanja.
            </span>
          </div>
        </div>

        <aside className="addresses-summary">
          <div className="addresses-summary__top">
            <span className="addresses-summary__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <circle
                  cx="12"
                  cy="9"
                  r="2.3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
            </span>

            <span
              className={[
                "addresses-summary__status",
                defaultAddress ? "addresses-summary__status--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span />

              {defaultAddress ? "Dostava spremna" : "Nema glavne adrese"}
            </span>
          </div>

          <div className="addresses-summary__count">
            <strong>{loading ? "—" : addresses.length}</strong>

            <span>
              {loading ? "učitavanje" : getAddressCountLabel(addresses.length)}
            </span>
          </div>

          <div className="addresses-summary__default">
            <span>Podrazumevana adresa</span>

            <strong>
              {loading
                ? "Učitavanje..."
                : defaultAddress
                  ? defaultAddress.label?.trim() ||
                    `${defaultAddress.street} ${defaultAddress.houseNumber}`
                  : "Nije izabrana"}
            </strong>

            {defaultAddress && (
              <small>
                {defaultAddress.street} {defaultAddress.houseNumber},{" "}
                {defaultAddress.city}
              </small>
            )}
          </div>
        </aside>
      </section>

      {successMessage && (
        <div
          className="addresses-alert addresses-alert--success"
          role="status"
          aria-live="polite"
        >
          <span className="addresses-alert__icon" aria-hidden="true">
            ✓
          </span>

          <div>
            <strong>Promena je sačuvana</strong>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="addresses-alert addresses-alert--error" role="alert">
          <span className="addresses-alert__icon" aria-hidden="true">
            !
          </span>

          <div>
            <strong>Proverite podatke</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {showForm && (
        <section
          className="addresses-form-panel"
          aria-labelledby="address-form-panel-title"
        >
          <header className="addresses-form-panel__header">
            <span className="addresses-form-panel__icon" aria-hidden="true">
              {editingAddressId === null ? "+" : "✎"}
            </span>

            <div>
              <span className="addresses-form-panel__eyebrow">
                {editingAddressId === null ? "NOVA LOKACIJA" : "IZMENA ADRESE"}
              </span>

              <h2 id="address-form-panel-title">
                {editingAddressId === null
                  ? "Dodajte novu adresu"
                  : "Izmenite adresu"}
              </h2>

              <p>
                Unesite tačne podatke kako bi vaša dostava stigla brzo i bez
                nepotrebnog zadržavanja.
              </p>
            </div>
          </header>

          <div className="addresses-form-panel__content">
            <AddressForm
              value={formValue}
              onChange={setFormValue}
              onSubmit={handleSave}
              onCancel={closeAddressForm}
              saving={saving}
              title={
                editingAddressId === null ? "Nova adresa" : "Izmeni adresu"
              }
              submitLabel={
                editingAddressId === null ? "Sačuvaj adresu" : "Sačuvaj izmene"
              }
            />
          </div>
        </section>
      )}

      <section className="addresses-collection">
        <header className="addresses-collection__header">
          <div>
            <span className="addresses-collection__eyebrow">VAŠE LOKACIJE</span>

            <h2>Sačuvane adrese</h2>

            <p>Izaberite lokaciju koju želite da izmenite ili dodajte novu.</p>
          </div>

          <button
            type="button"
            className="addresses-collection__add-button"
            disabled={saving}
            onClick={openCreateForm}
          >
            <span aria-hidden="true">+</span>
            Dodaj novu adresu
          </button>
        </header>

        {loading ? (
          <div className="addresses-loading" aria-live="polite">
            <span className="addresses-loading__spinner" aria-hidden="true" />

            <div>
              <strong>Učitavamo vaše adrese</strong>

              <p>Još samo trenutak dok pripremimo sačuvane lokacije.</p>
            </div>
          </div>
        ) : addresses.length === 0 ? (
          <div className="addresses-empty">
            <div className="addresses-empty__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <circle
                  cx="12"
                  cy="9"
                  r="2.3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>
            </div>

            <span className="addresses-empty__eyebrow">
              JOŠ NEMA SAČUVANIH LOKACIJA
            </span>

            <h3>Dodajte prvu adresu</h3>

            <p>Sledeći put ćete moći da završite porudžbinu mnogo brže.</p>

            <button
              type="button"
              className="btn btn--primary"
              onClick={openCreateForm}
            >
              Dodaj adresu
            </button>
          </div>
        ) : (
          <div className="addresses-grid" aria-label="Sačuvane adrese">
            {addresses.map((address) => (
              <article
                key={address.id}
                className={[
                  "address-card",
                  address.isDefault ? "address-card--default" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <header className="address-card__header">
                  <div className="address-card__identity">
                    <span
                      className="address-card__location-icon"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        <circle
                          cx="12"
                          cy="9"
                          r="2.3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />
                      </svg>
                    </span>

                    <div>
                      <span className="address-card__eyebrow">
                        ADRESA ZA DOSTAVU
                      </span>

                      <h3 className="address-card__title">
                        {address.label?.trim() || "Sačuvana adresa"}
                      </h3>
                    </div>
                  </div>

                  {address.isDefault && (
                    <span className="address-card__default-badge">
                      <span aria-hidden="true" />
                      Podrazumevana
                    </span>
                  )}
                </header>

                <div className="address-card__body">
                  <div className="address-card__primary-address">
                    <strong>
                      {address.street} {address.houseNumber}
                    </strong>

                    <span>
                      {address.postalCode ? `${address.postalCode} ` : ""}
                      {address.city}
                    </span>
                  </div>

                  {address.note?.trim() && (
                    <div className="address-card__note">
                      <span>NAPOMENA ZA DOSTAVU</span>
                      <p>{address.note}</p>
                    </div>
                  )}
                </div>

                <footer className="address-card__actions">
                  <button
                    type="button"
                    className="address-card__edit"
                    disabled={deletingId === address.id}
                    onClick={() => openEditForm(address)}
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
                    className="address-card__delete"
                    disabled={deletingId === address.id}
                    onClick={() => void handleDelete(address)}
                  >
                    {deletingId === address.id ? (
                      <span className="address-card__spinner" />
                    ) : (
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
                    )}

                    {deletingId === address.id ? "Brišem..." : "Obriši"}
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
