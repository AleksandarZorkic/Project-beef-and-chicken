import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acceptOrder,
  getActiveOrders,
  markReadyForPickup,
  rejectOrder,
  type OrderDetailsDto,
  type OrderStatus,
} from "../api/orderApi";
import { AppRoles } from "../auth/roles";
import { useAuth } from "../auth/AuthContext";
import { useOrderRealtime } from "../realtime/useOrderRealtime";
import OrderCard from "../components/orders/OrderCard";

type AdminOrderTab =
  | "Sve"
  | "Na_Cekanju"
  | "Prihvacena"
  | "Spremna_za_preuzimanje"
  | "Dostava_u_toku";

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

function formatDateTime(value?: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString("sr-RS");
}

function getOrderLabel(order: OrderDetailsDto) {
  return order.orderNumber ?? String(order.id);
}

function formatStatus(status: OrderStatus) {
  switch (status) {
    case "Na_Cekanju":
      return "Na čekanju";
    case "Prihvacena":
      return "Prihvaćena / u pripremi";
    case "Spremna_za_preuzimanje":
      return "Spremna za preuzimanje";
    case "Dostava_u_toku":
      return "Dostava u toku";
    case "Dostavljena":
      return "Dostavljena";
    case "Odbijena":
      return "Odbijena";
    default:
      return status;
  }
}

function getStatusStyle(status: OrderStatus): React.CSSProperties {
  switch (status) {
    case "Na_Cekanju":
      return {
        background: "#fff7e6",
        color: "#8a5a00",
        border: "1px solid #ffd591",
      };
    case "Prihvacena":
      return {
        background: "#e6f4ff",
        color: "#0958d9",
        border: "1px solid #91caff",
      };
    case "Spremna_za_preuzimanje":
      return {
        background: "#f6ffed",
        color: "#237804",
        border: "1px solid #b7eb8f",
      };
    case "Dostava_u_toku":
      return {
        background: "#f9f0ff",
        color: "#531dab",
        border: "1px solid #d3adf7",
      };
    default:
      return {
        background: "#f5f5f5",
        color: "#333",
        border: "1px solid #ddd",
      };
  }
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        ...getStatusStyle(status),
      }}
    >
      {formatStatus(status)}
    </span>
  );
}

