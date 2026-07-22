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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("sr-RS");
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

export default function AdminOrdersHistoryPage() {
  const { isAuthenticated, hasAnyRole } = useAuth();

  const today = useMemo(() => toLocalDateInputValue(new Date()), []);

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [status, setStatus] = useState<"" | OrderHistoryStatusFilter>("");
  const [orderNumber, setOrderNumber] = useState("");
  const [courierId, setCourierId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [result, setResult] = useState<PagedResultDto<OrderDetailsDto> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(
    async (showLoading = true) => {
      try {
        setError(null);

        if (showLoading) {
          setLoading(true);
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
      } catch (e: any) {
        setError(getErrorMessage(e, "Greška pri učitavanju istorije."));
      } finally {
        if (showLoading) {
          setLoading(false);
        }
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
    const value = toLocalDateInputValue(new Date());

    setFromDate(value);
    setToDate(value);
    setPage(1);
  }

  function applyThisWeek() {
    const now = new Date();
    const start = getStartOfWeek(now);

    setFromDate(toLocalDateInputValue(start));
    setToDate(toLocalDateInputValue(now));
    setPage(1);
  }

  function applyThisMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    setFromDate(toLocalDateInputValue(start));
    setToDate(toLocalDateInputValue(now));
    setPage(1);
  }

  const items = result?.items ?? [];

  return (
    <div>
      <h2>Istorija porudžbina</h2>

      <div
        style={{
          display: "grid",
          gap: 12,
          padding: 16,
          border: "1px solid #ccc",
          borderRadius: 8,
          marginTop: 12,
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
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
          </label>

          <label>
            Do:{" "}
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </label>

          <label>
            Status:{" "}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as "" | OrderHistoryStatusFilter);
                setPage(1);
              }}
            >
              <option value="">Sve završene</option>
              <option value="Dostavljena">Dostavljene</option>
              <option value="Odbijena">Odbijene</option>
            </select>
          </label>

          <label>
            Broj porudžbine:{" "}
            <input
              type="text"
              value={orderNumber}
              placeholder="npr. 260720"
              onChange={(e) => {
                setOrderNumber(e.target.value);
                setPage(1);
              }}
            />
          </label>

          <label>
            Courier ID:{" "}
            <input
              type="number"
              min={1}
              value={courierId}
              onChange={(e) => {
                setCourierId(e.target.value);
                setPage(1);
              }}
              style={{ width: 90 }}
            />
          </label>

          <label>
            Po strani:{" "}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
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
        <div style={{ marginTop: 16 }}>Učitavam istoriju...</div>
      ) : items.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          Nema porudžbina za izabrane filtere.
        </div>
      ) : (
        <>
          <div style={{ marginTop: 16 }}>
            Ukupno rezultata: <strong>{result?.totalCount ?? 0}</strong>
          </div>

          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 900,
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
                    Broj
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: 8,
                    }}
                  >
                    Datum
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: 8,
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: 8,
                    }}
                  >
                    Adresa
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid #ccc",
                      padding: 8,
                    }}
                  >
                    Ukupno
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: 8,
                    }}
                  >
                    Kurir
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      padding: 8,
                    }}
                  >
                    Stavke
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((order) => (
                  <tr key={order.id}>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      #{getOrderLabel(order)}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {formatDateTime(order.createdAt)}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {order.status}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {order.deliveryAddress.street}{" "}
                      {order.deliveryAddress.houseNumber},{" "}
                      {order.deliveryAddress.city}
                    </td>

                    <td
                      style={{
                        padding: 8,
                        borderBottom: "1px solid #eee",
                        textAlign: "right",
                        fontWeight: 700,
                      }}
                    >
                      {formatPrice(order.totalAmount)}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {order.courierId ?? "-"}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {order.items
                        .map((item) => `${item.dishName} x${item.quantity}`)
                        .join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <button
              type="button"
              disabled={!result?.hasPreviousPage}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Prethodna
            </button>

            <span>
              Strana {result?.page ?? page} od {result?.totalPages ?? 1}
            </span>

            <button
              type="button"
              disabled={!result?.hasNextPage}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Sledeća
            </button>
          </div>
        </>
      )}
    </div>
  );
}
