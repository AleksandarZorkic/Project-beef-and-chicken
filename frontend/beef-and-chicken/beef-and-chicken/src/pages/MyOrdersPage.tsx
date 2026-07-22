import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyOrders,
  type OrderDetailsDto,
  type OrderStatus,
} from "../api/orderApi";
import { useAuth } from "../auth/AuthContext";
import { useOrderRealtime } from "../realtime/useOrderRealtime";

const activeStatuses: OrderStatus[] = [
  "Na_Cekanju",
  "Prihvacena",
  "Spremna_za_preuzimanje",
  "Spremna_za_preuzimanje",
  "Dostava_u_toku",
];

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

function formatStatus(status: OrderStatus) {
  switch (status) {
    case "Na_Cekanju":
      return "Na čekanju";
    case "Prihvacena":
      return "Prihvaćena";
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

export default function MyOrdersPage() {
  const { isAuthenticated, hasRole } = useAuth();

  const [orders, setOrders] = useState<OrderDetailsDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const data = await getMyOrders();

      const activeOrders = data.filter((order) =>
        activeStatuses.includes(order.status),
      );

      setOrders(activeOrders);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri učitavanju porudžbina."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useOrderRealtime({
    enabled: isAuthenticated && hasRole("Customer"),
    onOrderChanged: () => {
      loadOrders();
    },
  });

  return (
    <div>
      <h2>Moje aktivne porudžbine</h2>

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
      ) : orders.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          Nemaš aktivnih porudžbina.
          <div style={{ marginTop: 8 }}>
            <Link to="/menu">Idi na meni</Link>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 16,
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
                  <h3 style={{ margin: 0 }}>Porudžbina #{order.id}</h3>
                  <div style={{ marginTop: 4 }}>
                    Status: <strong>{formatStatus(order.status)}</strong>
                  </div>
                </div>

                <div style={{ fontWeight: 800 }}>
                  {formatPrice(order.totalAmount)}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <strong>Adresa dostave:</strong>
                <div>
                  {order.deliveryAddress.street}{" "}
                  {order.deliveryAddress.houseNumber}
                </div>
                <div>
                  {order.deliveryAddress.postalCode
                    ? `${order.deliveryAddress.postalCode} `
                    : ""}
                  {order.deliveryAddress.city}
                </div>

                {order.deliveryAddress.note && (
                  <div style={{ marginTop: 4, fontStyle: "italic" }}>
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

              <div style={{ marginTop: 12 }}>
                <strong>Stavke:</strong>

                <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #eee",
                        paddingBottom: 4,
                      }}
                    >
                      <span>
                        {item.dishName} x {item.quantity}
                      </span>

                      <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div>Subtotal: {formatPrice(order.subtotal)}</div>
                <div>Dostava: {formatPrice(order.deliveryFee)}</div>
                <div style={{ fontWeight: 800 }}>
                  Ukupno: {formatPrice(order.totalAmount)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
