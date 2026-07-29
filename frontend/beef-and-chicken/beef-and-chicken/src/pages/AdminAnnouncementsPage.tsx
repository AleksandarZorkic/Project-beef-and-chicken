import { FormEvent, useEffect, useState } from "react";
import {
  activateAnnouncement,
  createAnnouncement,
  deactivateAnnouncement,
  deleteAnnouncement,
  getAdminAnnouncements,
  updateAnnouncement,
  type AnnouncementDto,
  type AnnouncementType,
} from "../api/announcementApi";
import { getApiErrorMessage } from "../utils/apiErrors";

type AnnouncementFormState = {
  title: string;
  content: string;
  type: AnnouncementType;
  isActive: boolean;
  isPinned: boolean;
  startsAt: string;
  endsAt: string;
};

const announcementTypes: { value: AnnouncementType; label: string }[] = [
  { value: "Info", label: "Informacija" },
  { value: "Important", label: "Važno obaveštenje" },
  { value: "Promotion", label: "Akcija / promocija" },
  { value: "NewItem", label: "Novo jelo" },
  { value: "Holiday", label: "Neradni dani / praznici" },
  { value: "Delivery", label: "Dostava" },
];

function toDateTimeLocal(value: Date) {
  const offset = value.getTimezoneOffset();
  const localDate = new Date(value.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function apiDateToDateTimeLocal(value?: string | null) {
  if (!value) return "";

  return toDateTimeLocal(new Date(value));
}

function dateTimeLocalToIso(value: string) {
  return new Date(value).toISOString();
}

function formatDate(value?: string | null) {
  if (!value) return "Nema ograničenja";

  return new Date(value).toLocaleString("sr-RS");
}

function getTypeLabel(type: AnnouncementType) {
  return announcementTypes.find((item) => item.value === type)?.label ?? type;
}

function getInitialForm(): AnnouncementFormState {
  return {
    title: "",
    content: "",
    type: "Info",
    isActive: true,
    isPinned: false,
    startsAt: toDateTimeLocal(new Date()),
    endsAt: "",
  };
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [form, setForm] = useState<AnnouncementFormState>(getInitialForm());
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      setLoading(true);
      setError(null);

      const data = await getAdminAnnouncements();

      setAnnouncements(data);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function clearForm() {
    setForm(getInitialForm());
    setEditingId(null);
  }

  function resetForm() {
    clearForm();
    setError(null);
    setSuccessMessage(null);
  }

  function validateForm() {
    if (!form.title.trim()) {
      return "Naslov novosti je obavezan.";
    }

    if (form.title.trim().length < 2 || form.title.trim().length > 120) {
      return "Naslov mora imati između 2 i 120 karaktera.";
    }

    if (!form.content.trim()) {
      return "Tekst novosti je obavezan.";
    }

    if (form.content.trim().length < 5 || form.content.trim().length > 1000) {
      return "Tekst novosti mora imati između 5 i 1000 karaktera.";
    }

    if (!form.startsAt) {
      return "Datum početka prikazivanja je obavezan.";
    }

    if (form.endsAt) {
      const startsAt = new Date(form.startsAt);
      const endsAt = new Date(form.endsAt);

      if (endsAt <= startsAt) {
        return "Datum završetka mora biti posle datuma početka.";
      }
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
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      isActive: form.isActive,
      isPinned: form.isPinned,
      startsAt: dateTimeLocalToIso(form.startsAt),
      endsAt: form.endsAt ? dateTimeLocalToIso(form.endsAt) : null,
    };

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      if (editingId) {
        await updateAnnouncement(editingId, payload);
        setSuccessMessage("Novost je uspešno izmenjena.");
      } else {
        await createAnnouncement(payload);
        setSuccessMessage("Novost je uspešno dodata.");
      }

      clearForm();
      await loadAnnouncements();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(announcement: AnnouncementDto) {
    setEditingId(announcement.id);

    setForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      isActive: announcement.isActive,
      isPinned: announcement.isPinned,
      startsAt: apiDateToDateTimeLocal(announcement.startsAt),
      endsAt: apiDateToDateTimeLocal(announcement.endsAt),
    });

    setError(null);
    setSuccessMessage(null);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeactivate(announcement: AnnouncementDto) {
    const confirmed = window.confirm(
      `Da li želiš da deaktiviraš novost "${announcement.title}"?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);

      await deactivateAnnouncement(announcement.id);
      await loadAnnouncements();

      setSuccessMessage("Novost je deaktivirana.");
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  async function handleActivate(announcement: AnnouncementDto) {
    try {
      setError(null);
      setSuccessMessage(null);

      await activateAnnouncement(announcement.id);
      await loadAnnouncements();

      setSuccessMessage("Novost je aktivirana.");
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  async function handleDelete(announcement: AnnouncementDto) {
    const confirmed = window.confirm(
      `Da li želiš da obrišeš novost "${announcement.title}"?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);

      await deleteAnnouncement(announcement.id);
      await loadAnnouncements();

      if (editingId === announcement.id) {
        clearForm();
      }

      setSuccessMessage("Novost je obrisana.");
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  if (loading) {
    return <div>Učitavam novosti...</div>;
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <h2>Admin novosti</h2>

      <p style={{ color: "#555" }}>
        Ovde možeš da dodaš obaveštenja za homepage, kao što su neradni dani,
        akcije, promene u dostavi ili važne informacije.
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
          background: "white",
        }}
      >
        <h3>{editingId ? "Izmeni novost" : "Dodaj novu novost"}</h3>

        <label>
          Naslov
          <input
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Npr. Neradni dani za praznike"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label>
          Tekst novosti
          <textarea
            value={form.content}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, content: e.target.value }))
            }
            rows={4}
            placeholder="Unesi detalje obaveštenja..."
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label>
          Tip novosti
          <select
            value={form.type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                type: e.target.value as AnnouncementType,
              }))
            }
            style={{ display: "block", width: "100%", marginTop: 4 }}
          >
            {announcementTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Početak prikazivanja
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, startsAt: e.target.value }))
            }
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label>
          Kraj prikazivanja
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, endsAt: e.target.value }))
            }
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
          <span style={{ color: "#777", fontSize: 13 }}>
            Ostavi prazno ako novost nema datum završetka.
          </span>
        </label>

        <label>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, isActive: e.target.checked }))
            }
          />{" "}
          Aktivna novost
        </label>

        <label>
          <input
            type="checkbox"
            checked={form.isPinned}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, isPinned: e.target.checked }))
            }
          />{" "}
          Važna novost — prikaži iznad ostalih
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={saving}>
            {saving
              ? "Čuvam..."
              : editingId
                ? "Sačuvaj izmene"
                : "Dodaj novost"}
          </button>

          {editingId && (
            <button type="button" onClick={resetForm} disabled={saving}>
              Odustani
            </button>
          )}
        </div>
      </form>

      <h3>Sve novosti</h3>

      {announcements.length === 0 && <div>Trenutno nema novosti.</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            style={{
              border: announcement.isPinned
                ? "2px solid #d97706"
                : "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              background: announcement.isActive ? "white" : "#f7f7f7",
              opacity: announcement.isActive ? 1 : 0.7,
              display: "grid",
              gap: 8,
            }}
          >
            <div>
              <strong>{announcement.title}</strong>{" "}
              {announcement.isPinned && (
                <span style={{ color: "#d97706", fontWeight: 700 }}>Važno</span>
              )}{" "}
              {!announcement.isActive && (
                <span style={{ color: "crimson", fontWeight: 700 }}>
                  Neaktivno
                </span>
              )}
            </div>

            <div style={{ color: "#555" }}>
              Tip: {getTypeLabel(announcement.type)}
            </div>

            <div>{announcement.content}</div>

            <div style={{ fontSize: 13, color: "#666" }}>
              Prikazivanje: {formatDate(announcement.startsAt)} —{" "}
              {formatDate(announcement.endsAt)}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => startEdit(announcement)}>
                Izmeni
              </button>

              {announcement.isActive ? (
                <button
                  type="button"
                  onClick={() => handleDeactivate(announcement)}
                >
                  Deaktiviraj
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleActivate(announcement)}
                >
                  Aktiviraj
                </button>
              )}

              <button type="button" onClick={() => handleDelete(announcement)}>
                Obriši
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
