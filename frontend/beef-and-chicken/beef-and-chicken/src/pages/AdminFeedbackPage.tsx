import { useEffect, useMemo, useState } from "react";
import {
  archiveFeedback,
  getAdminFeedback,
  markFeedbackAsRead,
  type FeedbackMessageDto,
  type FeedbackMessageStatus,
  type FeedbackMessageType,
} from "../api/feedbackApi";
import { getApiErrorMessage } from "../utils/apiErrors";
import "../styles/AdminFeedbackPage.scss";

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
  return new Intl.DateTimeFormat("sr-RS", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSenderLabel(message: FeedbackMessageDto) {
  if (message.userEmail || message.userName) {
    return message.userEmail ?? message.userName ?? "Korisnik";
  }

  if (message.contactEmail) {
    return message.contactEmail;
  }

  return "Gost";
}

function getStatusClass(status: FeedbackMessageStatus) {
  return `admin-feedback-status admin-feedback-status--${status.toLowerCase()}`;
}

export default function AdminFeedbackPage() {
  const [messages, setMessages] = useState<FeedbackMessageDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    FeedbackMessageStatus | "All"
  >("All");
  const [typeFilter, setTypeFilter] = useState<FeedbackMessageType | "All">(
    "All",
  );
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedMessage, setSelectedMessage] =
    useState<FeedbackMessageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadMessages() {
    try {
      setLoading(true);
      setError(null);

      const data = await getAdminFeedback({
        status: statusFilter === "All" ? undefined : statusFilter,
        type: typeFilter === "All" ? undefined : typeFilter,
        includeArchived,
        take: 150,
      });

      setMessages(data);

      setSelectedMessage((current) => {
        if (!current) {
          return data[0] ?? null;
        }

        return (
          data.find((message) => message.id === current.id) ?? data[0] ?? null
        );
      });
    } catch (err: any) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, includeArchived]);

  const stats = useMemo(() => {
    return {
      total: messages.length,
      newCount: messages.filter((message) => message.status === "New").length,
      readCount: messages.filter((message) => message.status === "Read").length,
      archivedCount: messages.filter((message) => message.status === "Archived")
        .length,
    };
  }, [messages]);

  async function handleMarkAsRead(message: FeedbackMessageDto) {
    try {
      setActionLoadingId(message.id);

      const updated = await markFeedbackAsRead(message.id);

      setMessages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );

      setSelectedMessage(updated);
    } catch (err: any) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleArchive(message: FeedbackMessageDto) {
    try {
      setActionLoadingId(message.id);

      const updated = await archiveFeedback(message.id);

      setMessages((current) =>
        includeArchived
          ? current.map((item) => (item.id === updated.id ? updated : item))
          : current.filter((item) => item.id !== updated.id),
      );

      setSelectedMessage((current) => {
        if (!current || current.id !== updated.id) {
          return current;
        }

        const nextMessages = messages.filter((item) => item.id !== updated.id);
        return nextMessages[0] ?? null;
      });
    } catch (err: any) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <main className="admin-feedback-page">
      <section className="admin-feedback-hero">
        <div>
          <span className="admin-feedback-hero__eyebrow">Admin inbox</span>

          <h1>Sugestije korisnika</h1>

          <p>
            Pregledajte predloge, probleme i komentare koje korisnici šalju iz
            aplikacije.
          </p>
        </div>

        <button
          type="button"
          className="admin-feedback-hero__refresh"
          onClick={() => void loadMessages()}
          disabled={loading}
        >
          {loading ? "Učitavam..." : "Osveži"}
        </button>
      </section>

      <section
        className="admin-feedback-stats"
        aria-label="Statistika sugestija"
      >
        <article>
          <span>Ukupno</span>
          <strong>{stats.total}</strong>
        </article>

        <article>
          <span>Novo</span>
          <strong>{stats.newCount}</strong>
        </article>

        <article>
          <span>Pročitano</span>
          <strong>{stats.readCount}</strong>
        </article>

        <article>
          <span>Arhivirano</span>
          <strong>{stats.archivedCount}</strong>
        </article>
      </section>

      <section className="admin-feedback-toolbar">
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as FeedbackMessageStatus | "All",
              )
            }
          >
            <option value="All">Svi statusi</option>
            <option value="New">Novo</option>
            <option value="Read">Pročitano</option>
            <option value="Archived">Arhivirano</option>
          </select>
        </label>

        <label>
          Tip
          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as FeedbackMessageType | "All")
            }
          >
            <option value="All">Svi tipovi</option>
            <option value="Suggestion">Predlog</option>
            <option value="Problem">Problem</option>
            <option value="Praise">Pohvala</option>
            <option value="Other">Ostalo</option>
          </select>
        </label>

        <label className="admin-feedback-toolbar__checkbox">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          Prikaži arhivirane
        </label>
      </section>

      {error && (
        <div className="admin-feedback-error" role="alert">
          <span aria-hidden="true">!</span>
          <p>{error}</p>
        </div>
      )}

      <section className="admin-feedback-layout">
        <div className="admin-feedback-list" aria-label="Lista sugestija">
          {loading && (
            <div className="admin-feedback-empty">
              <p>Učitavam sugestije...</p>
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="admin-feedback-empty">
              <p>Nema sugestija za izabrane filtere.</p>
            </div>
          )}

          {!loading &&
            messages.map((message) => {
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
                  <span className="admin-feedback-list-card__top">
                    <strong>{typeLabels[message.type]}</strong>

                    <span className={getStatusClass(message.status)}>
                      {statusLabels[message.status]}
                    </span>
                  </span>

                  <span className="admin-feedback-list-card__sender">
                    {getSenderLabel(message)}
                  </span>

                  <span className="admin-feedback-list-card__message">
                    {message.message}
                  </span>

                  <span className="admin-feedback-list-card__date">
                    {formatDate(message.createdAtUtc)}
                  </span>
                </button>
              );
            })}
        </div>

        <article className="admin-feedback-details">
          {!selectedMessage ? (
            <div className="admin-feedback-empty admin-feedback-empty--details">
              <p>Izaberite sugestiju za pregled.</p>
            </div>
          ) : (
            <>
              <header className="admin-feedback-details__header">
                <div>
                  <span className="admin-feedback-details__eyebrow">
                    {typeLabels[selectedMessage.type]}
                  </span>

                  <h2>{getSenderLabel(selectedMessage)}</h2>

                  <p>{formatDate(selectedMessage.createdAtUtc)}</p>
                </div>

                <span className={getStatusClass(selectedMessage.status)}>
                  {statusLabels[selectedMessage.status]}
                </span>
              </header>

              <div className="admin-feedback-details__meta">
                <div>
                  <span>Korisnik</span>
                  <strong>
                    {selectedMessage.userId
                      ? `ID ${selectedMessage.userId}`
                      : "Gost"}
                  </strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>
                    {selectedMessage.userEmail ||
                      selectedMessage.contactEmail ||
                      "Nije ostavljen"}
                  </strong>
                </div>

                <div>
                  <span>Visitor ID</span>
                  <strong>{selectedMessage.visitorId || "Nema"}</strong>
                </div>

                <div>
                  <span>Stranica</span>
                  <strong>{selectedMessage.pageUrl || "Nije poznato"}</strong>
                </div>
              </div>

              <div className="admin-feedback-details__message">
                <span>Poruka</span>
                <p>{selectedMessage.message}</p>
              </div>

              <footer className="admin-feedback-details__actions">
                {selectedMessage.status === "New" && (
                  <button
                    type="button"
                    className="admin-feedback-details__secondary"
                    disabled={actionLoadingId === selectedMessage.id}
                    onClick={() => void handleMarkAsRead(selectedMessage)}
                  >
                    Označi kao pročitano
                  </button>
                )}

                {selectedMessage.status !== "Archived" && (
                  <button
                    type="button"
                    className="admin-feedback-details__danger"
                    disabled={actionLoadingId === selectedMessage.id}
                    onClick={() => void handleArchive(selectedMessage)}
                  >
                    Arhiviraj
                  </button>
                )}
              </footer>
            </>
          )}
        </article>
      </section>
    </main>
  );
}
