import { useCallback, useEffect, useMemo, useState } from "react";
import { getOrderDashboard, type OrderDashboardDto } from "../api/orderApi";
import { AppRoles } from "../auth/roles";
import { useAuth } from "../auth/AuthContext";
import { useOrderRealtime } from "../realtime/useOrderRealtime";

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

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 10,
        padding: 16,
        background: "white",
      }}
    >
      <div style={{ fontSize: 14, color: "#555" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{value}</div>

      {description && (
        <div style={{ fontSize: 13, color: "#777", marginTop: 6 }}>
          {description}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { isAuthenticated, hasAnyRole } = useAuth();

  const today = useMemo(() => toLocalDateInputValue(new Date()), []);

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [dashboard, setDashboard] = useState<OrderDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

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
      } catch (e: any) {
        setError(getErrorMessage(e, "Greška pri učitavanju dashboard-a."));
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
    const value = toLocalDateInputValue(new Date());

    setFromDate(value);
    setToDate(value);
  }

  function applyThisWeek() {
    const now = new Date();
    const start = getStartOfWeek(now);

    setFromDate(toLocalDateInputValue(start));
    setToDate(toLocalDateInputValue(now));
  }

  function applyThisMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    setFromDate(toLocalDateInputValue(start));
    setToDate(toLocalDateInputValue(now));
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ marginBottom: 4 }}>Dashboard</h2>
          <div style={{ color: "#555", fontSize: 14 }}>
            Pregled prodaje, aktivnih porudžbina i najprodavanijih jela.
          </div>
        </div>

        <button
          type="button"
          disabled={loading || refreshing}
          onClick={() => loadDashboard(false)}
        >
          {refreshing ? "Osvežavam..." : "Osveži"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          padding: 16,
          border: "1px solid #ccc",
          borderRadius: 10,
          marginTop: 16,
          background: "#fafafa",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={applyToday}>
            Danas
          </button>

          <button type="button" onClick={applyThisWeek}>
            Ova nedelja
          </button>

          <button type="button" onClick={applyThisMonth}>
            Ovaj mesec
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label>
            Od:{" "}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>

          <label>
            Do:{" "}
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
        </div>
      </div>

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

      {loading ? (
        <div style={{ marginTop: 16 }}>Učitavam dashboard...</div>
      ) : !dashboard ? (
        <div style={{ marginTop: 16 }}>Nema podataka za prikaz.</div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            <StatCard
              title="Prihod"
              value={formatPrice(dashboard.revenue)}
              description="Računa samo dostavljene porudžbine."
            />

            <StatCard
              title="Porudžbine u periodu"
              value={dashboard.periodTotalOrders}
            />

            <StatCard
              title="Dostavljene"
              value={dashboard.periodDeliveredOrders}
            />

            <StatCard title="Odbijene" value={dashboard.periodRejectedOrders} />

            <StatCard
              title="Prosečna vrednost"
              value={formatPrice(dashboard.averageDeliveredOrderValue)}
              description="Prosek dostavljenih porudžbina."
            />

            <StatCard title="Aktivne trenutno" value={dashboard.activeOrders} />
          </div>

          <h3 style={{ marginTop: 28 }}>Trenutno stanje operative</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 16,
              marginTop: 12,
            }}
          >
            <StatCard title="Na čekanju" value={dashboard.pendingOrders} />
            <StatCard title="U pripremi" value={dashboard.acceptedOrders} />
            <StatCard
              title="Spremne za preuzimanje"
              value={dashboard.readyForPickupOrders}
            />
            <StatCard
              title="Dostava u toku"
              value={dashboard.deliveryInProgressOrders}
            />
          </div>

          <h3 style={{ marginTop: 28 }}>Top 5 jela</h3>

          {dashboard.topDishes.length === 0 ? (
            <div>Nema dostavljenih porudžbina za izabrani period.</div>
          ) : (
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 600,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        borderBottom: "1px solid #ccc",
                        padding: 8,
                      }}
                    >
                      Jelo
                    </th>

                    <th
                      style={{
                        textAlign: "right",
                        borderBottom: "1px solid #ccc",
                        padding: 8,
                      }}
                    >
                      Količina
                    </th>

                    <th
                      style={{
                        textAlign: "right",
                        borderBottom: "1px solid #ccc",
                        padding: 8,
                      }}
                    >
                      Prihod
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {dashboard.topDishes.map((dish) => (
                    <tr key={dish.dishName}>
                      <td
                        style={{
                          padding: 8,
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        {dish.dishName}
                      </td>

                      <td
                        style={{
                          padding: 8,
                          borderBottom: "1px solid #eee",
                          textAlign: "right",
                          fontWeight: 700,
                        }}
                      >
                        {dish.quantity}
                      </td>

                      <td
                        style={{
                          padding: 8,
                          borderBottom: "1px solid #eee",
                          textAlign: "right",
                          fontWeight: 700,
                        }}
                      >
                        {formatPrice(dish.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
