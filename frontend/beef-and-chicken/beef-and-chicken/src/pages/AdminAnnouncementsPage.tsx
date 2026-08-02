import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
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
import "../styles/AdminAnnouncementsPage.scss";

type AnnouncementFormState = {
  title: string;
  content: string;
  type: AnnouncementType;
  isActive: boolean;
  isPinned: boolean;
  startsAt: string;
  endsAt: string;
};

type AnnouncementFilter = "all" | "active" | "inactive" | "pinned";

const announcementTypes: {
  value: AnnouncementType;
  label: string;
}[] = [
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
  if (!value) {
    return "";
  }

  return toDateTimeLocal(new Date(value));
}

function dateTimeLocalToIso(value: string) {
  return new Date(value).toISOString();
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Bez ograničenja";
  }

  return new Date(value).toLocaleString("sr-RS", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getTypeLabel(type: AnnouncementType) {
  return announcementTypes.find((item) => item.value === type)?.label ?? type;
}

function getTypeClass(type: AnnouncementType) {
  return `admin-announcement-type--${type.toLowerCase()}`;
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

function getTimingStatus(announcement: AnnouncementDto) {
  const now = Date.now();
  const startsAt = new Date(announcement.startsAt).getTime();

  const endsAt = announcement.endsAt
    ? new Date(announcement.endsAt).getTime()
    : null;

  if (!announcement.isActive) {
    return {
      label: "Neaktivna",
      modifier: "inactive",
    };
  }

  if (startsAt > now) {
    return {
      label: "Zakazana",
      modifier: "scheduled",
    };
  }

  if (endsAt !== null && endsAt < now) {
    return {
      label: "Završena",
      modifier: "expired",
    };
  }

  return {
    label: "Aktivna",
    modifier: "active",
  };
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);

  const [form, setForm] = useState<AnnouncementFormState>(getInitialForm());

  const [editingId, setEditingId] = useState<number | null>(null);

  const [filter, setFilter] = useState<AnnouncementFilter>("all");

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditing = editingId !== null;

  const loadAnnouncements = useCallback(async (showInitialLoading = true) => {
    try {
      setError(null);

      if (showInitialLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const data = await getAdminAnnouncements();

      setAnnouncements(data);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

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

  const counts = useMemo(() => {
    const active = announcements.filter(
      (announcement) => announcement.isActive,
    ).length;

    const pinned = announcements.filter(
      (announcement) => announcement.isPinned,
    ).length;

    return {
      all: announcements.length,
      active,
      inactive: announcements.length - active,
      pinned,
    };
  }, [announcements]);

  const visibleAnnouncements = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("sr-RS");

    return announcements
      .filter((announcement) => {
        if (filter === "active" && !announcement.isActive) {
          return false;
        }

        if (filter === "inactive" && announcement.isActive) {
          return false;
        }

        if (filter === "pinned" && !announcement.isPinned) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const searchableText = [
          announcement.title,
          announcement.content,
          getTypeLabel(announcement.type),
        ]
          .join(" ")
          .toLocaleLowerCase("sr-RS");

        return searchableText.includes(normalizedSearch);
      })
      .sort((firstAnnouncement, secondAnnouncement) => {
        if (firstAnnouncement.isPinned !== secondAnnouncement.isPinned) {
          return firstAnnouncement.isPinned ? -1 : 1;
        }

        return (
          new Date(secondAnnouncement.startsAt).getTime() -
          new Date(firstAnnouncement.startsAt).getTime()
        );
      });
  }, [announcements, filter, searchTerm]);

  function clearForm() {
    setForm(getInitialForm());
    setEditingId(null);
  }

  function resetForm() {
    clearForm();
    setError(null);
    setSuccessMessage(null);
  }

  function scrollToEditor() {
    const editor = document.getElementById("admin-announcement-editor");

    if (!editor) {
      return;
    }

    editor.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    editor.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function startNewAnnouncement() {
    setForm(getInitialForm());
    setEditingId(null);
    setError(null);
    setSuccessMessage(null);

    window.setTimeout(scrollToEditor, 0);
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

    window.setTimeout(scrollToEditor, 0);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
      startsAt:
        editingId !== null
          ? dateTimeLocalToIso(form.startsAt)
          : new Date().toISOString(),
      endsAt: form.endsAt ? dateTimeLocalToIso(form.endsAt) : null,
    };

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const message =
        editingId !== null
          ? "Novost je uspešno izmenjena."
          : "Novost je uspešno dodata.";

      if (editingId !== null) {
        await updateAnnouncement(editingId, payload);
      } else {
        await createAnnouncement(payload);
      }

      clearForm();
      await loadAnnouncements(false);

      setSuccessMessage(message);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(announcement: AnnouncementDto) {
    const confirmed = window.confirm(
      `Da li želiš da deaktiviraš novost "${announcement.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(announcement.id);

      await deactivateAnnouncement(announcement.id);

      if (editingId === announcement.id) {
        clearForm();
      }

      await loadAnnouncements(false);

      setSuccessMessage("Novost je deaktivirana.");
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleActivate(announcement: AnnouncementDto) {
    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(announcement.id);

      await activateAnnouncement(announcement.id);
      await loadAnnouncements(false);

      setSuccessMessage("Novost je aktivirana.");
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(announcement: AnnouncementDto) {
    const confirmed = window.confirm(
      `Da li želiš trajno da obrišeš novost "${announcement.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(announcement.id);

      await deleteAnnouncement(announcement.id);

      if (editingId === announcement.id) {
        clearForm();
      }

      await loadAnnouncements(false);

      setSuccessMessage("Novost je obrisana.");
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  if (loading) {
    return (
      <main className="admin-announcements-page">
        <section className="admin-announcements-state">
          <span
            className="admin-announcements-state__spinner"
            aria-hidden="true"
          />

          <div>
            <strong>Učitavamo novosti</strong>
            <p>Sačekajte trenutak.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-announcements-page">
      <header className="admin-announcements-page__header">
        <div className="admin-announcements-page__heading">
          <span className="admin-announcements-page__eyebrow">
            KOMUNIKACIJA SA KUPCIMA
          </span>

          <h1 className="admin-announcements-page__title">Novosti</h1>

          <p className="admin-announcements-page__description">
            Objavite akcije, važne informacije, promene u dostavi, nova jela i
            obaveštenja o radnom vremenu.
          </p>
        </div>

        <button
          type="button"
          className="admin-announcements-page__new-button"
          onClick={startNewAnnouncement}
        >
          <span aria-hidden="true">+</span>
          Nova novost
        </button>
      </header>

      <section className="admin-announcement-stats">
        <article className="admin-announcement-stat">
          <span className="admin-announcement-stat__label">Ukupno</span>

          <strong className="admin-announcement-stat__value">
            {counts.all}
          </strong>

          <span className="admin-announcement-stat__description">
            Sve objave
          </span>
        </article>

        <article className="admin-announcement-stat admin-announcement-stat--active">
          <span className="admin-announcement-stat__label">Aktivne</span>

          <strong className="admin-announcement-stat__value">
            {counts.active}
          </strong>

          <span className="admin-announcement-stat__description">
            Uključene objave
          </span>
        </article>

        <article className="admin-announcement-stat admin-announcement-stat--inactive">
          <span className="admin-announcement-stat__label">Neaktivne</span>

          <strong className="admin-announcement-stat__value">
            {counts.inactive}
          </strong>

          <span className="admin-announcement-stat__description">
            Isključene objave
          </span>
        </article>

        <article className="admin-announcement-stat admin-announcement-stat--pinned">
          <span className="admin-announcement-stat__label">Važne</span>

          <strong className="admin-announcement-stat__value">
            {counts.pinned}
          </strong>

          <span className="admin-announcement-stat__description">
            Istaknute iznad ostalih
          </span>
        </article>
      </section>

      <div className="admin-announcements-page__messages" aria-live="polite">
        {successMessage && (
          <div className="admin-announcement-alert admin-announcement-alert--success">
            <span className="admin-announcement-alert__icon" aria-hidden="true">
              ✓
            </span>

            <div>
              <strong>Uspešno završeno</strong>
              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div
            className="admin-announcement-alert admin-announcement-alert--error"
            role="alert"
          >
            <span className="admin-announcement-alert__icon" aria-hidden="true">
              !
            </span>

            <div>
              <strong>Došlo je do greške</strong>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="admin-announcements-layout">
        <section
          id="admin-announcement-editor"
          className={[
            "admin-announcement-editor",
            isEditing ? "admin-announcement-editor--editing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <header className="admin-announcement-editor__header">
            <div>
              <span className="admin-announcement-editor__eyebrow">
                {isEditing ? "IZMENA OBJAVE" : "NOVA OBJAVA"}
              </span>

              <h2 className="admin-announcement-editor__title">
                {isEditing ? "Izmeni novost" : "Dodaj novost"}
              </h2>
            </div>

            <span className="admin-announcement-editor__mode">
              {isEditing ? "Izmena" : "Kreiranje"}
            </span>
          </header>

          <form
            className="form admin-announcement-form"
            onSubmit={handleSubmit}
          >
            <div className="form-field">
              <label className="form-label" htmlFor="announcement-title">
                Naslov
                <span className="form-label__required">*</span>
              </label>

              <input
                id="announcement-title"
                className="form-control"
                type="text"
                value={form.title}
                maxLength={120}
                placeholder="Na primer: Neradni dani za praznike"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />

              <p className="form-help">{form.title.length}/120 karaktera</p>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="announcement-content">
                Tekst novosti
                <span className="form-label__required">*</span>
              </label>

              <textarea
                id="announcement-content"
                className="form-textarea"
                value={form.content}
                maxLength={1000}
                rows={6}
                placeholder="Unesite detalje obaveštenja..."
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
              />

              <p className="form-help">{form.content.length}/1000 karaktera</p>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="announcement-type">
                Tip novosti
              </label>

              <select
                id="announcement-type"
                className="form-select"
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as AnnouncementType,
                  }))
                }
              >
                {announcementTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="announcement-start">
                Početak prikazivanja
                <span className="form-label__required">*</span>
              </label>

              <input
                id="announcement-start"
                className="form-control"
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startsAt: event.target.value,
                  }))
                }
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="announcement-end">
                Kraj prikazivanja
                <span className="form-label__optional">opciono</span>
              </label>

              <input
                id="announcement-end"
                className="form-control"
                type="datetime-local"
                value={form.endsAt}
                min={form.startsAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endsAt: event.target.value,
                  }))
                }
              />

              <p className="form-help">
                Ostavite prazno ako objava nema datum završetka.
              </p>
            </div>

            <section className="admin-announcement-settings">
              <label className="admin-announcement-setting">
                <span className="admin-announcement-setting__content">
                  <strong>Aktivna novost</strong>
                  <small>Objava može da se prikazuje kupcima.</small>
                </span>

                <span className="admin-announcement-switch">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />

                  <span
                    className="admin-announcement-switch__control"
                    aria-hidden="true"
                  >
                    <span className="admin-announcement-switch__thumb" />
                  </span>
                </span>
              </label>

              <label className="admin-announcement-setting">
                <span className="admin-announcement-setting__content">
                  <strong>Važna novost</strong>
                  <small>Prikazuje se iznad ostalih objava.</small>
                </span>

                <span className="admin-announcement-switch">
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isPinned: event.target.checked,
                      }))
                    }
                  />

                  <span
                    className="admin-announcement-switch__control"
                    aria-hidden="true"
                  >
                    <span className="admin-announcement-switch__thumb" />
                  </span>
                </span>
              </label>
            </section>

            <div className="admin-announcement-form__actions">
              <button
                type="submit"
                className="admin-announcement-button admin-announcement-button--primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span
                      className="admin-announcement-button__spinner"
                      aria-hidden="true"
                    />
                    Čuvam...
                  </>
                ) : isEditing ? (
                  "Sačuvaj izmene"
                ) : (
                  "Dodaj novost"
                )}
              </button>

              {isEditing && (
                <button
                  type="button"
                  className="admin-announcement-button admin-announcement-button--secondary"
                  disabled={saving}
                  onClick={resetForm}
                >
                  Odustani
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-announcement-catalog">
          <header className="admin-announcement-catalog__header">
            <div>
              <span className="admin-announcement-catalog__eyebrow">
                PREGLED OBJAVA
              </span>

              <h2 className="admin-announcement-catalog__title">Sve novosti</h2>
            </div>

            <button
              type="button"
              className="admin-announcement-catalog__refresh"
              disabled={refreshing}
              onClick={() => loadAnnouncements(false)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M20 7v5h-5M4 17v-5h5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M18.2 9A7 7 0 0 0 6.4 6.4L4 9m16 6-2.4 2.6A7 7 0 0 1 5.8 15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {refreshing ? "Osvežavam..." : "Osveži"}
            </button>
          </header>

          <div className="admin-announcement-filters">
            <div className="admin-announcement-search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <path
                  d="m16.2 16.2 4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>

              <input
                type="search"
                value={searchTerm}
                placeholder="Pretraži novosti..."
                aria-label="Pretraži novosti"
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div
              className="admin-announcement-filter-tabs"
              role="group"
              aria-label="Filtriranje novosti"
            >
              {(
                [
                  ["all", "Sve", counts.all],
                  ["active", "Aktivne", counts.active],
                  ["inactive", "Neaktivne", counts.inactive],
                  ["pinned", "Važne", counts.pinned],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  className={[
                    "admin-announcement-filter-tabs__button",
                    filter === value
                      ? "admin-announcement-filter-tabs__button--active"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
          </div>

          {visibleAnnouncements.length === 0 ? (
            <div className="admin-announcement-empty">
              <div
                className="admin-announcement-empty__icon"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24">
                  <path
                    d="M5 5h14v14H5V5Zm3 4h8M8 13h8M8 17h5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <span className="admin-announcement-empty__eyebrow">
                NEMA REZULTATA
              </span>

              <h3 className="admin-announcement-empty__title">
                Nema novosti za izabrani filter
              </h3>

              <p className="admin-announcement-empty__description">
                Promenite filter ili dodajte novu objavu.
              </p>
            </div>
          ) : (
            <div className="admin-announcement-cards">
              {visibleAnnouncements.map((announcement) => {
                const timingStatus = getTimingStatus(announcement);

                const isActionLoading = actionLoadingId === announcement.id;

                return (
                  <article
                    key={announcement.id}
                    className={[
                      "admin-announcement-card",
                      announcement.isPinned
                        ? "admin-announcement-card--pinned"
                        : "",
                      !announcement.isActive
                        ? "admin-announcement-card--inactive"
                        : "",
                      editingId === announcement.id
                        ? "admin-announcement-card--editing"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <header className="admin-announcement-card__header">
                      <span
                        className={[
                          "admin-announcement-type",
                          getTypeClass(announcement.type),
                        ].join(" ")}
                      >
                        {getTypeLabel(announcement.type)}
                      </span>

                      <span
                        className={[
                          "admin-announcement-status",
                          `admin-announcement-status--${timingStatus.modifier}`,
                        ].join(" ")}
                      >
                        <span
                          className="admin-announcement-status__dot"
                          aria-hidden="true"
                        />

                        {timingStatus.label}
                      </span>
                    </header>

                    {announcement.isPinned && (
                      <span className="admin-announcement-card__pinned-label">
                        VAŽNA OBJAVA
                      </span>
                    )}

                    <h3 className="admin-announcement-card__title">
                      {announcement.title}
                    </h3>

                    <p className="admin-announcement-card__content">
                      {announcement.content}
                    </p>

                    <div className="admin-announcement-card__dates">
                      <div>
                        <span>Početak</span>
                        <strong>{formatDate(announcement.startsAt)}</strong>
                      </div>

                      <div>
                        <span>Završetak</span>
                        <strong>{formatDate(announcement.endsAt)}</strong>
                      </div>
                    </div>

                    <footer className="admin-announcement-card__actions">
                      <button
                        type="button"
                        className="admin-announcement-card__action admin-announcement-card__action--edit"
                        disabled={isActionLoading || saving}
                        onClick={() => startEdit(announcement)}
                      >
                        Izmeni
                      </button>

                      {announcement.isActive ? (
                        <button
                          type="button"
                          className="admin-announcement-card__action admin-announcement-card__action--deactivate"
                          disabled={isActionLoading || saving}
                          onClick={() => handleDeactivate(announcement)}
                        >
                          {isActionLoading ? "Obrađujem..." : "Deaktiviraj"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-announcement-card__action admin-announcement-card__action--activate"
                          disabled={isActionLoading || saving}
                          onClick={() => handleActivate(announcement)}
                        >
                          {isActionLoading ? "Obrađujem..." : "Aktiviraj"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="admin-announcement-card__action admin-announcement-card__action--delete"
                        disabled={isActionLoading || saving}
                        onClick={() => handleDelete(announcement)}
                      >
                        Obriši
                      </button>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
