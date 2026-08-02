import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getOrderHistory,
  type OrderDetailsDto,
  type OrderHistoryStatusFilter,
  type PagedResultDto,
} from "../api/orderApi";
import { AppRoles } from "../auth/roles";
import { useAuth } from "../auth/AuthContext";
import { useOrderRealtime } from "../realtime/useOrderRealtime";
import "../styles/AdminOrdersHistoryPage.scss";

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error ??
    error?.response?.data?.message ??
    error?.response?.data?.title ??
    error?.message ??
    fallback
  );
}

function formatPrice(value: number) {
  return `${value.toLocaleString("sr-RS")} RSD`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateInputToStartIso(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

function dateInputToEndExclusiveIso(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);

  return date.toISOString();
}

function getStartOfWeek(date: Date) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;

  copy.setDate(copy.getDate() - day);

  return copy;
}

function getOrderLabel(order: OrderDetailsDto) {
  return order.orderNumber ?? String(order.id);
}

function formatStatus(status: OrderDetailsDto["status"]) {
  switch (status) {
    case "Dostavljena":
      return "Dostavljena";

    case "Odbijena":
      return "Odbijena";

    case "Otkazana":
      return "Otkazana";

    case "Na_Cekanju":
      return "Na čekanju";

    case "Prihvacena":
      return "U pripremi";

    case "Spremna_za_preuzimanje":
      return "Spremna za preuzimanje";

    case "Dostava_u_toku":
      return "Dostava u toku";

    default:
      return status;
  }
}

function getStatusModifier(status: OrderDetailsDto["status"]) {
  switch (status) {
    case "Dostavljena":
      return "delivered";

    case "Odbijena":
      return "rejected";

    case "Otkazana":
      return "cancelled";

    default:
      return "default";
  }
}

