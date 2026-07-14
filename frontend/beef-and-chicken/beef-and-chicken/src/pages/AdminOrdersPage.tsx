import { useEffect, useState } from "react";
import {
  acceptOrder,
  getPendingOrders,
  rejectOrder,
  type OrderDetailsDto,
} from "../api/orderApi";

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderDetailsDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [successMessage]);

  async function loadOrders() {
    try {
      setError(null);
      setLoading(true);

      const data = await getPendingOrders();
      setOrders(data);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri učitavanju porudžbina."));
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(order: OrderDetailsDto) {
    const confirmed = window.confirm(
      `Da li želiš da prihvatiš porudžbinu #${order.id}?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(order.id);

      await acceptOrder(order.id);
      await loadOrders();

      setSuccessMessage(`Porudžbina #${order.id} je prihvaćena.`);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri prihvatanju porudžbine."));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(order: OrderDetailsDto) {
    const confirmed = window.confirm(
      `Da li želiš da odbiješ porudžbinu #${order.id}?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(order.id);

      await rejectOrder(order.id);
      await loadOrders();

      setSuccessMessage(`Porudžbina #${order.id} je odbijena.`);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri odbijanju porudžbine."));
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div>
      <h2>Porudžbine na čekanju</h2>

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
      ) : orders.length === 0 ? (
        <div style={{ marginTop: 16 }}>Nema porudžbina na čekanju.</div>
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
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ margin: 0 }}>Porudžbina #{order.id}</h3>
                  <div>Status: {order.status}</div>
                </div>

                <div style={{ fontWeight: 700 }}>
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
                <div style={{ fontWeight: 700 }}>
                  Ukupno: {formatPrice(order.totalAmount)}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  type="button"
                  disabled={actionLoadingId === order.id}
                  onClick={() => handleAccept(order)}
                >
                  {actionLoadingId === order.id ? "Obrađujem..." : "Prihvati"}
                </button>

                <button
                  type="button"
                  disabled={actionLoadingId === order.id}
                  onClick={() => handleReject(order)}
                >
                  {actionLoadingId === order.id ? "Obrađujem..." : "Odbij"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
