import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveFeedback,
  getAdminFeedback,
  markFeedbackAsRead,
  type FeedbackMessageDto,
  type FeedbackMessageStatus,
  type FeedbackMessageType,
} from "../api/feedbackApi";
import { useAppDialog } from "../components/dialogs/AppDialogContext";
import { getApiErrorMessage } from "../utils/apiErrors";
import "../styles/AdminFeedbackPage.scss";

type StatusFilter = FeedbackMessageStatus | "All";

type TypeFilter = FeedbackMessageType | "All";

type FeedbackAction = "read" | "archive";

const FEEDBACK_LOAD_LIMIT = 150;

const statusLabels: Record<FeedbackMessageStatus, string> = {
  New: "Novo",
  Read: "Pročitano",
  Archived: "Arhivirano",
};

const typeLabels: Record<FeedbackMessageType, string> = {
  Suggestion: "Predlog",
  Problem: "Problem",
  Praise: "Pohvala",
  Other: "Ostalo",
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("sr-RS", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getSenderName(message: FeedbackMessageDto) {
  if (message.userName) {
    return message.userName;
  }

  if (message.userId) {
    return `Korisnik #${message.userId}`;
  }

  return "Gost";
}

function getSenderContact(message: FeedbackMessageDto) {
  return message.userEmail ?? message.contactEmail ?? "Kontakt nije ostavljen";
}

function getStatusClass(status: FeedbackMessageStatus) {
  return [
    "admin-feedback-status",
    `admin-feedback-status--${status.toLowerCase()}`,
  ].join(" ");
}

function getTypeClass(type: FeedbackMessageType) {
  return [
    "admin-feedback-type",
    `admin-feedback-type--${type.toLowerCase()}`,
  ].join(" ");
}

export default function AdminFeedbackPage() {
  const { confirm, alert } = useAppDialog();

  const [messages, setMessages] = useState<FeedbackMessageDto[]>([]);

  const [selectedMessage, setSelectedMessage] =
    useState<FeedbackMessageDto | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");

  const [includeArchived, setIncludeArchived] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [actionLoading, setActionLoading] = useState<{
    id: number;
    type: FeedbackAction;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadMessages = useCallback(async (showInitialLoading = true) => {
    try {
      setError(null);

      if (showInitialLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      /*
       * Load a larger inbox batch once.
       * Search and filters are handled locally
       * for instant interaction.
       */
      const data = await getAdminFeedback({
        includeArchived: true,
        take: FEEDBACK_LOAD_LIMIT,
      });

      setMessages(data);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

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

  const stats = useMemo(() => {
    return {
      total: messages.length,

      newCount: messages.filter((message) => message.status === "New").length,

      readCount: messages.filter((message) => message.status === "Read").length,

      archivedCount: messages.filter((message) => message.status === "Archived")
        .length,
    };
  }, [messages]);

  const visibleMessages = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("sr-RS");

    return messages
      .filter((message) => {
        if (!includeArchived && message.status === "Archived") {
          return false;
        }

        if (statusFilter !== "All" && message.status !== statusFilter) {
          return false;
        }

        if (typeFilter !== "All" && message.type !== typeFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const searchableText = [
          message.message,
          message.userName ?? "",
          message.userEmail ?? "",
          message.contactEmail ?? "",
          message.pageUrl ?? "",
          typeLabels[message.type],
          statusLabels[message.status],
        ]
          .join(" ")
          .toLocaleLowerCase("sr-RS");

        return searchableText.includes(normalizedSearch);
      })
      .sort((first, second) => {
        const firstDate = new Date(first.createdAtUtc).getTime();

        const secondDate = new Date(second.createdAtUtc).getTime();

        return secondDate - firstDate;
      });
  }, [messages, statusFilter, typeFilter, includeArchived, searchTerm]);

  useEffect(() => {
    setSelectedMessage((current) => {
      if (visibleMessages.length === 0) {
        return null;
      }

      if (current) {
        const updatedCurrent = visibleMessages.find(
          (message) => message.id === current.id,
        );

        if (updatedCurrent) {
          return updatedCurrent;
        }
      }

      return visibleMessages[0];
    });
  }, [visibleMessages]);

  const hasFilters =
    statusFilter !== "All" ||
    typeFilter !== "All" ||
    includeArchived ||
    searchTerm.trim().length > 0;

  const hasReachedLoadLimit = messages.length >= FEEDBACK_LOAD_LIMIT;

  function clearFilters() {
    setStatusFilter("All");
    setTypeFilter("All");
    setIncludeArchived(false);
    setSearchTerm("");
  }

  async function showActionError(caughtError: unknown) {
    const message = getApiErrorMessage(caughtError);

    setError(message);

    await alert({
      title: "Greška",
      message: <p>{message}</p>,
      confirmText: "Razumem",
      tone: "danger",
    });
  }

  async function handleMarkAsRead(message: FeedbackMessageDto) {
    try {
      setError(null);
      setSuccessMessage(null);

      setActionLoading({
        id: message.id,
        type: "read",
      });

      const updated = await markFeedbackAsRead(message.id);

      setMessages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );

      setSelectedMessage(updated);

      setSuccessMessage("Poruka je označena kao pročitana.");
    } catch (error) {
      await showActionError(error);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleArchive(message: FeedbackMessageDto) {
    const confirmed = await confirm({
      title: "Arhiviranje poruke",

      message: (
        <>
          <p>
            Da li želite da arhivirate ovu{" "}
            <strong>{typeLabels[message.type].toLowerCase()}</strong>?
          </p>

          <p>
            Poruka će biti uklonjena iz glavnog inboxa, ali će ostati dostupna
            kroz arhivirane poruke.
          </p>
        </>
      ),

      confirmText: "Arhiviraj",

      cancelText: "Odustani",

      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);

      setActionLoading({
        id: message.id,
        type: "archive",
      });

      const updated = await archiveFeedback(message.id);

      setMessages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );

      setSelectedMessage(updated);

      setSuccessMessage("Poruka je arhivirana.");
    } catch (error) {
      await showActionError(error);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <main className="admin-feedback-page">
        <section className="admin-feedback-state" aria-live="polite">
          <span className="admin-feedback-state__spinner" aria-hidden="true" />

          <div>
            <strong>Učitavamo poruke korisnika</strong>

            <p>Pripremamo predloge, probleme i ostale povratne informacije.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-feedback-page">
      <section className="admin-feedback-hero">
        <div className="admin-feedback-hero__content">
          <span className="admin-feedback-hero__eyebrow">
            BEEF N&apos; CHICKEN • ADMIN
          </span>

          <h1 className="admin-feedback-hero__title">Sugestije korisnika</h1>

          <p className="admin-feedback-hero__description">
            Pregledajte predloge, prijavljene probleme, pohvale i druge poruke
            koje korisnici šalju direktno iz aplikacije.
          </p>

          <div className="admin-feedback-hero__meta">
            <span className="admin-feedback-hero__new">
              <span aria-hidden="true" />
              {stats.newCount} novih poruka
            </span>

            <span className="admin-feedback-hero__total">
              {stats.total} učitano
            </span>
          </div>
        </div>

        <aside className="admin-feedback-summary">
          <header className="admin-feedback-summary__header">
            <span className="admin-feedback-summary__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M4 5h16v12H9l-5 4V5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />

                <path
                  d="M8 9h8M8 13h5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <span className="admin-feedback-summary__label">INBOX</span>
          </header>

          <div className="admin-feedback-summary__value">
            <strong>{stats.newCount}</strong>

            <span>novih poruka čeka pregled</span>
          </div>

          <footer className="admin-feedback-summary__footer">
            <div>
              <span>Pročitano</span>

              <strong>{stats.readCount}</strong>
            </div>

            <div>
              <span>Arhivirano</span>

              <strong>{stats.archivedCount}</strong>
            </div>

            <button
              type="button"
              className="admin-feedback-summary__refresh"
              disabled={refreshing}
              onClick={() => void loadMessages(false)}
              aria-label="Osveži poruke"
            >
              {refreshing ? (
                <span className="admin-feedback-summary__spinner" />
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
            </button>
          </footer>
        </aside>
      </section>

      <section className="admin-feedback-stats" aria-label="Statistika poruka">
        <article className="admin-feedback-stat">
          <span className="admin-feedback-stat__label">Učitano</span>

          <strong className="admin-feedback-stat__value">{stats.total}</strong>

          <span className="admin-feedback-stat__description">
            Poruke u trenutnom inboxu
          </span>
        </article>

        <article className="admin-feedback-stat admin-feedback-stat--new">
          <span className="admin-feedback-stat__label">Novo</span>

          <strong className="admin-feedback-stat__value">
            {stats.newCount}
          </strong>

          <span className="admin-feedback-stat__description">Čeka pregled</span>
        </article>

        <article className="admin-feedback-stat admin-feedback-stat--read">
          <span className="admin-feedback-stat__label">Pročitano</span>

          <strong className="admin-feedback-stat__value">
            {stats.readCount}
          </strong>

          <span className="admin-feedback-stat__description">
            Pregledane poruke
          </span>
        </article>

        <article className="admin-feedback-stat admin-feedback-stat--archived">
          <span className="admin-feedback-stat__label">Arhivirano</span>

          <strong className="admin-feedback-stat__value">
            {stats.archivedCount}
          </strong>

          <span className="admin-feedback-stat__description">
            Van aktivnog inboxa
          </span>
        </article>
      </section>

      {hasReachedLoadLimit && (
        <div className="admin-feedback-limit-note">
          <span aria-hidden="true">i</span>

          <p>
            Učitano je poslednjih <strong>{FEEDBACK_LOAD_LIMIT}</strong> poruka.
            Kada broj poruka poraste preko ovog limita, ovoj stranici treba
            dodati server-side paginaciju.
          </p>
        </div>
      )}

      <div className="admin-feedback-page__messages" aria-live="polite">
        {successMessage && (
          <div className="admin-feedback-alert admin-feedback-alert--success">
            <span className="admin-feedback-alert__icon" aria-hidden="true">
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
            className="admin-feedback-alert admin-feedback-alert--error"
            role="alert"
          >
            <span className="admin-feedback-alert__icon" aria-hidden="true">
              !
            </span>

            <div>
              <strong>Došlo je do greške</strong>

              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      <section className="admin-feedback-inbox">
        <header className="admin-feedback-inbox__header">
          <div>
            <span className="admin-feedback-inbox__eyebrow">
              POVRATNE INFORMACIJE
            </span>

            <h2 className="admin-feedback-inbox__title">Admin inbox</h2>

            <p>
              Pronađite poruku, pregledajte detalje i promenite njen status.
            </p>
          </div>

          <div className="admin-feedback-inbox__result">
            <strong>{visibleMessages.length}</strong>

            <span>prikazano</span>
          </div>
        </header>

        <div className="admin-feedback-toolbar">
          <div className="admin-feedback-search">
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
              placeholder="Pretraži poruke, korisnike ili email..."
              aria-label="Pretraži sugestije"
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <label className="admin-feedback-toolbar__field">
            <span>Status</span>

            <select
              value={statusFilter}
              onChange={(event) => {
                const nextStatus = event.target.value as StatusFilter;

                setStatusFilter(nextStatus);

                if (nextStatus === "Archived") {
                  setIncludeArchived(true);
                }
              }}
            >
              <option value="All">Svi statusi</option>

              <option value="New">Novo</option>

              <option value="Read">Pročitano</option>

              <option value="Archived">Arhivirano</option>
            </select>
          </label>

          <label className="admin-feedback-toolbar__field">
            <span>Tip</span>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as TypeFilter)
              }
            >
              <option value="All">Svi tipovi</option>

              <option value="Suggestion">Predlog</option>

              <option value="Problem">Problem</option>

              <option value="Praise">Pohvala</option>

              <option value="Other">Ostalo</option>
            </select>
          </label>

          <label className="admin-feedback-toolbar__archive-toggle">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => {
                const checked = event.target.checked;

                setIncludeArchived(checked);

                if (!checked && statusFilter === "Archived") {
                  setStatusFilter("All");
                }
              }}
            />

            <span className="admin-feedback-toolbar__archive-control">
              <span />
            </span>

            <span>Prikaži arhivirane</span>
          </label>

          {hasFilters && (
            <button
              type="button"
              className="admin-feedback-toolbar__clear"
              onClick={clearFilters}
            >
              Poništi filtere
            </button>
          )}
        </div>

        <div className="admin-feedback-layout">
          <aside className="admin-feedback-list" aria-label="Lista poruka">
            {visibleMessages.length === 0 ? (
              <div className="admin-feedback-empty">
                <div className="admin-feedback-empty__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M4 5h16v12H9l-5 4V5Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />

                    <path
                      d="m9 9 6 6m0-6-6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <strong>Nema poruka</strong>

                <p>Promenite filter ili tekst pretrage.</p>
              </div>
            ) : (
              visibleMessages.map((message) => {
                const active = selectedMessage?.id === message.id;

                return (
                  <button
                    key={message.id}
                    type="button"
                    className={[
                      "admin-feedback-list-card",

                      active ? "admin-feedback-list-card--active" : "",

                      message.status === "New"
                        ? "admin-feedback-list-card--new"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedMessage(message)}
                  >
                    <span className="admin-feedback-list-card__header">
                      <span className={getTypeClass(message.type)}>
                        {typeLabels[message.type]}
                      </span>

                      <span className={getStatusClass(message.status)}>
                        {statusLabels[message.status]}
                      </span>
                    </span>

                    <span className="admin-feedback-list-card__sender">
                      <strong>{getSenderName(message)}</strong>

                      <span>{getSenderContact(message)}</span>
                    </span>

                    <span className="admin-feedback-list-card__message">
                      {message.message}
                    </span>

                    <span className="admin-feedback-list-card__footer">
                      <span>{formatDate(message.createdAtUtc)}</span>

                      {message.status === "New" && (
                        <span className="admin-feedback-list-card__unread">
                          Nova
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </aside>

          <article className="admin-feedback-details">
            {!selectedMessage ? (
              <div className="admin-feedback-empty admin-feedback-empty--details">
                <div className="admin-feedback-empty__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M4 5h16v12H9l-5 4V5Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <strong>Izaberite poruku</strong>

                <p>Detalji izabrane poruke pojaviće se ovde.</p>
              </div>
            ) : (
              <>
                <header className="admin-feedback-details__header">
                  <div className="admin-feedback-details__heading">
                    <div className="admin-feedback-details__badges">
                      <span className={getTypeClass(selectedMessage.type)}>
                        {typeLabels[selectedMessage.type]}
                      </span>

                      <span className={getStatusClass(selectedMessage.status)}>
                        {statusLabels[selectedMessage.status]}
                      </span>
                    </div>

                    <span className="admin-feedback-details__eyebrow">
                      PORUKA KORISNIKA
                    </span>

                    <h2>{getSenderName(selectedMessage)}</h2>

                    <p>{formatDate(selectedMessage.createdAtUtc)}</p>
                  </div>
                </header>

                <section className="admin-feedback-details__meta">
                  <div>
                    <span>Korisnik</span>

                    <strong>
                      {selectedMessage.userId
                        ? `ID ${selectedMessage.userId}`
                        : "Gost"}
                    </strong>
                  </div>

                  <div>
                    <span>Kontakt</span>

                    <strong>{getSenderContact(selectedMessage)}</strong>
                  </div>

                  <div>
                    <span>Visitor ID</span>

                    <strong>{selectedMessage.visitorId || "Nema"}</strong>
                  </div>

                  <div>
                    <span>Stranica</span>

                    <strong>{selectedMessage.pageUrl || "Nije poznato"}</strong>
                  </div>
                </section>

                <section className="admin-feedback-details__message">
                  <header>
                    <span>PORUKA</span>

                    <strong>{typeLabels[selectedMessage.type]}</strong>
                  </header>

                  <p>{selectedMessage.message}</p>
                </section>

                <footer className="admin-feedback-details__actions">
                  <div className="admin-feedback-details__action-info">
                    <span>ID poruke</span>

                    <strong>#{selectedMessage.id}</strong>
                  </div>

                  <div className="admin-feedback-details__buttons">
                    {selectedMessage.status === "New" && (
                      <button
                        type="button"
                        className="admin-feedback-button admin-feedback-button--primary"
                        disabled={actionLoading?.id === selectedMessage.id}
                        onClick={() => void handleMarkAsRead(selectedMessage)}
                      >
                        {actionLoading?.id === selectedMessage.id &&
                        actionLoading.type === "read"
                          ? "Označavam..."
                          : "Označi kao pročitano"}
                      </button>
                    )}

                    {selectedMessage.status !== "Archived" && (
                      <button
                        type="button"
                        className="admin-feedback-button admin-feedback-button--danger"
                        disabled={actionLoading?.id === selectedMessage.id}
                        onClick={() => void handleArchive(selectedMessage)}
                      >
                        {actionLoading?.id === selectedMessage.id &&
                        actionLoading.type === "archive"
                          ? "Arhiviram..."
                          : "Arhiviraj"}
                      </button>
                    )}
                  </div>
                </footer>
              </>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}