function Spremna_za_preuzimanje({
  order,
  actionLoadingId,
  onAccept,
  onReject,
  onReadyForPickup,
}: {
  order: OrderDetailsDto;
  actionLoadingId: number | null;
  onAccept: (order: OrderDetailsDto) => void;
  onReject: (order: OrderDetailsDto) => void;
  onReadyForPickup: (order: OrderDetailsDto) => void;
}) {
  const isLoading = actionLoadingId === order.id;

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 10,
        padding: 16,
        background: "white",
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
        <div>
          <h3 style={{ margin: 0, fontSize: 22 }}>#{getOrderLabel(order)}</h3>

          <div style={{ marginTop: 6 }}>
            <StatusBadge status={order.status} />
          </div>

          <div style={{ marginTop: 6, fontSize: 13, color: "#555" }}>
            Kreirana: {formatDateTime(order.createdAt)}
          </div>

          {order.courierId && (
            <div style={{ marginTop: 4, fontSize: 13 }}>
              Kurir ID: {order.courierId}
            </div>
          )}
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            {formatPrice(order.totalAmount)}
          </div>

          <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
            Stavki: {order.items.length}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <strong>Adresa dostave:</strong>
        <div>
          {order.deliveryAddress.street} {order.deliveryAddress.houseNumber}
        </div>
        <div>
          {order.deliveryAddress.postalCode
            ? `${order.deliveryAddress.postalCode} `
            : ""}
          {order.deliveryAddress.city}
        </div>

        {order.deliveryAddress.note && (
          <div style={{ fontStyle: "italic", marginTop: 4 }}>
            Napomena za adresu: {order.deliveryAddress.note}
          </div>
        )}
      </div>

      {order.notes && (
        <div style={{ marginTop: 12 }}>
          <strong>Napomena za porudžbinu:</strong>
          <div>{order.notes}</div>
        </div>
      )}

      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          Prikaži stavke porudžbine
        </summary>

        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {order.items.map((item) => (
            <div
              key={item.id}
              style={{
                borderBottom: "1px solid #eee",
                paddingBottom: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span>
                  {item.dishName} x {item.quantity}
                </span>

                <span>
                  {formatPrice(
                    (item.unitPrice + item.optionsTotal) * item.quantity,
                  )}
                </span>
              </div>

              {item.options.length > 0 && (
                <div style={{ fontSize: 13, marginTop: 4, color: "#555" }}>
                  Dodaci:{" "}
                  {item.options
                    .map((option) =>
                      option.unitPrice > 0
                        ? `${option.optionName} (+${formatPrice(
                            option.unitPrice,
                          )})`
                        : option.optionName,
                    )
                    .join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </details>

      <div style={{ marginTop: 12, fontSize: 14 }}>
        <div>Subtotal: {formatPrice(order.subtotal)}</div>
        <div>Dostava: {formatPrice(order.deliveryFee)}</div>
        <div style={{ fontWeight: 800 }}>
          Ukupno: {formatPrice(order.totalAmount)}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        {order.status === "Na_Cekanju" && (
          <>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onAccept(order)}
            >
              {isLoading ? "Obrađujem..." : "Prihvati"}
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => onReject(order)}
            >
              {isLoading ? "Obrađujem..." : "Odbij"}
            </button>
          </>
        )}

        {order.status === "Prihvacena" && (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onReadyForPickup(order)}
          >
            {isLoading ? "Obrađujem..." : "Spremna za preuzimanje"}
          </button>
        )}

        {order.status === "Spremna_za_preuzimanje" && (
          <div style={{ fontWeight: 700 }}>
            Čeka kurira da preuzme porudžbinu.
          </div>
        )}

        {order.status === "Dostava_u_toku" && (
          <div style={{ fontWeight: 700 }}>Porudžbina je kod kurira.</div>
        )}
      </div>
    </div>
  );
}

function tabLabel(tab: AdminOrderTab) {
  switch (tab) {
    case "Sve":
      return "Sve aktivne";
    case "Na_Cekanju":
      return "Na čekanju";
    case "Prihvacena":
      return "U pripremi";
    case "Spremna_za_preuzimanje":
      return "Spremne";
    case "Dostava_u_toku":
      return "Dostava";
    default:
      return tab;
  }
}

export default function AdminOrdersPage() {
  const { isAuthenticated, hasAnyRole } = useAuth();

  const [orders, setOrders] = useState<OrderDetailsDto[]>([]);
  const [activeTab, setActiveTab] = useState<AdminOrderTab>("Sve");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadOrders = useCallback(async (showLoading = true) => {
    try {
      setError(null);

      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const data = await getActiveOrders();
      setOrders(data);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri učitavanju porudžbina."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOrderChanged = useCallback(() => {
    loadOrders(false);
  }, [loadOrders]);

  useOrderRealtime({
    enabled: isAuthenticated && hasAnyRole([AppRoles.Admin, AppRoles.Employee]),
    onOrderChanged: handleOrderChanged,
  });

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [successMessage]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return aTime - bTime;
    });
  }, [orders]);

  const counts = useMemo(() => {
    return {
      Sve: sortedOrders.length,
      Na_Cekanju: sortedOrders.filter((o) => o.status === "Na_Cekanju").length,
      Prihvacena: sortedOrders.filter((o) => o.status === "Prihvacena").length,
      Spremna_za_preuzimanje: sortedOrders.filter(
        (o) => o.status === "Spremna_za_preuzimanje",
      ).length,
      Dostava_u_toku: sortedOrders.filter((o) => o.status === "Dostava_u_toku")
        .length,
    };
  }, [sortedOrders]);

  const visibleOrders = useMemo(() => {
    if (activeTab === "Sve") {
      return sortedOrders;
    }

    return sortedOrders.filter((order) => order.status === activeTab);
  }, [activeTab, sortedOrders]);

  async function handleAccept(order: OrderDetailsDto) {
    const confirmed = window.confirm(
      `Da li želiš da prihvatiš porudžbinu #${getOrderLabel(order)}?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(order.id);

      await acceptOrder(order.id);
      await loadOrders(false);

      setSuccessMessage(`Porudžbina #${getOrderLabel(order)} je prihvaćena.`);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri prihvatanju porudžbine."));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(order: OrderDetailsDto) {
    const confirmed = window.confirm(
      `Da li želiš da odbiješ porudžbinu #${getOrderLabel(order)}?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(order.id);

      await rejectOrder(order.id);
      await loadOrders(false);

      setSuccessMessage(`Porudžbina #${getOrderLabel(order)} je odbijena.`);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri odbijanju porudžbine."));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReadyForPickup(order: OrderDetailsDto) {
    const confirmed = window.confirm(
      `Da li je porudžbina #${getOrderLabel(order)} spremna za preuzimanje?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(order.id);

      await markReadyForPickup(order.id);
      await loadOrders(false);

      setSuccessMessage(
        `Porudžbina #${getOrderLabel(order)} je spremna za preuzimanje.`,
      );
    } catch (e: any) {
      setError(
        getErrorMessage(e, "Greška pri označavanju porudžbine kao spremne."),
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  const tabs: AdminOrderTab[] = [
    "Sve",
    "Na_Cekanju",
    "Prihvacena",
    "Spremna_za_preuzimanje",
    "Dostava_u_toku",
  ];

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
          <h2 style={{ marginBottom: 4 }}>Aktivne porudžbine</h2>
          <div style={{ color: "#555", fontSize: 14 }}>
            Operativni prikaz za pripremu, preuzimanje i dostavu.
          </div>
        </div>

        <button
          type="button"
          disabled={loading || refreshing}
          onClick={() => loadOrders(false)}
        >
          {refreshing ? "Osvežavam..." : "Osveži"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: isActive ? "2px solid #111" : "1px solid #ccc",
                fontWeight: isActive ? 800 : 500,
                background: isActive ? "#f5f5f5" : "white",
              }}
            >
              {tabLabel(tab)} ({counts[tab]})
            </button>
          );
        })}
      </div>

      {successMessage && (
        <div
          style={{
            color: "green",
            marginTop: 12,
            padding: 10,
            border: "1px solid green",
            borderRadius: 8,
            background: "#f0fff0",
          }}
        >
          {successMessage}
        </div>
      )}

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
        <div style={{ marginTop: 16 }}>Učitavam porudžbine...</div>
      ) : visibleOrders.length === 0 ? (
        <div style={{ marginTop: 16 }}>Nema porudžbina za izabrani prikaz.</div>
      ) : (
        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              showGoogleMapsLink={false}
              actions={
                <>
                  {order.status === "Na_Cekanju" && (
                    <>
                      <button
                        type="button"
                        disabled={actionLoadingId === order.id}
                        onClick={() => handleAccept(order)}
                      >
                        {actionLoadingId === order.id
                          ? "Obrađujem..."
                          : "Prihvati"}
                      </button>

                      <button
                        type="button"
                        disabled={actionLoadingId === order.id}
                        onClick={() => handleReject(order)}
                      >
                        {actionLoadingId === order.id
                          ? "Obrađujem..."
                          : "Odbij"}
                      </button>
                    </>
                  )}

                  {order.status === "Prihvacena" && (
                    <button
                      type="button"
                      disabled={actionLoadingId === order.id}
                      onClick={() => handleReadyForPickup(order)}
                    >
                      {actionLoadingId === order.id
                        ? "Obrađujem..."
                        : "Spremna za preuzimanje"}
                    </button>
                  )}

                  {order.status === "Spremna_za_preuzimanje" && (
                    <div style={{ fontWeight: 700 }}>
                      Čeka kurira da preuzme porudžbinu.
                    </div>
                  )}

                  {order.status === "Dostava_u_toku" && (
                    <div style={{ fontWeight: 700 }}>
                      Porudžbina je kod kurira.
                    </div>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
