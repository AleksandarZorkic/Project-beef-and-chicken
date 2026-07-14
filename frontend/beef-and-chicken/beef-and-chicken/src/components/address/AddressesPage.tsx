import { useEffect, useState } from "react";
import AddressForm from "./AddressForm";
import {
  getAllAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  type AddressDto,
  type AddressUpsertDto,
} from "../../api/addressApi";
import { useAuth } from "../../auth/AuthContext";

const emptyAddress: AddressUpsertDto = {
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  label: "",
  note: "",
  isDefault: false,
};

function getErrorMessage(e: any, fallback: string) {
  return (
    e?.response?.data?.error ??
    e?.response?.data?.message ??
    e?.response?.data?.title ??
    e?.message ??
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
    return <div>Niste prijavljeni</div>;
  }

  async function loadAddresses() {
    try {
      setError(null);
      setLoading(true);

      const data = await getAllAddresses();
      setAddresses(data);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri učitavanju adresa."));
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
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri čuvanju adrese."));
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
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri brisanju adrese."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <h2>Moje adrese</h2>

      <button type="button" onClick={openCreateForm}>
        Dodaj novu adresu
      </button>

      {successMessage && (
        <div
          style={{
            color: "green",
            marginTop: 12,
            padding: 10,
            border: "1px solid green",
            borderRadius: 8,
            background: "#f0fff0",
          }}
        >
          {successMessage}
        </div>
      )}

      {error && (
        <div
          style={{
            color: "crimson",
            marginTop: 12,
            padding: 10,
            border: "1px solid crimson",
            borderRadius: 8,
            background: "#fff5f5",
          }}
        >
          {error}
        </div>
      )}

      {showForm && (
        <AddressForm
          value={formValue}
          onChange={setFormValue}
          onSubmit={handleSave}
          saving={saving}
          title={editingAddressId === null ? "Nova adresa" : "Izmeni adresu"}
          submitLabel={
            editingAddressId === null ? "Dodaj adresu" : "Sačuvaj izmene"
          }
        />
      )}

      {loading ? (
        <div style={{ marginTop: 16 }}>Učitavam adrese...</div>
      ) : addresses.length === 0 ? (
        <div style={{ marginTop: 16 }}>Nema sačuvanih adresa.</div>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {addresses.map((address) => (
            <div
              key={address.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>
                  {address.label?.trim() ? address.label : "Adresa"}
                  {address.isDefault && (
                    <span style={{ color: "green", marginLeft: 8 }}>
                      (Podrazumevana)
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 8 }}>
                  {address.street} {address.houseNumber}
                </div>

                <div>
                  {address.postalCode ? `${address.postalCode} ` : ""}
                  {address.city}
                </div>

                {address.note && (
                  <div style={{ marginTop: 6, fontStyle: "italic" }}>
                    Napomena: {address.note}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <button type="button" onClick={() => openEditForm(address)}>
                  Izmeni
                </button>

                <button
                  type="button"
                  disabled={deletingId === address.id}
                  onClick={() => handleDelete(address.id)}
                >
                  {deletingId === address.id ? "Brišem..." : "Obriši"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