function formatDateLabel(value: string) {
  if (!value) {
    return "-";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminOrdersHistoryPage() {
  const { isAuthenticated, hasAnyRole } = useAuth();

  const datePresets = useMemo(() => {
    const now = new Date();

    return {
      today: toLocalDateInputValue(now),

      weekStart: toLocalDateInputValue(getStartOfWeek(now)),

      monthStart: toLocalDateInputValue(
        new Date(now.getFullYear(), now.getMonth(), 1),
      ),
    };
  }, []);

  const [fromDate, setFromDate] = useState(datePresets.today);

  const [toDate, setToDate] = useState(datePresets.today);

  const [status, setStatus] = useState<"" | OrderHistoryStatusFilter>("");

  const [orderNumber, setOrderNumber] = useState("");

  const [courierId, setCourierId] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [result, setResult] = useState<PagedResultDto<OrderDetailsDto> | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const isTodaySelected =
    fromDate === datePresets.today && toDate === datePresets.today;

  const isWeekSelected =
    fromDate === datePresets.weekStart && toDate === datePresets.today;

  const isMonthSelected =
    fromDate === datePresets.monthStart && toDate === datePresets.today;

  const hasAdditionalFilters =
    Boolean(status) || Boolean(orderNumber.trim()) || Boolean(courierId.trim());

  const loadHistory = useCallback(
    async (showLoading = true) => {
      try {
        setError(null);

        if (showLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const data = await getOrderHistory({
          from: fromDate ? dateInputToStartIso(fromDate) : undefined,

          to: toDate ? dateInputToEndExclusiveIso(toDate) : undefined,

          status: status || undefined,

          orderNumber: orderNumber.trim() || undefined,

          courierId: courierId.trim() ? Number(courierId) : undefined,

          page,
          pageSize,
        });

        setResult(data);
      } catch (error: any) {
        setError(getErrorMessage(error, "Greška pri učitavanju istorije."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fromDate, toDate, status, orderNumber, courierId, page, pageSize],
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOrderChanged = useCallback(() => {
    loadHistory(false);
  }, [loadHistory]);

  useOrderRealtime({
    enabled: isAuthenticated && hasAnyRole([AppRoles.Admin, AppRoles.Employee]),

    onOrderChanged: handleOrderChanged,
  });

  function applyToday() {
    setFromDate(datePresets.today);
    setToDate(datePresets.today);
    setPage(1);
  }

  function applyThisWeek() {
    setFromDate(datePresets.weekStart);
    setToDate(datePresets.today);
    setPage(1);
  }

  function applyThisMonth() {
    setFromDate(datePresets.monthStart);
    setToDate(datePresets.today);
    setPage(1);
  }

  function resetAdditionalFilters() {
    setStatus("");
    setOrderNumber("");
    setCourierId("");
    setPage(1);
  }

  const items = result?.items ?? [];
  const totalCount = result?.totalCount ?? 0;
  const currentPage = result?.page ?? page;
  const totalPages = result?.totalPages ?? 1;

  return (
    <main className="admin-orders-history-page">
      <header className="admin-orders-history-page__header">
        <div className="admin-orders-history-page__heading">
          <span className="admin-orders-history-page__eyebrow">
            ARHIVA PORUDŽBINA
          </span>

          <h1 className="admin-orders-history-page__title">Istorija</h1>

          <p className="admin-orders-history-page__description">
            Pretražite završene i odbijene porudžbine prema periodu, statusu,
            broju porudžbine ili kuriru.
          </p>
        </div>

        <div className="admin-orders-history-page__header-actions">
          <div className="admin-orders-history-page__realtime">
            <span
              className="admin-orders-history-page__realtime-dot"
              aria-hidden="true"
            />

            <span>Podaci uživo</span>
          </div>

          <button
            type="button"
            className="admin-orders-history-page__refresh-button"
            disabled={loading || refreshing}
            onClick={() => loadHistory(false)}
          >
            {refreshing ? (
              <span
                className="admin-orders-history-page__spinner"
                aria-hidden="true"
              />
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

            <span>{refreshing ? "Osvežavam..." : "Osveži"}</span>
          </button>
        </div>
      </header>

      <section className="admin-history-filter">
        <header className="admin-history-filter__header">
          <div>
            <span className="admin-history-filter__eyebrow">
              PRETRAGA I FILTRIRANJE
            </span>

            <h2 className="admin-history-filter__title">
              Pronađite porudžbine
            </h2>
          </div>

          <span className="admin-history-filter__period">
            {formatDateLabel(fromDate)} – {formatDateLabel(toDate)}
          </span>
        </header>

        <div className="admin-history-filter__presets">
          <button
            type="button"
            className={[
              "admin-history-filter__preset",
              isTodaySelected ? "admin-history-filter__preset--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={applyToday}
          >
            Danas
          </button>

          <button
            type="button"
            className={[
              "admin-history-filter__preset",
              isWeekSelected ? "admin-history-filter__preset--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={applyThisWeek}
          >
            Ova nedelja
          </button>

          <button
            type="button"
            className={[
              "admin-history-filter__preset",
              isMonthSelected ? "admin-history-filter__preset--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={applyThisMonth}
          >
            Ovaj mesec
          </button>

          {hasAdditionalFilters && (
            <button
              type="button"
              className="admin-history-filter__reset-button"
              onClick={resetAdditionalFilters}
            >
              Poništi dodatne filtere
            </button>
          )}
        </div>

        <div className="admin-history-filter__grid">
          <label className="admin-history-filter__field">
            <span className="admin-history-filter__label">Datum od</span>

            <div className="admin-history-filter__control">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="16"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <path
                  d="M8 3v4m8-4v4M3 10h18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>

              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </label>

          <label className="admin-history-filter__field">
            <span className="admin-history-filter__label">Datum do</span>

            <div className="admin-history-filter__control">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="16"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <path
                  d="M8 3v4m8-4v4M3 10h18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>

              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </label>

          <label className="admin-history-filter__field">
            <span className="admin-history-filter__label">Status</span>

            <div className="admin-history-filter__control">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M5 12 9 16 19 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <select
                value={status}
                onChange={(event) => {
                  setStatus(
                    event.target.value as "" | OrderHistoryStatusFilter,
                  );
                  setPage(1);
                }}
              >
                <option value="">Sve završene</option>

                <option value="Dostavljena">Dostavljene</option>

                <option value="Odbijena">Odbijene</option>
              </select>
            </div>
          </label>

          <label className="admin-history-filter__field">
            <span className="admin-history-filter__label">Broj porudžbine</span>

            <div className="admin-history-filter__control">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  cx="10.5"
                  cy="10.5"
                  r="6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <path
                  d="m15.5 15.5 4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>

              <input
                type="text"
                value={orderNumber}
                placeholder="Na primer: 260720"
                onChange={(event) => {
                  setOrderNumber(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </label>

          <label className="admin-history-filter__field">
            <span className="admin-history-filter__label">ID kurira</span>

            <div className="admin-history-filter__control">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M3 16h11V6H3v10Zm11-6h4l3 3v3h-7v-6Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <circle
                  cx="7"
                  cy="18"
                  r="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <circle
                  cx="18"
                  cy="18"
                  r="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
              </svg>

              <input
                type="number"
                min={1}
                value={courierId}
                placeholder="ID"
                onChange={(event) => {
                  setCourierId(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </label>

          <label className="admin-history-filter__field">
            <span className="admin-history-filter__label">
              Rezultata po strani
            </span>

            <div className="admin-history-filter__control">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M5 7h14M5 12h14M5 17h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>

              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </label>
        </div>

        <p className="admin-history-filter__hint">
          Rezultati se automatski osvežavaju nakon promene filtera.
        </p>
      </section>

      {error && (
        <div className="admin-history-alert" role="alert">
          <span className="admin-history-alert__icon" aria-hidden="true">
            !
          </span>

          <div>
            <strong>Istorija nije mogla da se učita</strong>

            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <section className="admin-history-loading" aria-live="polite">
          <span className="admin-history-loading__spinner" aria-hidden="true" />

          <div>
            <strong>Učitavamo istoriju</strong>

            <p>Sačekajte trenutak dok pronađemo porudžbine.</p>
          </div>
        </section>
      ) : items.length === 0 ? (
        <section className="admin-history-empty">
          <div className="admin-history-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M5 4h14v16H5V4Zm3 4h8M8 12h8M8 16h5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <span className="admin-history-empty__eyebrow">NEMA REZULTATA</span>

          <h2 className="admin-history-empty__title">
            Nema odgovarajućih porudžbina
          </h2>

          <p className="admin-history-empty__description">
            Promenite vremenski period ili uklonite neki od dodatnih filtera.
          </p>
        </section>
      ) : (
        <section className="admin-history-results">
          <header className="admin-history-results__header">
            <div>
              <span className="admin-history-results__eyebrow">
                REZULTATI PRETRAGE
              </span>

              <h2 className="admin-history-results__title">
                Završene porudžbine
              </h2>
            </div>

            <div className="admin-history-results__summary">
              <span>Ukupno rezultata</span>

              <strong>{totalCount}</strong>
            </div>
          </header>

          <div className="admin-history-table-wrapper">
            <table className="admin-history-table">
              <thead>
                <tr>
                  <th>Porudžbina</th>
                  <th>Datum</th>
                  <th>Status</th>
                  <th>Adresa</th>
                  <th>Kurir</th>
                  <th>Stavke</th>
                  <th>Ukupno</th>
                </tr>
              </thead>

              <tbody>
                {items.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className="admin-history-table__order">
                        <span>PORUDŽBINA</span>

                        <strong>#{getOrderLabel(order)}</strong>
                      </div>
                    </td>

                    <td>
                      <span className="admin-history-table__date">
                        {formatDateTime(order.createdAt)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`admin-history-status admin-history-status--${getStatusModifier(
                          order.status,
                        )}`}
                      >
                        <span
                          className="admin-history-status__dot"
                          aria-hidden="true"
                        />

                        {formatStatus(order.status)}
                      </span>
                    </td>

                    <td>
                      <div className="admin-history-table__address">
                        <strong>
                          {order.deliveryAddress.street}{" "}
                          {order.deliveryAddress.houseNumber}
                        </strong>

                        <span>
                          {order.deliveryAddress.postalCode}{" "}
                          {order.deliveryAddress.city}
                        </span>
                      </div>
                    </td>

                    <td>
                      {order.courierId ? (
                        <span className="admin-history-table__courier">
                          #{order.courierId}
                        </span>
                      ) : (
                        <span className="admin-history-table__empty-value">
                          Nije dodeljen
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="admin-history-items">
                        {order.items.map((item) => (
                          <span
                            key={item.id}
                            className="admin-history-items__item"
                          >
                            <strong>{item.quantity}×</strong>

                            {item.dishName}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td>
                      <strong className="admin-history-table__price">
                        {formatPrice(order.totalAmount)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="admin-history-pagination">
            <div className="admin-history-pagination__info">
              <span>
                Strana <strong>{currentPage}</strong> od{" "}
                <strong>{totalPages}</strong>
              </span>

              <span>
                Prikazano {items.length} od {totalCount}
              </span>
            </div>

            <div className="admin-history-pagination__actions">
              <button
                type="button"
                disabled={!result?.hasPreviousPage}
                onClick={() =>
                  setPage((currentPageValue) =>
                    Math.max(1, currentPageValue - 1),
                  )
                }
              >
                <span aria-hidden="true">←</span>
                Prethodna
              </button>

              <span className="admin-history-pagination__current">
                {currentPage}
              </span>

              <button
                type="button"
                disabled={!result?.hasNextPage}
                onClick={() =>
                  setPage((currentPageValue) => currentPageValue + 1)
                }
              >
                Sledeća
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </footer>
        </section>
      )}
    </main>
  );
}
