import { FormEvent, useEffect, useState } from "react";
import {
  getAdminRestaurantSettings,
  updateRestaurantSettings,
} from "../api/restaurantSettingsApi";
import { getApiErrorMessage } from "../utils/apiErrors";

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

function formatDate(value?: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString("sr-RS");
}

export default function AdminRestaurantSettingsPage() {
  const [form, setForm] = useState<SettingsFormState>(emptyForm);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);

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
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
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
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div>Učitavam podešavanja restorana...</div>;
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Podešavanja porudžbina</h2>

      <p style={{ color: "#555" }}>
        Ovde admin podešava minimalnu vrednost porudžbine, cenu dostave,
        besplatnu dostavu i dostupnost dostave.
      </p>

      {error && (
        <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>
      )}

      {successMessage && (
        <div style={{ color: "green", marginBottom: 12 }}>{successMessage}</div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 16,
          display: "grid",
          gap: 14,
          background: "white",
        }}
      >
        <label>
          Minimalna porudžbina / RSD
          <input
            type="number"
            min="0"
            step="1"
            value={form.minimumOrderAmount}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                minimumOrderAmount: e.target.value,
              }))
            }
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label>
          Cena dostave / RSD
          <input
            type="number"
            min="0"
            step="1"
            value={form.deliveryFee}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                deliveryFee: e.target.value,
              }))
            }
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label>
          Besplatna dostava preko / RSD
          <input
            type="number"
            min="0"
            step="1"
            value={form.freeDeliveryThreshold}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                freeDeliveryThreshold: e.target.value,
              }))
            }
            placeholder="Ostavi prazno ako nema besplatne dostave"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
          <span style={{ color: "#777", fontSize: 13 }}>
            Ostavi prazno ako restoran nikad ne daje besplatnu dostavu.
          </span>
        </label>

        <label>
          <input
            type="checkbox"
            checked={form.isDeliveryEnabled}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                isDeliveryEnabled: e.target.checked,
              }))
            }
          />{" "}
          Dostava je trenutno dostupna
        </label>

        <div style={{ fontSize: 13, color: "#666" }}>
          Poslednja izmena: {formatDate(updatedAt ?? undefined)}
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Čuvam..." : "Sačuvaj podešavanja"}
        </button>
      </form>
    </div>
  );
}
