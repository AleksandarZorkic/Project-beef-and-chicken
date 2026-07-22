import { useCallback, useEffect, useState } from "react";
import {
  getCourierOrders,
  getReadyForPickupOrders,
  markOrderDelivered,
  startDelivery,
  startDeliveryBatch,
  type OrderDetailsDto,
} from "../api/orderApi";
import { AppRoles } from "../auth/roles";
import { useAuth } from "../auth/AuthContext";
import { useOrderRealtime } from "../realtime/useOrderRealtime";
import OrderCard from "../components/orders/OrderCard";

function getErrorMessage(e: any, fallback: string) {
  return (
    e?.response?.data?.error ??
    e?.response?.data?.message ??
    e?.response?.data?.title ??
    e?.message ??
    fallback
  );
}

function getOrderLabel(order: OrderDetailsDto) {
  return order.orderNumber ?? String(order.id);
}

export default function CourierOrdersPage() {
  const { isAuthenticated, hasRole } = useAuth();

  const [readyOrders, setReadyOrders] = useState<OrderDetailsDto[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<OrderDetailsDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedReadyOrderIds, setSelectedReadyOrderIds] = useState<number[]>(
    [],
  );
  const [batchLoading, setBatchLoading] = useState(false);

  const loadOrders = useCallback(async (showLoading = true) => {
    try {
      setError(null);

      if (showLoading) {
        setLoading(true);
      }

      const [ready, deliveries] = await Promise.all([
        getReadyForPickupOrders(),
        getCourierOrders(),
      ]);

      setReadyOrders(ready);
      setMyDeliveries(deliveries);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri učitavanju porudžbina."));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOrderChanged = useCallback(() => {
    loadOrders(false);
  }, [loadOrders]);

  useOrderRealtime({
    enabled: isAuthenticated && hasRole(AppRoles.Courier),
    onOrderChanged: handleOrderChanged,
  });

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    const readyIds = new Set(readyOrders.map((order) => order.id));

    setSelectedReadyOrderIds((current) =>
      current.filter((id) => readyIds.has(id)),
    );
  }, [readyOrders]);

  async function handleStartDelivery(order: OrderDetailsDto) {
    const confirmed = window.confirm(
      `Da li si preuzeo/la porudžbinu #${getOrderLabel(order)} za dostavu?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(order.id);

      await startDelivery(order.id);
      await loadOrders(false);

      setSuccessMessage(
        `Porudžbina #${getOrderLabel(order)} je pokrenuta za dostavu.`,
      );
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri pokretanju dostave."));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelivered(order: OrderDetailsDto) {
    const confirmed = window.confirm(
      `Da li je porudžbina #${getOrderLabel(order)} dostavljena?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(order.id);

      await markOrderDelivered(order.id);
      await loadOrders(false);

      setSuccessMessage(
        `Porudžbina #${getOrderLabel(order)} je označena kao dostavljena.`,
      );
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri označavanju dostave."));
    } finally {
      setActionLoadingId(null);
    }
  }

  function toggleReadyOrderSelection(orderId: number) {
    setSelectedReadyOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  }

  function toggleSelectAllReadyOrders() {
    if (selectedReadyOrderIds.length === readyOrders.length) {
      setSelectedReadyOrderIds([]);
      return;
    }

    setSelectedReadyOrderIds(readyOrders.map((order) => order.id));
  }

  async function handleStartDeliveryBatch() {
    if (selectedReadyOrderIds.length === 0) {
      setError("Moraš izabrati bar jednu porudžbinu.");
      return;
    }

    const confirmed = window.confirm(
      `Da li želiš da pokreneš dostavu za ${selectedReadyOrderIds.length} izabrane porudžbine?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);
      setBatchLoading(true);

      const selectedCount = selectedReadyOrderIds.length;

      await startDeliveryBatch(selectedReadyOrderIds);
      await loadOrders(false);

      setSelectedReadyOrderIds([]);
      setSuccessMessage(`Pokrenuta je dostava za ${selectedCount} porudžbine.`);
    } catch (e: any) {
      setError(getErrorMessage(e, "Greška pri batch pokretanju dostave."));
    } finally {
      setBatchLoading(false);
    }
  }
  return (
    <div>
      <h2>Kurirske porudžbine</h2>

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
      ) : (
        <>
          <section style={{ marginTop: 20 }}>
            <h3>Spremno za preuzimanje</h3>
            {readyOrders.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <button type="button" onClick={toggleSelectAllReadyOrders}>
                  {selectedReadyOrderIds.length === readyOrders.length
                    ? "Poništi izbor"
                    : "Izaberi sve"}
                </button>

                <button
                  type="button"
                  disabled={selectedReadyOrderIds.length === 0 || batchLoading}
                  onClick={handleStartDeliveryBatch}
                >
                  {batchLoading
                    ? "Pokrećem..."
                    : `Pokreni dostavu za izabrane (${selectedReadyOrderIds.length})`}
                </button>
              </div>
            )}
            {readyOrders.length === 0 ? (
              <div>Nema porudžbina spremnih za preuzimanje.</div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {readyOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    showGoogleMapsLink
                    showCourierId={false}
                    actions={
                      <>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontWeight: 700,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedReadyOrderIds.includes(order.id)}
                            onChange={() => toggleReadyOrderSelection(order.id)}
                          />
                          Izaberi
                        </label>

                        <button
                          type="button"
                          disabled={
                            actionLoadingId === order.id || batchLoading
                          }
                          onClick={() => handleStartDelivery(order)}
                        >
                          {actionLoadingId === order.id
                            ? "Obrađujem..."
                            : "Pokreni samo ovu dostavu"}
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section style={{ marginTop: 28 }}>
            <h3>Moje aktivne dostave</h3>

            {myDeliveries.length === 0 ? (
              <div>Nemaš aktivnih dostava.</div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {myDeliveries.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    showGoogleMapsLink
                    actions={
                      <button
                        type="button"
                        disabled={actionLoadingId === order.id}
                        onClick={() => handleDelivered(order)}
                      >
                        {actionLoadingId === order.id
                          ? "Obrađujem..."
                          : "Označi kao dostavljeno"}
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
