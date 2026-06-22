import { useEffect, useState } from "react";
import {
  createAllergen,
  deleteAllergen,
  getAllergens,
  updateAllergen,
} from "../api/allergenApi";
import type { Allergen } from "../types/allergen";
import { getApiErrorMessage } from "../utils/apiErrors";

export default function AllergensPage() {
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [name, setName] = useState("");
  const [editingAllergenId, setEditingAllergenId] = useState<number | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditing = editingAllergenId !== null;

  useEffect(() => {
    loadAllergens();
  }, []);

  async function loadAllergens() {
    try {
      setLoading(true);
      setError(null);

      const data = await getAllergens();
      setAllergens(data);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setEditingAllergenId(null);
    setError(null);
  }

  function startEdit(allergen: Allergen) {
    setEditingAllergenId(allergen.id);
    setName(allergen.name);
    setError(null);
    setSuccessMessage(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Naziv alergena je obavezan.");
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setError("Naziv alergena mora biti između 2 i 80 karaktera.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      if (isEditing) {
        const updatedAllergen = await updateAllergen(editingAllergenId, {
          name: trimmedName,
        });

        setAllergens((prev) =>
          prev.map((allergen) =>
            allergen.id === updatedAllergen.id ? updatedAllergen : allergen,
          ),
        );

        setSuccessMessage("Alergen je uspešno izmenjen.");
      } else {
        const createdAllergen = await createAllergen({
          name: trimmedName,
        });

        setAllergens((prev) => [...prev, createdAllergen]);
        setSuccessMessage("Alergen je uspešno dodat.");
      }

      resetForm();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(allergen: Allergen) {
    const confirmed = window.confirm(
      `Da li ste sigurni da želite da obrišete alergen "${allergen.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);

      await deleteAllergen(allergen.id);

      setAllergens((prev) => prev.filter((a) => a.id !== allergen.id));
      setSuccessMessage("Alergen je uspešno obrisan.");

      if (editingAllergenId === allergen.id) {
        resetForm();
      }
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Alergeni</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div>
          <input
            type="text"
            placeholder="Naziv alergena"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
              setSuccessMessage(null);
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={saving}>
            {saving
              ? "Čuvam..."
              : isEditing
                ? "Sačuvaj izmenu"
                : "Dodaj alergen"}
          </button>

          {isEditing && (
            <button type="button" onClick={resetForm} disabled={saving}>
              Otkaži
            </button>
          )}
        </div>
      </form>

      {error && <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>}

      {successMessage && (
        <div style={{ color: "green", marginTop: 12 }}>{successMessage}</div>
      )}

      <hr style={{ margin: "24px 0" }} />

      {loading && <div>Učitavam alergene...</div>}

      {!loading && allergens.length === 0 && (
        <div>Trenutno nema dodatih alergena.</div>
      )}

      {!loading && allergens.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          {allergens.map((allergen) => (
            <div
              key={allergen.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div>
                <strong>{allergen.name}</strong>
                <div style={{ fontSize: 13, color: "#666" }}>
                  ID: {allergen.id}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => startEdit(allergen)}>
                  Izmeni
                </button>

                <button type="button" onClick={() => onDelete(allergen)}>
                  Obriši
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
