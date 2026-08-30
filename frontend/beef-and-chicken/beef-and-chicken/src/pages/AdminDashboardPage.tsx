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
  compact?: boolean;
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
    return "—";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatCard({
  title,
  value,
  description,
  variant,
  icon,
  compact = false,
}: StatCardProps) {
  return (
    <article
      className={[
        "admin-stat-card",
        `admin-stat-card--${variant}`,
        compact ? "admin-stat-card--compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="admin-stat-card__top">
        <span className="admin-stat-card__icon" aria-hidden="true">
          {icon}
        </span>

        <span className="admin-stat-card__indicator" aria-hidden="true" />
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

    return {
      today: toLocalDateInputValue(now),
      startOfWeek: toLocalDateInputValue(getStartOfWeek(now)),
      startOfMonth: toLocalDateInputValue(
        new Date(now.getFullYear(), now.getMonth(), 1),
      ),
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

  const selectedPeriodLabel = useMemo(() => {
    if (isTodaySelected) {
      return "Danas";
    }

    if (isWeekSelected) {
      return "Ova nedelja";
    }

    if (isMonthSelected) {
      return "Ovaj mesec";
    }

    return "Prilagođeni period";
  }, [isTodaySelected, isWeekSelected, isMonthSelected]);

  const loadDashboard = useCallback(
    async (showInitialLoading = true) => {
      try {
        setError(null);

        if (showInitialLoading) {
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
    void loadDashboard();
  }, [loadDashboard]);

  const handleOrderChanged = useCallback(() => {
    void loadDashboard(false);
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
      <section className="admin-dashboard-hero">
        <div className="admin-dashboard-hero__content">
          <span className="admin-dashboard-hero__eyebrow">
            BEEF N&apos; CHICKEN • ADMIN
          </span>

          <h1 className="admin-dashboard-hero__title">Kontrolni centar</h1>

          <p className="admin-dashboard-hero__description">
            Pratite prodaju, promet i trenutno stanje porudžbina iz jednog
            centralnog pregleda.
          </p>

          <div className="admin-dashboard-hero__meta">
            <span className="admin-dashboard-hero__meta-item">
              <span
                className="admin-dashboard-hero__meta-dot"
                aria-hidden="true"
              />
              Sistem prati porudžbine uživo
            </span>

            <span className="admin-dashboard-hero__period">
              {selectedPeriodLabel}
            </span>
          </div>
        </div>

        <aside className="admin-dashboard-live-panel">
          <div className="admin-dashboard-live-panel__header">
            <span
              className="admin-dashboard-live-panel__icon"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24">
                <path
                  d="M6 4h12l1 16H5L6 4Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
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
            </span>

            <span className="admin-dashboard-live-panel__status">
              <span aria-hidden="true" />
              LIVE
            </span>
          </div>

          <div className="admin-dashboard-live-panel__value">
            <strong>{loading ? "—" : (dashboard?.activeOrders ?? 0)}</strong>

            <span>aktivnih porudžbina</span>
          </div>

          <div className="admin-dashboard-live-panel__footer">
            <div>
              <span>Status sistema</span>
              <strong>{refreshing ? "Sinhronizacija..." : "Povezano"}</strong>
            </div>

            <button
              type="button"
              className="admin-dashboard-live-panel__refresh"
              disabled={loading || refreshing}
              onClick={() => void loadDashboard(false)}
              aria-label="Osveži dashboard"
            >
              {refreshing ? (
                <span className="admin-dashboard-spinner" />
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
          </div>
        </aside>
      </section>

      <section className="admin-dashboard-filter">
        <header className="admin-dashboard-filter__header">
          <div>
            <span className="admin-dashboard-filter__eyebrow">
              PERIOD IZVEŠTAJA
            </span>

            <h2>Analizirajte prodaju</h2>

            <p>Izaberite brzi period ili unesite sopstveni raspon datuma.</p>
          </div>

          <div className="admin-dashboard-filter__period">
            <span>{selectedPeriodLabel}</span>

            <strong>
              {formatDateLabel(fromDate)} – {formatDateLabel(toDate)}
            </strong>
          </div>
        </header>

        <div className="admin-dashboard-filter__body">
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
              <span>Datum od</span>

              <div className="admin-dashboard-filter__input">
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
                  max={toDate || datePresets.today}
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </div>
            </label>

            <span className="admin-dashboard-filter__arrow" aria-hidden="true">
              →
            </span>

            <label className="admin-dashboard-filter__field">
              <span>Datum do</span>

              <div className="admin-dashboard-filter__input">
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
                  max={datePresets.today}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </div>
            </label>
          </div>
        </div>

        <div className="admin-dashboard-filter__footer">
          <span className="admin-dashboard-filter__auto">
            <span aria-hidden="true" />
            Izveštaj se automatski osvežava nakon promene datuma.
          </span>

          {refreshing && (
            <span className="admin-dashboard-filter__refreshing">
              Sinhronizujem podatke...
            </span>
          )}
        </div>
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
          <span className="admin-dashboard-loading__spinner" />

          <div>
            <strong>Pripremamo dashboard</strong>

            <p>Učitavamo prodajne i operativne podatke za izabrani period.</p>
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

          <span>NEMA PODATAKA</span>

          <h2>Izveštaj nije dostupan</h2>

          <p>
            Promenite izabrani period ili pokušajte ponovo da osvežite
            dashboard.
          </p>
        </section>
      ) : (
        <>
          <section className="admin-dashboard-section">
            <header className="admin-dashboard-section__header">
              <div>
                <span className="admin-dashboard-section__eyebrow">
                  POSLOVNI REZULTATI
                </span>

                <h2>Prodaja u izabranom periodu</h2>

                <p>Ključni pokazatelji prodaje i uspešnosti porudžbina.</p>
              </div>

              <span className="admin-dashboard-section__period">
                {formatDateLabel(fromDate)} – {formatDateLabel(toDate)}
              </span>
            </header>

            <div className="admin-dashboard-stats">
              <StatCard
                title="Ukupan prihod"
                value={formatPrice(dashboard.revenue)}
                description="Prihod samo od uspešno dostavljenih porudžbina."
                variant="revenue"
                icon={
                  <svg viewBox="0 0 24 24">
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <path
                      d="M7 12h10M12 9v6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              />

              <StatCard
                title="Ukupno porudžbina"
                value={dashboard.periodTotalOrders}
                description="Sve kreirane porudžbine u izabranom periodu."
                variant="orders"
                icon={
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M6 4h12l1 16H5L6 4Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
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
                description="Uspešno završene porudžbine."
                variant="delivered"
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
                      d="m8.5 12 2.2 2.2 4.8-5"
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
                description="Porudžbine koje nisu realizovane."
                variant="rejected"
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
                      d="m9 9 6 6m0-6-6 6"
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
                description="Prosečna vrednost uspešno dostavljene porudžbine."
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
                title="Aktivne sada"
                value={dashboard.activeOrders}
                description="Porudžbine koje trenutno zahtevaju operativnu pažnju."
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
                    />
                  </svg>
                }
              />
            </div>
          </section>

          <section className="admin-dashboard-section admin-dashboard-section--operations">
            <header className="admin-dashboard-section__header">
              <div>
                <span className="admin-dashboard-section__eyebrow">
                  OPERATIVA UŽIVO
                </span>

                <h2>Tok aktivnih porudžbina</h2>

                <p>Trenutno opterećenje restorana i dostave.</p>
              </div>

              <div className="admin-dashboard-section__live">
                <span aria-hidden="true" />
                SignalR povezivanje aktivno
              </div>
            </header>

            <div className="admin-dashboard-stats admin-dashboard-stats--operations">
              <StatCard
                title="Na čekanju"
                value={dashboard.pendingOrders}
                variant="pending"
                compact
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
                    />
                  </svg>
                }
              />

              <StatCard
                title="U pripremi"
                value={dashboard.acceptedOrders}
                variant="preparing"
                compact
                icon={
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M5 17h14M7 17a5 5 0 0 1 10 0M12 8v2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
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
                title="Spremne"
                value={dashboard.readyForPickupOrders}
                variant="ready"
                compact
                icon={
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M6 4h12l1 16H5L6 4Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
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
                compact
                icon={
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M3 16h11V6H3v10Zm11-6h4l3 3v3h-7v-6Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
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

                <h2>Najprodavanija jela</h2>

                <p>
                  Top 5 jela prema količini prodatih proizvoda u dostavljenim
                  porudžbinama.
                </p>
              </div>

              <div className="admin-top-dishes__summary">
                <span>Prikazano</span>

                <strong>{dashboard.topDishes.length}</strong>

                <small>od maksimalno 5</small>
              </div>
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
                      <th>Pozicija</th>
                      <th>Jelo</th>
                      <th>Prodato</th>
                      <th>Prihod</th>
                    </tr>
                  </thead>

                  <tbody>
                    {dashboard.topDishes.map((dish, index) => (
                      <tr key={dish.dishName}>
                        <td>
                          <span
                            className={[
                              "admin-top-dishes__rank",
                              index === 0
                                ? "admin-top-dishes__rank--first"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
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
