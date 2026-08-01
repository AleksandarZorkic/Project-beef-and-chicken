import { useEffect, useState } from "react";
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
import "../styles/AddressesPage.scss";

const emptyAddress: AddressUpsertDto = {
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  label: "",
  note: "",
  isDefault: false,
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

export default function AddressesPage() {
  const { user } = useAuth();

  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [formValue, setFormValue] = useState<AddressUpsertDto>(emptyAddress);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadAddresses();
  }, [user]);

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [successMessage]);

  if (!user) {
    return (
      <main className="addresses-state">
        <section className="addresses-state__card">
          <span className="addresses-state__eyebrow">PRIJAVA JE POTREBNA</span>

          <h1 className="addresses-state__title">Niste prijavljeni</h1>

          <p className="addresses-state__description">
            Prijavite se kako biste upravljali svojim adresama.
          </p>
        </section>
      </main>
    );
  }

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
    setFormValue(emptyAddress);
    setShowForm(true);
  }

  function closeAddressForm() {
    setShowForm(false);
    setEditingAddressId(null);
    setFormValue(emptyAddress);
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

    if (!street) return "Ulica je obavezna.";
    if (!houseNumber) return "Broj je obavezan.";
    if (!city) return "Grad je obavezan.";

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
        setSuccessMessage("Adresa je uspešno dodata.");
      } else {
        await updateAddress(editingAddressId, normalizeAddress(formValue));
        setSuccessMessage("Adresa je uspešno izmenjena.");
      }

      await loadAddresses();

      setShowForm(false);
      setEditingAddressId(null);
      setFormValue(emptyAddress);
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri čuvanju adrese."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(addressId: number) {
    const confirmed = window.confirm(
      "Da li sigurno želite da obrišete ovu adresu?",
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);
      setDeletingId(addressId);

      await deleteAddress(addressId);
      await loadAddresses();

      setSuccessMessage("Adresa je uspešno obrisana.");

      if (editingAddressId === addressId) {
        setEditingAddressId(null);
        setShowForm(false);
        setFormValue(emptyAddress);
      }
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri brisanju adrese."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="addresses-page">
      <header className="addresses-page__header">
        <div className="addresses-page__heading">
          <span className="addresses-page__eyebrow">ADRESE ZA DOSTAVU</span>

          <h1 className="addresses-page__title">Moje adrese</h1>

          <p className="addresses-page__description">
            Sačuvajte adrese koje najčešće koristite kako biste brže završili
            sledeću porudžbinu.
          </p>
        </div>

        <div className="addresses-page__header-actions">
          <div className="addresses-page__count">
            <strong>{addresses.length}</strong>

            <span>
              {addresses.length === 1 ? "sačuvana adresa" : "sačuvane adrese"}
            </span>
          </div>

          <button
            type="button"
            className="addresses-page__add-button"
            onClick={openCreateForm}
          >
            <span className="addresses-page__add-icon" aria-hidden="true">
              +
            </span>

            <span>Dodaj novu adresu</span>
          </button>
        </div>
      </header>

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
            <strong>Uspešno</strong>
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
            <div className="addresses-form-panel__icon" aria-hidden="true">
              {editingAddressId === null ? "+" : "✎"}
            </div>

            <div>
              <span className="addresses-form-panel__eyebrow">
                {editingAddressId === null
                  ? "NOVA LOKACIJA"
                  : "IZMENA PODATAKA"}
              </span>

              <h2
                id="address-form-panel-title"
                className="addresses-form-panel__title"
              >
                {editingAddressId === null
                  ? "Dodajte adresu"
                  : "Izmenite adresu"}
              </h2>

              <p className="addresses-form-panel__description">
                Unesite tačne podatke kako bi dostava stigla bez zadržavanja.
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
                editingAddressId === null ? "Dodaj adresu" : "Sačuvaj izmene"
              }
            />
          </div>
        </section>
      )}

      {loading ? (
        <section className="addresses-loading" aria-live="polite">
          <span className="addresses-loading__spinner" aria-hidden="true" />

          <div>
            <strong>Učitavamo adrese</strong>

            <p>Sačekajte trenutak dok preuzmemo vaše podatke.</p>
          </div>
        </section>
      ) : addresses.length === 0 ? (
        <section className="addresses-empty">
          <div className="addresses-empty__logo-shell" aria-hidden="true">
            <img src="/logo.png" alt="" className="addresses-empty__logo" />
          </div>

          <span className="addresses-empty__eyebrow">
            NEMA SAČUVANIH ADRESA
          </span>

          <h2 className="addresses-empty__title">Dodajte prvu adresu</h2>

          <p className="addresses-empty__description">
            Sačuvana adresa olakšava poručivanje i omogućava vam da checkout
            završite mnogo brže.
          </p>

          <button
            type="button"
            className="addresses-empty__button"
            onClick={openCreateForm}
          >
            <span>Dodaj adresu</span>
            <span aria-hidden="true">→</span>
          </button>
        </section>
      ) : (
        <section className="addresses-grid" aria-label="Sačuvane adrese">
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
                  <div
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
                  </div>

                  <div>
                    <span className="address-card__eyebrow">
                      ADRESA ZA DOSTAVU
                    </span>

                    <h2 className="address-card__title">
                      {address.label?.trim() ? address.label : "Adresa"}
                    </h2>
                  </div>
                </div>

                {address.isDefault && (
                  <span className="address-card__default-badge">
                    <span
                      className="address-card__default-dot"
                      aria-hidden="true"
                    />
                    Podrazumevana
                  </span>
                )}
              </header>

              <div className="address-card__body">
                <div className="address-card__address">
                  <strong>
                    {address.street} {address.houseNumber}
                  </strong>

                  <span>
                    {address.postalCode ? `${address.postalCode} ` : ""}
                    {address.city}
                  </span>
                </div>

                {address.note && (
                  <div className="address-card__note">
                    <span className="address-card__note-label">Napomena</span>

                    <p>{address.note}</p>
                  </div>
                )}
              </div>

              <footer className="address-card__actions">
                <button
                  type="button"
                  className="address-card__edit-button"
                  onClick={() => openEditForm(address)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="address-card__action-icon"
                    aria-hidden="true"
                  >
                    <path
                      d="m14.5 5.5 4 4M4 20l4.2-1 10.3-10.3a1.4 1.4 0 0 0 0-2l-1.2-1.2a1.4 1.4 0 0 0-2 0L5 15.8 4 20Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <span>Izmeni</span>
                </button>

                <button
                  type="button"
                  className="address-card__delete-button"
                  disabled={deletingId === address.id}
                  onClick={() => handleDelete(address.id)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="address-card__action-icon"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <span>
                    {deletingId === address.id ? "Brišem..." : "Obriši"}
                  </span>
                </button>
              </footer>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
