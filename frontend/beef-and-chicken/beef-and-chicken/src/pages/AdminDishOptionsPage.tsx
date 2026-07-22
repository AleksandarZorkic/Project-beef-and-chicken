import { useEffect, useState } from "react";
import {
  activateDishOption,
  createDishOption,
  deactivateDishOption,
  getAdminDishOptions,
  updateDishOption,
  type CreateDishOptionRequest,
  type DishOptionDto,
  type DishOptionType,
} from "../api/dishOptionsApi";

type DishOptionFormValue = CreateDishOptionRequest;

const emptyForm: DishOptionFormValue = {
  name: "",
  type: "SideDish",
  price: 0,
  isAlwaysPaid: false,
  sortOrder: 0,
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

function formatPrice(value: number) {
  return `${value.toLocaleString("sr-RS")} RSD`;
}

function formatType(type: DishOptionType) {
  return type === "SideDish" ? "Prilog" : "Začin";
}

function normalizeForm(value: DishOptionFormValue): DishOptionFormValue {
  const name = value.name.trim();

  if (value.type === "Spice") {
    return {
      name,
      type: "Spice",
      price: 0,
      isAlwaysPaid: false,
      sortOrder: value.sortOrder,
    };
  }

  if (!value.isAlwaysPaid) {
    return {
      name,
      type: "SideDish",
      price: 0,
      isAlwaysPaid: false,
      sortOrder: value.sortOrder,
    };
  }

  return {
    name,
    type: "SideDish",
    price: value.price,
    isAlwaysPaid: true,
    sortOrder: value.sortOrder,
  };
}

function validateForm(value: DishOptionFormValue) {
  const name = value.name.trim();

  if (!name) return "Naziv je obavezan.";

  if (name.length > 100) {
    return "Naziv može imati najviše 100 karaktera.";
  }

  if (value.price < 0) {
    return "Cena ne može biti negativna.";
  }

  if (value.sortOrder < 0) {
    return "Redosled ne može biti negativan.";
  }

  if (value.type === "Spice" && value.price !== 0) {
    return "Začin ne može imati cenu.";
  }

  if (value.type === "Spice" && value.isAlwaysPaid) {
    return "Začin ne može biti opcija koja se odmah naplaćuje.";
  }

  if (value.type === "SideDish" && value.isAlwaysPaid && value.price <= 0) {
    return "Prilog koji se odmah naplaćuje mora imati cenu veću od 0.";
  }

  return null;
}

export default function AdminDishOptionsPage() {
  const [options, setOptions] = useState<DishOptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formValue, setFormValue] = useState<DishOptionFormValue>(emptyForm);

  const [typeFilter, setTypeFilter] = useState<"all" | DishOptionType>("all");
  const [includeInactive, setIncludeInactive] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadOptions();
  }, [typeFilter, includeInactive]);

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [successMessage]);

  async function loadOptions() {
    try {
      setError(null);
      setLoading(true);

      const data = await getAdminDishOptions({
        includeInactive,
        type: typeFilter === "all" ? undefined : typeFilter,
      });

      setOptions(data);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri učitavanju opcija."));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setFormValue(emptyForm);
  }

  function handleEdit(option: DishOptionDto) {
    setError(null);
    setSuccessMessage(null);
    setEditingId(option.id);
    setFormValue({
      name: option.name,
      type: option.type,
      price: option.price,
      isAlwaysPaid: option.isAlwaysPaid,
      sortOrder: option.sortOrder,
    });
  }

  async function handleSave() {
    setError(null);
    setSuccessMessage(null);

    const validationError = validateForm(formValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = normalizeForm(formValue);

    try {
      setSaving(true);

      if (editingId === null) {
        await createDishOption(payload);
        setSuccessMessage("Opcija je uspešno dodata.");
      } else {
        await updateDishOption(editingId, payload);
        setSuccessMessage("Opcija je uspešno izmenjena.");
      }

      await loadOptions();
      resetForm();
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri čuvanju opcije."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(option: DishOptionDto) {
    const confirmed = window.confirm(
      `Da li želiš da deaktiviraš opciju "${option.name}"?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(option.id);

      await deactivateDishOption(option.id);
      await loadOptions();

      setSuccessMessage(`Opcija "${option.name}" je deaktivirana.`);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri deaktivaciji opcije."));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleActivate(option: DishOptionDto) {
    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(option.id);

      await activateDishOption(option.id);
      await loadOptions();

      setSuccessMessage(`Opcija "${option.name}" je aktivirana.`);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri aktivaciji opcije."));
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div>
      <h2>Prilozi i začini</h2>

      <div
        style={{
          display: "grid",
          gap: 12,
          padding: 16,
          border: "1px solid #ccc",
          borderRadius: 8,
          marginTop: 12,
        }}
      >
        <h3>{editingId === null ? "Nova opcija" : "Izmena opcije"}</h3>

        <input
          type="text"
          placeholder="Naziv"
          value={formValue.name}
          maxLength={100}
          disabled={saving}
          onChange={(e) =>
            setFormValue((prev) => ({ ...prev, name: e.target.value }))
          }
        />

        <select
          value={formValue.type}
          disabled={saving}
          onChange={(e) => {
            const nextType = e.target.value as DishOptionType;

            setFormValue((prev) => ({
              ...prev,
              type: nextType,
              price: nextType === "Spice" ? 0 : prev.price,
              isAlwaysPaid: nextType === "Spice" ? false : prev.isAlwaysPaid,
            }));
          }}
        >
          <option value="SideDish">Prilog</option>
          <option value="Spice">Začin</option>
        </select>

        {formValue.type === "SideDish" && (
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={formValue.isAlwaysPaid}
              disabled={saving}
              onChange={(e) =>
                setFormValue((prev) => ({
                  ...prev,
                  isAlwaysPaid: e.target.checked,
                  price: e.target.checked ? prev.price : 0,
                }))
              }
            />
            Ovaj prilog se odmah naplaćuje
          </label>
        )}

        {formValue.type === "SideDish" && formValue.isAlwaysPaid && (
          <input
            type="number"
            min={0}
            placeholder="Cena"
            value={formValue.price}
            disabled={saving}
            onChange={(e) =>
              setFormValue((prev) => ({
                ...prev,
                price: Number(e.target.value),
              }))
            }
          />
        )}

        <input
          type="number"
          min={0}
          placeholder="Redosled prikaza"
          value={formValue.sortOrder}
          disabled={saving}
          onChange={(e) =>
            setFormValue((prev) => ({
              ...prev,
              sortOrder: Number(e.target.value),
            }))
          }
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" disabled={saving} onClick={handleSave}>
            {saving
              ? "Čuvam..."
              : editingId === null
                ? "Dodaj opciju"
                : "Sačuvaj izmene"}
          </button>

          {editingId !== null && (
            <button type="button" disabled={saving} onClick={resetForm}>
              Otkaži izmenu
            </button>
          )}
        </div>
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

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginTop: 20,
          flexWrap: "wrap",
        }}
      >
        <label>
          Tip:{" "}
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as "all" | DishOptionType)
            }
          >
            <option value="all">Sve</option>
            <option value="SideDish">Prilozi</option>
            <option value="Spice">Začini</option>
          </select>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Prikaži neaktivne
        </label>
      </div>

      {loading ? (
        <div style={{ marginTop: 16 }}>Učitavam opcije...</div>
      ) : options.length === 0 ? (
        <div style={{ marginTop: 16 }}>Nema opcija za prikaz.</div>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {options.map((option) => (
            <div
              key={option.id}
              style={{
                border: option.isActive ? "1px solid #ccc" : "1px solid #ddd",
                background: option.isActive ? "white" : "#f5f5f5",
                borderRadius: 8,
                padding: 12,
                opacity: option.isActive ? 1 : 0.65,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>{option.name}</strong>
                  {!option.isActive && (
                    <span style={{ marginLeft: 8, color: "crimson" }}>
                      (Neaktivno)
                    </span>
                  )}

                  <div style={{ marginTop: 4 }}>
                    Tip: {formatType(option.type)}
                  </div>

                  <div>Redosled: {option.sortOrder}</div>

                  {option.type === "SideDish" && option.isAlwaysPaid && (
                    <div>Naplaćuje se odmah: {formatPrice(option.price)}</div>
                  )}

                  {option.type === "SideDish" && !option.isAlwaysPaid && (
                    <div>Običan prilog: ulazi u pravilo prva 4 besplatna</div>
                  )}

                  {option.type === "Spice" && <div>Začin: uvek besplatan</div>}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "start" }}>
                  <button type="button" onClick={() => handleEdit(option)}>
                    Izmeni
                  </button>

                  {option.isActive ? (
                    <button
                      type="button"
                      disabled={actionLoadingId === option.id}
                      onClick={() => handleDeactivate(option)}
                    >
                      {actionLoadingId === option.id
                        ? "Radim..."
                        : "Deaktiviraj"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoadingId === option.id}
                      onClick={() => handleActivate(option)}
                    >
                      {actionLoadingId === option.id ? "Radim..." : "Aktiviraj"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
