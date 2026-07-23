import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activateCategory,
  createCategory,
  deactivateCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
  type CategoryDto,
} from "../api/categoryApi";

type CategoryFilter = "all" | "active" | "inactive";

type CategoryFormState = {
  name: string;
  description: string;
  sortOrder: string;
};

const emptyForm: CategoryFormState = {
  name: "",
  description: "",
  sortOrder: "0",
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

function formatStatus(category: CategoryDto) {
  return category.isActive ? "Aktivna" : "Neaktivna";
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const data = await getAdminCategories();
      setCategories(data);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri učitavanju kategorija."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [successMessage]);

  const visibleCategories = useMemo(() => {
    const filtered = categories.filter((category) => {
      if (filter === "active") return category.isActive;
      if (filter === "inactive") return !category.isActive;

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.name.localeCompare(b.name, "sr-RS");
    });
  }, [categories, filter]);

  function resetForm() {
    setForm(emptyForm);
    setEditingCategoryId(null);
  }

  function startEdit(category: CategoryDto) {
    setEditingCategoryId(category.id);

    setForm({
      name: category.name,
      description: category.description ?? "",
      sortOrder: String(category.sortOrder),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const sortOrder = Number(form.sortOrder);

    if (!form.name.trim()) {
      setError("Naziv kategorije je obavezan.");
      return;
    }

    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      setError("Redosled mora biti broj veći ili jednak 0.");
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setSaving(true);

      const dto = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        sortOrder,
      };

      if (editingCategoryId) {
        await updateCategory(editingCategoryId, dto);
        setSuccessMessage("Kategorija je uspešno izmenjena.");
      } else {
        await createCategory(dto);
        setSuccessMessage("Kategorija je uspešno kreirana.");
      }

      resetForm();
      await loadCategories();
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri čuvanju kategorije."));
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(category: CategoryDto) {
    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(category.id);

      await activateCategory(category.id);
      await loadCategories();

      setSuccessMessage(`Kategorija "${category.name}" je aktivirana.`);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri aktiviranju kategorije."));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDeactivate(category: CategoryDto) {
    const confirmed = window.confirm(
      `Da li želiš da deaktiviraš kategoriju "${category.name}"? Jela iz te kategorije se neće prikazivati kupcima.`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(category.id);

      await deactivateCategory(category.id);
      await loadCategories();

      setSuccessMessage(`Kategorija "${category.name}" je deaktivirana.`);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri deaktiviranju kategorije."));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(category: CategoryDto) {
    const confirmed = window.confirm(
      `Da li želiš trajno da obrišeš kategoriju "${category.name}"?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(category.id);

      await deleteCategory(category.id);
      await loadCategories();

      if (editingCategoryId === category.id) {
        resetForm();
      }

      setSuccessMessage(`Kategorija "${category.name}" je obrisana.`);
    } catch (e: any) {
      setError(
        getErrorMessage(
          e,
          "Greška pri brisanju kategorije. Ako ima povezana jela, deaktiviraj je umesto brisanja.",
        ),
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div>
      <h2>Upravljanje kategorijama</h2>

      <div style={{ color: "#555", marginTop: 4 }}>
        Dodaj, izmeni, aktiviraj, deaktiviraj ili obriši kategorije jela.
      </div>

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

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 12,
          padding: 16,
          border: "1px solid #ccc",
          borderRadius: 10,
          marginTop: 16,
          background: "#fafafa",
        }}
      >
        <h3 style={{ margin: 0 }}>
          {editingCategoryId ? "Izmena kategorije" : "Nova kategorija"}
        </h3>

        <label>
          Naziv:
          <input
            type="text"
            value={form.name}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                name: e.target.value,
              }))
            }
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label>
          Opis:
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                description: e.target.value,
              }))
            }
            rows={3}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label>
          Redosled prikaza:
          <input
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                sortOrder: e.target.value,
              }))
            }
            style={{ display: "block", width: 120, marginTop: 4 }}
          />
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit" disabled={saving}>
            {saving
              ? "Čuvam..."
              : editingCategoryId
                ? "Sačuvaj izmene"
                : "Dodaj kategoriju"}
          </button>

          {editingCategoryId && (
            <button type="button" disabled={saving} onClick={resetForm}>
              Otkaži izmenu
            </button>
          )}
        </div>
      </form>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 18,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <strong>Filter:</strong>

        <button
          type="button"
          onClick={() => setFilter("all")}
          style={{ fontWeight: filter === "all" ? 800 : 400 }}
        >
          Sve ({categories.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("active")}
          style={{ fontWeight: filter === "active" ? 800 : 400 }}
        >
          Aktivne ({categories.filter((c) => c.isActive).length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("inactive")}
          style={{ fontWeight: filter === "inactive" ? 800 : 400 }}
        >
          Neaktivne ({categories.filter((c) => !c.isActive).length})
        </button>

        <button type="button" onClick={loadCategories} disabled={loading}>
          Osveži
        </button>
      </div>

      {loading ? (
        <div style={{ marginTop: 16 }}>Učitavam kategorije...</div>
      ) : visibleCategories.length === 0 ? (
        <div style={{ marginTop: 16 }}>Nema kategorija za izabrani filter.</div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 900,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ccc",
                    padding: 8,
                  }}
                >
                  Redosled
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ccc",
                    padding: 8,
                  }}
                >
                  Naziv
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ccc",
                    padding: 8,
                  }}
                >
                  Opis
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ccc",
                    padding: 8,
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    textAlign: "right",
                    borderBottom: "1px solid #ccc",
                    padding: 8,
                  }}
                >
                  Jela
                </th>
                <th
                  style={{
                    textAlign: "right",
                    borderBottom: "1px solid #ccc",
                    padding: 8,
                  }}
                >
                  Aktivna jela
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #ccc",
                    padding: 8,
                  }}
                >
                  Akcije
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleCategories.map((category) => {
                const isLoadingAction = actionLoadingId === category.id;

                return (
                  <tr key={category.id}>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {category.sortOrder}
                    </td>

                    <td
                      style={{
                        padding: 8,
                        borderBottom: "1px solid #eee",
                        fontWeight: 700,
                      }}
                    >
                      {category.name}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {category.description || "-"}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 999,
                          fontWeight: 700,
                          fontSize: 13,
                          background: category.isActive ? "#f6ffed" : "#fff1f0",
                          color: category.isActive ? "#237804" : "#a8071a",
                          border: category.isActive
                            ? "1px solid #b7eb8f"
                            : "1px solid #ffa39e",
                        }}
                      >
                        {formatStatus(category)}
                      </span>
                    </td>

                    <td
                      style={{
                        padding: 8,
                        borderBottom: "1px solid #eee",
                        textAlign: "right",
                      }}
                    >
                      {category.dishCount}
                    </td>

                    <td
                      style={{
                        padding: 8,
                        borderBottom: "1px solid #eee",
                        textAlign: "right",
                      }}
                    >
                      {category.activeDishCount}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        <button
                          type="button"
                          disabled={isLoadingAction || saving}
                          onClick={() => startEdit(category)}
                        >
                          Izmeni
                        </button>

                        {category.isActive ? (
                          <button
                            type="button"
                            disabled={isLoadingAction || saving}
                            onClick={() => handleDeactivate(category)}
                          >
                            {isLoadingAction ? "Radim..." : "Deaktiviraj"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isLoadingAction || saving}
                            onClick={() => handleActivate(category)}
                          >
                            {isLoadingAction ? "Radim..." : "Aktiviraj"}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={
                            isLoadingAction || saving || category.dishCount > 0
                          }
                          onClick={() => handleDelete(category)}
                          title={
                            category.dishCount > 0
                              ? "Kategorija ima povezana jela, koristi deaktivaciju."
                              : "Obriši kategoriju."
                          }
                        >
                          Obriši
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
