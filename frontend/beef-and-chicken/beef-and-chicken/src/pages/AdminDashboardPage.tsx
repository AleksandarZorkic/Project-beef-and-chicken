import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getOrderDashboard, type OrderDashboardDto } from "../api/orderApi";
import { AppRoles } from "../auth/roles";
import { useAuth } from "../auth/AuthContext";
import { useOrderRealtime } from "../realtime/useOrderRealtime";
import "../styles/AdminDashboardPage.scss";

type StatCardVariant =
  | "revenue"
  | "orders"
  | "delivered"
  | "rejected"
  | "average"
  | "active"
  | "pending"
  | "preparing"
  | "ready"
  | "delivery";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  variant: StatCardVariant;
  icon: ReactNode;
};

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

function StatCard({ title, value, description, variant, icon }: StatCardProps) {
  return (
    <article className={`admin-stat-card admin-stat-card--${variant}`}>
      <div className="admin-stat-card__top">
        <span className="admin-stat-card__icon" aria-hidden="true">
          {icon}
        </span>

        <span className="admin-stat-card__indicator" />
      </div>

      <div className="admin-stat-card__content">
        <span className="admin-stat-card__title">{title}</span>

        <strong className="admin-stat-card__value">{value}</strong>

        {description && (
          <p className="admin-stat-card__description">{description}</p>
        )}
      </div>
    </article>
  );
}

