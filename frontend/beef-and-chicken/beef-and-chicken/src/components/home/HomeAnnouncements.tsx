import { useEffect, useState } from "react";
import {
  getActiveAnnouncements,
  type AnnouncementDto,
  type AnnouncementType,
} from "../../api/announcementApi";
import { getApiErrorMessage } from "../../utils/apiErrors";

function getTypeLabel(type: AnnouncementType) {
  switch (type) {
    case "Important":
      return "Važno";
    case "Promotion":
      return "Akcija";
    case "NewItem":
      return "Novo u ponudi";
    case "Holiday":
      return "Neradni dani";
    case "Delivery":
      return "Dostava";
    case "Info":
    default:
      return "Obaveštenje";
  }
}

function getAnnouncementIcon(type: AnnouncementType) {
  switch (type) {
    case "Important":
      return "⚠";
    case "Promotion":
      return "🔥";
    case "NewItem":
      return "🍔";
    case "Holiday":
      return "📅";
    case "Delivery":
      return "🛵";
    case "Info":
    default:
      return "ℹ";
  }
}

function formatDate(value?: string | null) {
  if (!value) return null;

  return new Date(value).toLocaleDateString("sr-RS");
}

export default function HomeAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnnouncements() {
      try {
        setLoading(true);
        setError(null);

        const data = await getActiveAnnouncements();

        setAnnouncements(data);
      } catch (e) {
        setError(getApiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    }

    loadAnnouncements();
  }, []);

  if (loading) {
    return null;
  }

  if (error) {
    return null;
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <section style={{ marginBottom: 24 }}>
      <h2>Novosti i obaveštenja</h2>

      <div style={{ display: "grid", gap: 12 }}>
        {announcements.map((announcement) => (
          <article
            key={announcement.id}
            style={{
              border: announcement.isPinned
                ? "2px solid #d97706"
                : "1px solid #ddd",
              borderRadius: 10,
              padding: 14,
              background: announcement.isPinned ? "#fff7ed" : "white",
              display: "grid",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <strong>
                {getAnnouncementIcon(announcement.type)} {announcement.title}
              </strong>

              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: announcement.isPinned ? "#d97706" : "#555",
                }}
              >
                {announcement.isPinned
                  ? "Važno"
                  : getTypeLabel(announcement.type)}
              </span>
            </div>

            <p style={{ margin: 0 }}>{announcement.content}</p>

            {announcement.endsAt && (
              <div style={{ color: "#777", fontSize: 13 }}>
                Važi do: {formatDate(announcement.endsAt)}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
