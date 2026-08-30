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
import { useAppDialog } from "../components/dialogs/AppDialogContext";
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

type AnnouncementFilter =
  | "all"
  | "live"
  | "scheduled"
  | "expired"
  | "inactive"
  | "pinned";

type AnnouncementTypeFilter = AnnouncementType | "all";

type TimingStatus = "active" | "scheduled" | "expired" | "inactive";

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

const statusPriority: Record<TimingStatus, number> = {
  active: 0,
  scheduled: 1,
  expired: 2,
  inactive: 3,
};

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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("sr-RS", {
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

function getTimingStatus(announcement: AnnouncementDto): {
  label: string;
  modifier: TimingStatus;
} {
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
    label: "Aktivna sada",
    modifier: "active",
  };
}

export default function AdminAnnouncementsPage() {
  const { confirm } = useAppDialog();

  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);

  const [form, setForm] = useState<AnnouncementFormState>(getInitialForm());

  const [editingId, setEditingId] = useState<number | null>(null);

  const [filter, setFilter] = useState<AnnouncementFilter>("all");

  const [typeFilter, setTypeFilter] = useState<AnnouncementTypeFilter>("all");

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
    void loadAnnouncements();
  }, [loadAnnouncements]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const counts = useMemo(() => {
    let live = 0;
    let scheduled = 0;
    let expired = 0;
    let inactive = 0;
    let pinned = 0;

    announcements.forEach((announcement) => {
      const status = getTimingStatus(announcement);

      if (status.modifier === "active") {
        live += 1;
      }

      if (status.modifier === "scheduled") {
        scheduled += 1;
      }

      if (status.modifier === "expired") {
        expired += 1;
      }

      if (status.modifier === "inactive") {
        inactive += 1;
      }

      if (announcement.isPinned) {
        pinned += 1;
      }
    });

    return {
      all: announcements.length,
      live,
      scheduled,
      expired,
      inactive,
      pinned,
    };
  }, [announcements]);

  const visibleAnnouncements = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("sr-RS");

    return announcements
      .filter((announcement) => {
        const status = getTimingStatus(announcement);

        if (filter === "live" && status.modifier !== "active") {
          return false;
        }

        if (filter === "scheduled" && status.modifier !== "scheduled") {
          return false;
        }

        if (filter === "expired" && status.modifier !== "expired") {
          return false;
        }

        if (filter === "inactive" && status.modifier !== "inactive") {
          return false;
        }

        if (filter === "pinned" && !announcement.isPinned) {
          return false;
        }

        if (typeFilter !== "all" && announcement.type !== typeFilter) {
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

        const firstStatus = getTimingStatus(firstAnnouncement).modifier;

        const secondStatus = getTimingStatus(secondAnnouncement).modifier;

        if (statusPriority[firstStatus] !== statusPriority[secondStatus]) {
          return statusPriority[firstStatus] - statusPriority[secondStatus];
        }

        return (
          new Date(secondAnnouncement.startsAt).getTime() -
          new Date(firstAnnouncement.startsAt).getTime()
        );
      });
  }, [announcements, filter, typeFilter, searchTerm]);

  const hasActiveFilters =
    filter !== "all" || typeFilter !== "all" || searchTerm.trim().length > 0;

  function clearForm() {
    setForm(getInitialForm());
    setEditingId(null);
  }

  function resetForm() {
    clearForm();

    setError(null);
    setSuccessMessage(null);
  }

  function resetFilters() {
    setFilter("all");
    setTypeFilter("all");
    setSearchTerm("");
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
    const title = form.title.trim();
    const content = form.content.trim();

    if (!title) {
      return "Naslov novosti je obavezan.";
    }

    if (title.length < 2 || title.length > 120) {
      return "Naslov mora imati između 2 i 120 karaktera.";
    }

    if (!content) {
      return "Tekst novosti je obavezan.";
    }

    if (content.length < 5 || content.length > 1000) {
      return "Tekst novosti mora imati između 5 i 1000 karaktera.";
    }

    if (!form.startsAt) {
      return "Datum početka prikazivanja je obavezan.";
    }

    const startsAt = new Date(form.startsAt);

    if (Number.isNaN(startsAt.getTime())) {
      return "Datum početka nije validan.";
    }

    if (form.endsAt) {
      const endsAt = new Date(form.endsAt);

      if (Number.isNaN(endsAt.getTime())) {
        return "Datum završetka nije validan.";
      }

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

    const wasEditing = editingId !== null;

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      isActive: form.isActive,
      isPinned: form.isPinned,

      // Important: use the selected time
      // both for creation and editing.
      startsAt: dateTimeLocalToIso(form.startsAt),

      endsAt: form.endsAt ? dateTimeLocalToIso(form.endsAt) : null,
    };

    try {
      setSaving(true);

      setError(null);
      setSuccessMessage(null);

      if (editingId !== null) {
        await updateAnnouncement(editingId, payload);
      } else {
        await createAnnouncement(payload);
      }

      clearForm();

      await loadAnnouncements(false);

      setSuccessMessage(
        wasEditing
          ? "Novost je uspešno izmenjena."
          : "Novost je uspešno kreirana.",
      );
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(announcement: AnnouncementDto) {
    const confirmed = await confirm({
      title: "Deaktivacija novosti",
      message: (
        <p>
          Da li želite da deaktivirate objavu{" "}
          <strong>„{announcement.title}“</strong>? Više se neće prikazivati
          kupcima, ali je kasnije možete ponovo aktivirati.
        </p>
      ),
      confirmText: "Deaktiviraj",
      cancelText: "Odustani",
      tone: "danger",
    });

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
    const confirmed = await confirm({
      title: "Brisanje novosti",
      message: (
        <p>
          Da li želite trajno da obrišete objavu{" "}
          <strong>„{announcement.title}“</strong>? Ovu radnju nije moguće
          poništiti.
        </p>
      ),
      confirmText: "Obriši",
      cancelText: "Odustani",
      tone: "danger",
    });

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

      setSuccessMessage("Novost je trajno obrisana.");
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  if (loading) {
    return (
      <main className="admin-announcements-page">
        <section className="admin-announcements-state" aria-live="polite">
          <span
            className="admin-announcements-state__spinner"
            aria-hidden="true"
          />

          <div>
            <strong>Učitavamo novosti</strong>

            <p>Pripremamo objave i njihov trenutni status.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-announcements-page">
      <section className="admin-announcements-hero">
        <div className="admin-announcements-hero__content">
          <span className="admin-announcements-hero__eyebrow">
            BEEF N&apos; CHICKEN • ADMIN
          </span>

          <h1 className="admin-announcements-hero__title">Novosti</h1>

          <p className="admin-announcements-hero__description">
            Upravljajte akcijama, važnim informacijama, novim jelima, promenama
            dostave i drugim obaveštenjima koja vide vaši kupci.
          </p>

          <div className="admin-announcements-hero__meta">
            <span className="admin-announcements-hero__live">
              <span aria-hidden="true" />
              {counts.live} aktivnih sada
            </span>

            <span className="admin-announcements-hero__scheduled">
              {counts.scheduled} zakazanih
            </span>
          </div>
        </div>

        <aside className="admin-announcements-summary">
          <header className="admin-announcements-summary__header">
            <span
              className="admin-announcements-summary__icon"
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
            </span>

            <span className="admin-announcements-summary__label">OBJAVE</span>
          </header>

          <div className="admin-announcements-summary__value">
            <strong>{counts.all}</strong>

            <span>novosti u sistemu</span>
          </div>

          <footer className="admin-announcements-summary__footer">
            <div>
              <span>Važne</span>
              <strong>{counts.pinned}</strong>
            </div>

            <div>
              <span>Završene</span>
              <strong>{counts.expired}</strong>
            </div>

            <button
              type="button"
              className="admin-announcements-summary__new"
              aria-label="Dodaj novu novost"
              onClick={startNewAnnouncement}
            >
              +
            </button>
          </footer>
        </aside>
      </section>

      <section
        className="admin-announcement-stats"
        aria-label="Pregled novosti"
      >
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
          <span className="admin-announcement-stat__label">Aktivne sada</span>

          <strong className="admin-announcement-stat__value">
            {counts.live}
          </strong>

          <span className="admin-announcement-stat__description">
            Trenutno vidljive
          </span>
        </article>

        <article className="admin-announcement-stat admin-announcement-stat--scheduled">
          <span className="admin-announcement-stat__label">Zakazane</span>

          <strong className="admin-announcement-stat__value">
            {counts.scheduled}
          </strong>

          <span className="admin-announcement-stat__description">
            Čekaju početak
          </span>
        </article>

        <article className="admin-announcement-stat admin-announcement-stat--expired">
          <span className="admin-announcement-stat__label">Završene</span>

          <strong className="admin-announcement-stat__value">
            {counts.expired}
          </strong>

          <span className="admin-announcement-stat__description">
            Period je istekao
          </span>
        </article>

        <article className="admin-announcement-stat admin-announcement-stat--inactive">
          <span className="admin-announcement-stat__label">Neaktivne</span>

          <strong className="admin-announcement-stat__value">
            {counts.inactive}
          </strong>

          <span className="admin-announcement-stat__description">
            Ručno isključene
          </span>
        </article>

        <article className="admin-announcement-stat admin-announcement-stat--pinned">
          <span className="admin-announcement-stat__label">Važne</span>

          <strong className="admin-announcement-stat__value">
            {counts.pinned}
          </strong>

          <span className="admin-announcement-stat__description">
            Istaknute objave
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
              <strong>Promena je sačuvana</strong>

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
              <strong>Proverite podatke</strong>

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

              <p>
                {isEditing
                  ? "Promenite sadržaj ili period prikazivanja postojeće objave."
                  : "Kreirajte novu informaciju koja će biti prikazana kupcima."}
              </p>
            </div>

            <span
              className={[
                "admin-announcement-editor__mode",
                isEditing ? "admin-announcement-editor__mode--editing" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isEditing ? "Izmena" : "Kreiranje"}
            </span>
          </header>

          <form
            className="form admin-announcement-form"
            onSubmit={handleSubmit}
          >
            <section className="admin-announcement-form-section">
              <header className="admin-announcement-form-section__header">
                <span>01</span>

                <div>
                  <strong>Sadržaj objave</strong>

                  <p>Naslov, tekst i tip novosti.</p>
                </div>
              </header>

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
                  placeholder="Na primer: Praznična akcija"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />

                <p className="form-help">{form.title.length}/120</p>
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

                <p className="form-help">{form.content.length}/1000</p>
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
            </section>

            <section className="admin-announcement-schedule">
              <header className="admin-announcement-schedule__header">
                <span>02</span>

                <div>
                  <strong>Period prikazivanja</strong>

                  <p>Odredite kada objava postaje vidljiva.</p>
                </div>
              </header>

              <div className="form-field">
                <label className="form-label" htmlFor="announcement-start">
                  Početak
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
                  Završetak
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
                  Prazno znači da objava nema automatski datum završetka.
                </p>
              </div>
            </section>

            <section className="admin-announcement-settings">
              <label className="admin-announcement-setting">
                <span className="admin-announcement-setting__content">
                  <strong>Aktivna objava</strong>

                  <small>
                    Omogućava prikaz objave u odgovarajućem periodu.
                  </small>
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
                  <strong>Važna objava</strong>

                  <small>Ističe se i prikazuje pre ostalih novosti.</small>
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
                {saving && (
                  <span
                    className="admin-announcement-button__spinner"
                    aria-hidden="true"
                  />
                )}

                {saving
                  ? "Čuvam..."
                  : isEditing
                    ? "Sačuvaj izmene"
                    : "Objavi novost"}
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
                UPRAVLJANJE OBJAVAMA
              </span>

              <h2 className="admin-announcement-catalog__title">Sve novosti</h2>

              <p>Pretražite, filtrirajte i upravljajte postojećim objavama.</p>
            </div>

            <div className="admin-announcement-catalog__header-actions">
              <div className="admin-announcement-catalog__result">
                <strong>{visibleAnnouncements.length}</strong>

                <span>prikazano</span>
              </div>

              <button
                type="button"
                className="admin-announcement-catalog__refresh"
                disabled={refreshing}
                onClick={() => void loadAnnouncements(false)}
              >
                {refreshing ? (
                  <span className="admin-announcement-catalog__spinner" />
                ) : (
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
                )}

                {refreshing ? "Osvežavam..." : "Osveži"}
              </button>
            </div>
          </header>

          <div className="admin-announcement-filters">
            <label className="admin-announcement-search">
              <span>Pretraga</span>

              <div className="admin-announcement-search__control">
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
                  placeholder="Naslov ili sadržaj..."
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </label>

            <label className="admin-announcement-type-filter">
              <span>Tip</span>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as AnnouncementTypeFilter)
                }
              >
                <option value="all">Svi tipovi</option>

                {announcementTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                className="admin-announcement-filters__clear"
                onClick={resetFilters}
              >
                Poništi filtere
              </button>
            )}
          </div>

          <div
            className="admin-announcement-filter-tabs"
            role="group"
            aria-label="Status novosti"
          >
            {(
              [
                ["all", "Sve", counts.all],
                ["live", "Aktivne", counts.live],
                ["scheduled", "Zakazane", counts.scheduled],
                ["expired", "Završene", counts.expired],
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
                Nema odgovarajućih novosti
              </h3>

              <p className="admin-announcement-empty__description">
                Promenite filtere ili kreirajte novu objavu.
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
                      timingStatus.modifier === "inactive"
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
                      <div className="admin-announcement-card__badges">
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

                        {announcement.isPinned && (
                          <span className="admin-announcement-card__pinned">
                            ★ Važna
                          </span>
                        )}
                      </div>

                      <span className="admin-announcement-card__id">
                        #{announcement.id}
                      </span>
                    </header>

                    <div className="admin-announcement-card__main">
                      <h3 className="admin-announcement-card__title">
                        {announcement.title}
                      </h3>

                      <p className="admin-announcement-card__content">
                        {announcement.content}
                      </p>
                    </div>

                    <div className="admin-announcement-card__schedule">
                      <div>
                        <span>Početak</span>

                        <strong>{formatDate(announcement.startsAt)}</strong>
                      </div>

                      <span
                        className="admin-announcement-card__schedule-arrow"
                        aria-hidden="true"
                      >
                        →
                      </span>

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
                          onClick={() => void handleDeactivate(announcement)}
                        >
                          {isActionLoading ? "Obrađujem..." : "Deaktiviraj"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-announcement-card__action admin-announcement-card__action--activate"
                          disabled={isActionLoading || saving}
                          onClick={() => void handleActivate(announcement)}
                        >
                          {isActionLoading ? "Obrađujem..." : "Aktiviraj"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="admin-announcement-card__action admin-announcement-card__action--delete"
                        disabled={isActionLoading || saving}
                        onClick={() => void handleDelete(announcement)}
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