export default function AdminDashboardPage() {
  const { isAuthenticated, hasAnyRole } = useAuth();

  const datePresets = useMemo(() => {
    const now = new Date();
    const today = toLocalDateInputValue(now);

    const startOfWeek = toLocalDateInputValue(getStartOfWeek(now));

    const startOfMonth = toLocalDateInputValue(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );

    return {
      today,
      startOfWeek,
      startOfMonth,
    };
  }, []);

  const [fromDate, setFromDate] = useState(datePresets.today);
  const [toDate, setToDate] = useState(datePresets.today);

  const [dashboard, setDashboard] = useState<OrderDashboardDto | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const isTodaySelected =
    fromDate === datePresets.today && toDate === datePresets.today;

  const isWeekSelected =
    fromDate === datePresets.startOfWeek && toDate === datePresets.today;

  const isMonthSelected =
    fromDate === datePresets.startOfMonth && toDate === datePresets.today;

  const loadDashboard = useCallback(
    async (showLoading = true) => {
      try {
        setError(null);

        if (showLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const data = await getOrderDashboard({
          from: fromDate ? dateInputToStartIso(fromDate) : undefined,
          to: toDate ? dateInputToEndExclusiveIso(toDate) : undefined,
        });

        setDashboard(data);
      } catch (error: any) {
        setError(getErrorMessage(error, "Greška pri učitavanju dashboard-a."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fromDate, toDate],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleOrderChanged = useCallback(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  useOrderRealtime({
    enabled: isAuthenticated && hasAnyRole([AppRoles.Admin, AppRoles.Employee]),
    onOrderChanged: handleOrderChanged,
  });

  function applyToday() {
    setFromDate(datePresets.today);
    setToDate(datePresets.today);
  }

  function applyThisWeek() {
    setFromDate(datePresets.startOfWeek);
    setToDate(datePresets.today);
  }

  function applyThisMonth() {
    setFromDate(datePresets.startOfMonth);
    setToDate(datePresets.today);
  }

  return (
    <main className="admin-dashboard-page">
      <header className="admin-dashboard-page__header">
        <div className="admin-dashboard-page__heading">
          <span className="admin-dashboard-page__eyebrow">
            ADMINISTRATIVNI PREGLED
          </span>

          <h1 className="admin-dashboard-page__title">Dashboard</h1>

          <p className="admin-dashboard-page__description">
            Pregled prodaje, aktivnih porudžbina, operativnog stanja i
            najprodavanijih jela.
          </p>
        </div>

        <div className="admin-dashboard-page__header-actions">
          <div className="admin-dashboard-page__realtime">
            <span
              className="admin-dashboard-page__realtime-dot"
              aria-hidden="true"
            />

            <span>Podaci uživo</span>
          </div>

          <button
            type="button"
            className="admin-dashboard-page__refresh-button"
            disabled={loading || refreshing}
            onClick={() => loadDashboard(false)}
          >
            {refreshing ? (
              <span
                className="admin-dashboard-page__spinner"
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

            <span>{refreshing ? "Osvežavam..." : "Osveži podatke"}</span>
          </button>
        </div>
      </header>

      <section className="admin-dashboard-filter">
        <header className="admin-dashboard-filter__header">
          <div>
            <span className="admin-dashboard-filter__eyebrow">
              PERIOD IZVEŠTAJA
            </span>

            <h2 className="admin-dashboard-filter__title">
              Izaberite vremenski period
            </h2>
          </div>

          <span className="admin-dashboard-filter__current-period">
            {formatDateLabel(fromDate)} – {formatDateLabel(toDate)}
          </span>
        </header>

        <div className="admin-dashboard-filter__content">
          <div className="admin-dashboard-filter__presets">
            <button
              type="button"
              className={[
                "admin-dashboard-filter__preset",
                isTodaySelected ? "admin-dashboard-filter__preset--active" : "",
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
                "admin-dashboard-filter__preset",
                isWeekSelected ? "admin-dashboard-filter__preset--active" : "",
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
                "admin-dashboard-filter__preset",
                isMonthSelected ? "admin-dashboard-filter__preset--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={applyThisMonth}
            >
              Ovaj mesec
            </button>
          </div>

          <div className="admin-dashboard-filter__dates">
            <label className="admin-dashboard-filter__field">
              <span className="admin-dashboard-filter__label">Datum od</span>

              <div className="admin-dashboard-filter__input-wrapper">
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
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </div>
            </label>

            <span
              className="admin-dashboard-filter__separator"
              aria-hidden="true"
            >
              →
            </span>

            <label className="admin-dashboard-filter__field">
              <span className="admin-dashboard-filter__label">Datum do</span>

              <div className="admin-dashboard-filter__input-wrapper">
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
                  onChange={(event) => setToDate(event.target.value)}
                />
              </div>
            </label>
          </div>
        </div>

        <p className="admin-dashboard-filter__hint">
          Podaci se automatski osvežavaju nakon promene perioda.
        </p>
      </section>

      {error && (
        <div className="admin-dashboard-alert" role="alert">
          <span className="admin-dashboard-alert__icon" aria-hidden="true">
            !
          </span>

          <div>
            <strong>Dashboard nije mogao da se učita</strong>

            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <section className="admin-dashboard-loading" aria-live="polite">
          <span
            className="admin-dashboard-loading__spinner"
            aria-hidden="true"
          />

          <div>
            <strong>Učitavamo dashboard</strong>

            <p>Sačekajte trenutak dok pripremimo izveštaj.</p>
          </div>
        </section>
      ) : !dashboard ? (
        <section className="admin-dashboard-empty">
          <div className="admin-dashboard-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M4 19V9m6 10V5m6 14v-7m4 7H2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <span className="admin-dashboard-empty__eyebrow">NEMA PODATAKA</span>

          <h2 className="admin-dashboard-empty__title">
            Izveštaj nije dostupan
          </h2>

          <p className="admin-dashboard-empty__description">
            Promenite izabrani period ili osvežite podatke.
          </p>
        </section>
      ) : (
        <>
          <section className="admin-dashboard-section">
            <header className="admin-dashboard-section__header">
              <div>
                <span className="admin-dashboard-section__eyebrow">
                  REZULTATI PRODAJE
                </span>

                <h2 className="admin-dashboard-section__title">
                  Pregled izabranog perioda
                </h2>
              </div>

              <span className="admin-dashboard-section__period">
                {formatDateLabel(fromDate)} – {formatDateLabel(toDate)}
              </span>
            </header>

            <div className="admin-dashboard-stats">
              <StatCard
                title="Ukupan prihod"
                value={formatPrice(dashboard.revenue)}
                description="Računaju se samo dostavljene porudžbine."
                variant="revenue"
                icon={
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M4 7h16v11H4V7Zm3-3h10v3H7V4Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <circle
                      cx="12"
                      cy="12.5"
                      r="2.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>
                }
              />

              <StatCard
                title="Porudžbine u periodu"
                value={dashboard.periodTotalOrders}
                variant="orders"
                icon={
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M6 4h12l1 16H5L6 4Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M9 8a3 3 0 0 0 6 0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              />

              <StatCard
                title="Dostavljene"
                value={dashboard.periodDeliveredOrders}
                variant="delivered"
                icon={
                  <svg viewBox="0 0 24 24">
                    <path
                      d="m5 12 4 4L19 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />

              <StatCard
                title="Odbijene"
                value={dashboard.periodRejectedOrders}
                variant="rejected"
                icon={
                  <svg viewBox="0 0 24 24">
                    <path
                      d="m7 7 10 10M17 7 7 17"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              />

              <StatCard
                title="Prosečna vrednost"
                value={formatPrice(dashboard.averageDeliveredOrderValue)}
                description="Prosek dostavljenih porudžbina."
                variant="average"
                icon={
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M4 18 9 13l4 3 7-9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M16 7h4v4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />

              <StatCard
                title="Aktivne trenutno"
                value={dashboard.activeOrders}
                description="Sve porudžbine koje još nisu završene."
                variant="active"
                icon={
                  <svg viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <path
                      d="M12 7.5V12l3 2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />
            </div>
          </section>

          <section className="admin-dashboard-section">
            <header className="admin-dashboard-section__header">
              <div>
                <span className="admin-dashboard-section__eyebrow">
                  OPERATIVA UŽIVO
                </span>

                <h2 className="admin-dashboard-section__title">
                  Trenutno stanje porudžbina
                </h2>
              </div>

              <div className="admin-dashboard-section__live">
                <span aria-hidden="true" />
                Automatski se ažurira
              </div>
            </header>

            <div className="admin-dashboard-stats admin-dashboard-stats--operations">
              <StatCard
                title="Na čekanju"
                value={dashboard.pendingOrders}
                variant="pending"
                icon={
                  <svg viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <path
                      d="M12 7.5V12l3 2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />

              <StatCard
                title="U pripremi"
                value={dashboard.acceptedOrders}
                variant="preparing"
                icon={
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M5 17h14M7 17a5 5 0 0 1 10 0M12 8v2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M9 5c0 1 1 1.3 1 2.3M14 5c0 1 1 1.3 1 2.3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              />

              <StatCard
                title="Spremne za preuzimanje"
                value={dashboard.readyForPickupOrders}
                variant="ready"
                icon={
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M6 4h12l1 16H5L6 4Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="m9 13 2 2 4-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />

              <StatCard
                title="Dostava u toku"
                value={dashboard.deliveryInProgressOrders}
                variant="delivery"
                icon={
                  <svg viewBox="0 0 24 24">
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
                }
              />
            </div>
          </section>

          <section className="admin-top-dishes">
            <header className="admin-top-dishes__header">
              <div>
                <span className="admin-top-dishes__eyebrow">
                  ANALITIKA MENIJA
                </span>

                <h2 className="admin-top-dishes__title">Top 5 jela</h2>

                <p className="admin-top-dishes__description">
                  Najprodavanija jela prema dostavljenim porudžbinama u
                  izabranom periodu.
                </p>
              </div>

              <span className="admin-top-dishes__count">
                {dashboard.topDishes.length}
              </span>
            </header>

            {dashboard.topDishes.length === 0 ? (
              <div className="admin-top-dishes__empty">
                <div
                  className="admin-top-dishes__empty-icon"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M4 18V9m5 9V6m5 12v-5m5 5V3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <strong>Nema podataka o prodaji</strong>

                <p>U izabranom periodu nema dostavljenih porudžbina.</p>
              </div>
            ) : (
              <div className="admin-top-dishes__table-wrapper">
                <table className="admin-top-dishes__table">
                  <thead>
                    <tr>
                      <th>Rang</th>
                      <th>Jelo</th>
                      <th>Količina</th>
                      <th>Prihod</th>
                    </tr>
                  </thead>

                  <tbody>
                    {dashboard.topDishes.map((dish, index) => (
                      <tr key={dish.dishName}>
                        <td>
                          <span className="admin-top-dishes__rank">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </td>

                        <td>
                          <strong className="admin-top-dishes__dish-name">
                            {dish.dishName}
                          </strong>
                        </td>

                        <td>
                          <span className="admin-top-dishes__quantity">
                            {dish.quantity}
                          </span>
                        </td>

                        <td>
                          <strong className="admin-top-dishes__revenue">
                            {formatPrice(dish.revenue)}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
