import { FormEvent, useEffect, useMemo, useState } from "react";
import { getMenu } from "../api/menuApi";
import type { DishMenuDto } from "../api/menuApi";
import { getAllergens } from "../api/allergenApi";
import type { Allergen } from "../types/allergen";
import {
  activateDish,
  createDish,
  deactivateDishAdmin,
  getInactiveDishes,
  updateDish,
  uploadDishImage,
  type DishAllergenInput,
} from "../api/dishApi";
import { getApiErrorMessage } from "../utils/apiErrors";

type DishFormState = {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  isRecommended: boolean;
  recommendedSortOrder: string;
  categoryId: string;
  allergens: DishAllergenInput[];
};

const emptyForm: DishFormState = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  isRecommended: false,
  recommendedSortOrder: "0",
  categoryId: "",
  allergens: [],
};

// Privremeno, dok ne napravimo Category API/frontend.
// Ovde staviti ID-jeve koji već postoje u bazi.
const categoryOptions = [
  { id: 1, name: "Burgeri" },
  { id: 2, name: "Piletina" },
  { id: 3, name: "Prilozi" },
  { id: 4, name: "Pića" },
];

export default function AdminDishesPage() {
  const [dishes, setDishes] = useState<DishMenuDto[]>([]);
  const [inactiveDishes, setInactiveDishes] = useState<DishMenuDto[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  const [form, setForm] = useState<DishFormState>(emptyForm);
  const [editingDishId, setEditingDishId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedAllergenIds = useMemo(() => {
    return new Set(form.allergens.map((item) => item.allergenId));
  }, [form.allergens]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [activeDishesData, inactiveDishesData, allergensData] =
        await Promise.all([getMenu(), getInactiveDishes(), getAllergens()]);

      setDishes(activeDishesData);
      setInactiveDishes(inactiveDishesData);
      setAllergens(allergensData);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function clearForm() {
    setForm(emptyForm);
    setEditingDishId(null);
    setSelectedImageFile(null);
  }

  function resetForm() {
    clearForm();
    setError(null);
    setSuccessMessage(null);
  }

  function startEdit(dish: DishMenuDto) {
    setEditingDishId(dish.id);
    setSelectedImageFile(null);

    setForm({
      name: dish.name,
      description: dish.description ?? "",
      price: String(dish.price),
      imageUrl: dish.imageUrl ?? "",
      categoryId: String(dish.categoryId),
      isRecommended: dish.isRecommended,
      recommendedSortOrder: String(dish.recommendedSortOrder),
      allergens: dish.allergens.map((allergen) => ({
        allergenId: allergen.allergenId,
        isTrace: allergen.isTrace,
      })),
    });

    setError(null);
    setSuccessMessage(null);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleAllergen(allergenId: number) {
    const alreadySelected = selectedAllergenIds.has(allergenId);

    if (alreadySelected) {
      setForm((prev) => ({
        ...prev,
        allergens: prev.allergens.filter(
          (allergen) => allergen.allergenId !== allergenId,
        ),
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      allergens: [
        ...prev.allergens,
        {
          allergenId,
          isTrace: false,
        },
      ],
    }));
  }

  function toggleIsTrace(allergenId: number) {
    setForm((prev) => ({
      ...prev,
      allergens: prev.allergens.map((allergen) =>
        allergen.allergenId === allergenId
          ? {
              ...allergen,
              isTrace: !allergen.isTrace,
            }
          : allergen,
      ),
    }));
  }

  function validateForm() {
    if (!form.name.trim()) {
      return "Naziv jela je obavezan.";
    }

    if (form.name.trim().length < 2 || form.name.trim().length > 120) {
      return "Naziv jela mora imati između 2 i 120 karaktera.";
    }

    const price = Number(form.price);

    if (!Number.isFinite(price) || price <= 0) {
      return "Cena mora biti veća od 0.";
    }

    const categoryId = Number(form.categoryId);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return "Kategorija je obavezna.";
    }

    const recommendedSortOrder = Number(form.recommendedSortOrder);

    if (!Number.isInteger(recommendedSortOrder) || recommendedSortOrder < 0) {
      return "Redosled preporuke mora biti 0 ili veći ceo broj.";
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
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      imageUrl: form.imageUrl.trim() || null,
      isRecommended: form.isRecommended,
      recommendedSortOrder: Number(form.recommendedSortOrder),
      categoryId: Number(form.categoryId),
      allergens: form.allergens,
    };

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const savedDish = editingDishId
        ? await updateDish(editingDishId, payload)
        : await createDish(payload);

      if (selectedImageFile) {
        await uploadDishImage(savedDish.id, selectedImageFile);
      }

      setSuccessMessage(
        editingDishId
          ? "Jelo je uspešno izmenjeno."
          : "Jelo je uspešno dodato.",
      );

      resetForm();
      await loadData();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(dish: DishMenuDto) {
    const confirmed = window.confirm(
      `Da li sigurno želiš da deaktiviraš jelo "${dish.name}"?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);

      await deactivateDishAdmin(dish.id);

      await loadData();

      if (editingDishId === dish.id) {
        clearForm();
      }

      setSuccessMessage(`Jelo "${dish.name}" je deaktivirano.`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  if (loading) {
    return <div>Učitavam admin meni...</div>;
  }
  async function handleActivate(dish: DishMenuDto) {
    const confirmed = window.confirm(
      `Da li želiš da ponovo aktiviraš jelo "${dish.name}"?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);

      await activateDish(dish.id);

      await loadData();

      setSuccessMessage(`Jelo "${dish.name}" je ponovo aktivirano.`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <h2>Admin meni</h2>

      <p style={{ color: "#555" }}>
        Ovde možeš da dodaješ, menjaš i deaktiviraš jela iz menija.
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
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          display: "grid",
          gap: 12,
        }}
      >
        <h3>{editingDishId ? "Izmeni jelo" : "Dodaj novo jelo"}</h3>

        <label>
          Naziv jela
          <input
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Npr. Chicken Burger"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label>
          Opis
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Kratak opis jela"
            rows={3}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label>
          Cena
          <input
            type="number"
            min="0"
            step="1"
            value={form.price}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, price: e.target.value }))
            }
            placeholder="Npr. 690"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <div
          style={{
            display: "grid",
            gap: 8,
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            background: "white",
          }}
        >
          <strong>Preporuka kuće</strong>

          <label>
            <input
              type="checkbox"
              checked={form.isRecommended}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  isRecommended: e.target.checked,
                }))
              }
            />{" "}
            Prikaži ovo jelo kao preporuku kuće na homepage-u
          </label>

          <label>
            Redosled preporuke
            <input
              type="number"
              min="0"
              step="1"
              value={form.recommendedSortOrder}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  recommendedSortOrder: e.target.value,
                }))
              }
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>

          <div style={{ color: "#777", fontSize: 13 }}>
            Manji broj znači da će jelo biti prikazano ranije.
          </div>
        </div>

        <label>
          URL slike:
          <input
            value={form.imageUrl}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                imageUrl: e.target.value,
              }))
            }
            placeholder="https://..."
          />
        </label>

        <label>
          Slika sa računara:
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setSelectedImageFile(file);
            }}
          />
        </label>

        <label>
          Kategorija
          <select
            value={form.categoryId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, categoryId: e.target.value }))
            }
            style={{ display: "block", width: "100%", marginTop: 4 }}
          >
            <option value="">Izaberi kategoriju</option>

            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <strong>Alergeni</strong>

          {allergens.length === 0 && (
            <div style={{ color: "#777", marginTop: 8 }}>
              Trenutno nema alergena u sistemu.
            </div>
          )}

          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {allergens.map((allergen) => {
              const selected = selectedAllergenIds.has(allergen.id);

              const selectedAllergen = form.allergens.find(
                (item) => item.allergenId === allergen.id,
              );

              return (
                <div
                  key={allergen.id}
                  style={{
                    border: selected ? "1px solid #d9534f" : "1px solid #ddd",
                    borderRadius: 8,
                    padding: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    background: selected ? "#fff2f2" : "white",
                  }}
                >
                  <label style={{ display: "flex", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleAllergen(allergen.id)}
                    />
                    {allergen.name}
                  </label>

                  {selected && (
                    <label style={{ display: "flex", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={selectedAllergen?.isTrace ?? false}
                        onChange={() => toggleIsTrace(allergen.id)}
                      />
                      Može sadržati tragove
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={saving}>
            {saving
              ? "Čuvam..."
              : editingDishId
                ? "Sačuvaj izmene"
                : "Dodaj jelo"}
          </button>

          {editingDishId && (
            <button type="button" onClick={resetForm} disabled={saving}>
              Odustani
            </button>
          )}
        </div>
      </form>

      <h3>Trenutna aktivna jela</h3>

      {dishes.length === 0 && <div>Nema aktivnih jela u meniju.</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {dishes.map((dish) => (
          <div
            key={dish.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              display: "grid",
              gap: 8,
            }}
          >
            <div>
              <strong>{dish.name}</strong>{" "}
              <span style={{ color: "#777" }}>({dish.categoryName})</span>
            </div>

            <div>{dish.description}</div>

            <div>
              <strong>{dish.price} RSD</strong>
            </div>

            {dish.imageUrl && (
              <div style={{ color: "#777", fontSize: 13 }}>
                Slika: {dish.imageUrl}
              </div>
            )}

            <div>
              <strong>Alergeni: </strong>

              {dish.allergens.length === 0 ? (
                <span>Nema alergena</span>
              ) : (
                dish.allergens.map((allergen) => (
                  <span
                    key={allergen.allergenId}
                    style={{
                      display: "inline-block",
                      border: "1px solid #ddd",
                      borderRadius: 999,
                      padding: "2px 8px",
                      marginRight: 6,
                      marginTop: 4,
                      fontSize: 13,
                    }}
                  >
                    {allergen.allergenName}
                    {allergen.isTrace ? " — tragovi" : ""}
                  </span>
                ))
              )}
            </div>

            {dish.isRecommended && (
              <div style={{ color: "#d97706", fontWeight: 700 }}>
                Preporuka kuće · Redosled: {dish.recommendedSortOrder}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => startEdit(dish)}>
                Izmeni
              </button>

              <button type="button" onClick={() => handleDeactivate(dish)}>
                Deaktiviraj
              </button>
            </div>
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 32 }}>Deaktivirana jela</h3>

      {inactiveDishes.length === 0 && <div>Nema deaktiviranih jela.</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {inactiveDishes.map((dish) => (
          <div
            key={dish.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              display: "grid",
              gap: 8,
              opacity: 0.75,
              background: "#f7f7f7",
            }}
          >
            <div>
              <strong>{dish.name}</strong>{" "}
              <span style={{ color: "#777" }}>({dish.categoryName})</span>{" "}
              <span
                style={{
                  color: "crimson",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Deaktivirano
              </span>
            </div>

            <div>{dish.description}</div>

            <div>
              <strong>{dish.price} RSD</strong>
            </div>

            {dish.imageUrl && (
              <div style={{ color: "#777", fontSize: 13 }}>
                Slika: {dish.imageUrl}
              </div>
            )}

            <div>
              <strong>Alergeni: </strong>

              {dish.allergens.length === 0 ? (
                <span>Nema alergena</span>
              ) : (
                dish.allergens.map((allergen) => (
                  <span
                    key={allergen.allergenId}
                    style={{
                      display: "inline-block",
                      border: "1px solid #ddd",
                      borderRadius: 999,
                      padding: "2px 8px",
                      marginRight: 6,
                      marginTop: 4,
                      fontSize: 13,
                      background: "white",
                    }}
                  >
                    {allergen.allergenName}
                    {allergen.isTrace ? " — tragovi" : ""}
                  </span>
                ))
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => startEdit(dish)}>
                Izmeni
              </button>

              <button type="button" onClick={() => handleActivate(dish)}>
                Aktiviraj
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
