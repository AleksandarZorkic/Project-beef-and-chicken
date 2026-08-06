import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelMyOrder,
  getMyOrders,
  type FulfillmentType,
  type OrderDetailsDto,
  type OrderStatus,
} from "../api/orderApi";
import { useAuth } from "../auth/AuthContext";
import { useOrderRealtime } from "../realtime/useOrderRealtime";
import "../styles/MyOrdersPage.scss";

const activeStatuses: OrderStatus[] = [
  "Na_Cekanju",
  "Prihvacena",
  "Spremna_za_preuzimanje",
  "Dostava_u_toku",
];

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

function formatFulfillmentType(type?: FulfillmentType) {
  return type === "Pickup" ? "Lično preuzimanje" : "Dostava";
}

function getStatusModifier(status: OrderStatus) {
  switch (status) {
    case "Na_Cekanju":
      return "waiting";

    case "Prihvacena":
      return "accepted";

    case "Spremna_za_preuzimanje":
      return "ready";

    case "Dostava_u_toku":
      return "delivery";

    case "Dostavljena":
      return "delivered";

    case "Odbijena":
      return "rejected";

    default:
      return "default";
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
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri učitavanju porudžbina."));
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

  async function handleCancelOrder(orderId: number) {
    const confirmed = window.confirm(
      "Da li sigurno želite da otkažete ovu porudžbinu?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);

      const cancelledOrder = await cancelMyOrder(orderId);

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order.id === cancelledOrder.id ? cancelledOrder : order,
        ),
      );
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri otkazivanju porudžbine."));
    }
  }

  return (
    <main className="my-orders-page">
      <header className="my-orders-page__header">
        <div>
          <span className="my-orders-page__eyebrow">PRAĆENJE PORUDŽBINA</span>

          <h1 className="my-orders-page__title">Moje porudžbine</h1>

          <p className="my-orders-page__description">
            Ovde možete pratiti trenutno stanje svojih aktivnih porudžbina i
            pregledati sve informacije potrebne za dostavu.
          </p>
        </div>

        <div
          className="my-orders-page__realtime"
          title="Statusi se automatski ažuriraju"
        >
          <span className="my-orders-page__realtime-dot" aria-hidden="true" />

          <span>Automatsko ažuriranje</span>
        </div>
      </header>

      {error && (
        <div className="orders-alert orders-alert--error" role="alert">
          <span className="orders-alert__icon" aria-hidden="true">
            !
          </span>

          <div>
            <strong>Došlo je do greške</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <section className="orders-loading" aria-live="polite">
          <span className="orders-loading__spinner" aria-hidden="true" />

          <div>
            <strong>Učitavamo porudžbine</strong>

            <p>Sačekajte trenutak dok preuzmemo najnovije podatke.</p>
          </div>
        </section>
      ) : orders.length === 0 ? (
        <section className="orders-empty">
          <div className="orders-empty__logo-shell" aria-hidden="true">
            <img src="/logo.png" alt="" className="orders-empty__logo" />
          </div>

          <span className="orders-empty__eyebrow">
            NEMA AKTIVNIH PORUDŽBINA
          </span>

          <h2 className="orders-empty__title">Trenutno ništa ne čeka</h2>

          <p className="orders-empty__description">
            Kada napravite novu porudžbinu, ovde ćete moći da pratite njen
            status i detalje dostave.
          </p>

          <Link to="/menu" className="orders-empty__link">
            <span>Pregledaj meni</span>
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      ) : (
        <section className="orders-list" aria-label="Aktivne porudžbine">
          {orders.map((order) => {
            const statusModifier = getStatusModifier(order.status);

            const isPickup = order.fulfillmentType === "Pickup";

            return (
              <article key={order.id} className="order-card">
                <header className="order-card__header">
                  <div className="order-card__identity">
                    <span className="order-card__eyebrow">
                      AKTIVNA PORUDŽBINA
                    </span>

                    <h2 className="order-card__title">
                      Porudžbina #{order.id}
                    </h2>
                  </div>

                  <div className="order-card__header-side">
                    <span
                      className={`order-status order-status--${statusModifier}`}
                    >
                      <span className="order-status__dot" aria-hidden="true" />

                      {formatStatus(order.status)}
                    </span>

                    <span className="order-status order-status--accepted">
                      {formatFulfillmentType(order.fulfillmentType)}
                    </span>

                    <strong className="order-card__header-total">
                      {formatPrice(order.totalAmount)}
                    </strong>
                  </div>
                </header>

                <div className="order-card__body">
                  <section
                    className="order-card__section order-card__section--address"
                    aria-label={
                      isPickup ? "Lično preuzimanje" : "Adresa dostave"
                    }
                  >
                    <div
                      className="order-card__section-icon"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        <circle
                          cx="12"
                          cy="9"
                          r="2.3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />
                      </svg>
                    </div>

                    <div>
                      <span className="order-card__section-label">
                        {isPickup ? "Lično preuzimanje" : "Adresa dostave"}
                      </span>

                      {isPickup ? (
                        <>
                          <strong className="order-card__address-main">
                            Preuzimanje u restoranu
                          </strong>

                          <span className="order-card__address-city">
                            Dođite po porudžbinu kada bude označena kao spremna.
                          </span>
                        </>
                      ) : (
                        <>
                          <strong className="order-card__address-main">
                            {order.deliveryAddress.street}{" "}
                            {order.deliveryAddress.houseNumber}
                          </strong>

                          <span className="order-card__address-city">
                            {order.deliveryAddress.postalCode
                              ? `${order.deliveryAddress.postalCode} `
                              : ""}
                            {order.deliveryAddress.city}
                          </span>

                          {order.deliveryAddress.note && (
                            <p className="order-card__address-note">
                              {order.deliveryAddress.note}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </section>

                  {order.notes && (
                    <section
                      className="order-card__section order-card__section--note"
                      aria-label="Napomena za porudžbinu"
                    >
                      <div
                        className="order-card__section-icon"
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 24 24">
                          <path
                            d="M6 4h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      <div>
                        <span className="order-card__section-label">
                          Napomena za porudžbinu
                        </span>

                        <p className="order-card__note-text">{order.notes}</p>
                      </div>
                    </section>
                  )}

                  <section
                    className="order-items"
                    aria-label="Stavke porudžbine"
                  >
                    <header className="order-items__header">
                      <div>
                        <span className="order-items__eyebrow">
                          SADRŽAJ PORUDŽBINE
                        </span>

                        <h3 className="order-items__title">Odabrana jela</h3>
                      </div>

                      <span className="order-items__count">
                        {order.items.length}{" "}
                        {order.items.length === 1 ? "stavka" : "stavke"}
                      </span>
                    </header>

                    <div className="order-items__list">
                      {order.items.map((item) => (
                        <div key={item.id} className="order-items__item">
                          <div className="order-items__item-main">
                            <span className="order-items__quantity">
                              {item.quantity}×
                            </span>

                            <span className="order-items__name">
                              {item.dishName}
                            </span>
                          </div>

                          <strong className="order-items__price">
                            {formatPrice(item.unitPrice * item.quantity)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <footer className="order-card__footer">
                  <div className="order-totals">
                    <div className="order-totals__row">
                      <span>Međuzbir</span>

                      <strong>{formatPrice(order.subtotal)}</strong>
                    </div>

                    <div className="order-totals__row">
                      <span>{isPickup ? "Preuzimanje" : "Dostava"}</span>

                      <strong>
                        {isPickup
                          ? "Besplatno"
                          : order.deliveryFee === 0
                            ? "Besplatna"
                            : formatPrice(order.deliveryFee)}
                      </strong>
                    </div>

                    <div className="order-totals__row order-totals__row--total">
                      <span>Ukupno</span>

                      <strong>{formatPrice(order.totalAmount)}</strong>
                    </div>
                  </div>

                  {order.status === "Na_Cekanju" && (
                    <button
                      type="button"
                      className="order-card__cancel-button"
                      onClick={() => handleCancelOrder(order.id)}
                    >
                      <svg
                        className="order-card__cancel-icon"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          d="m7 7 10 10M17 7 7 17"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>

                      <span>Otkaži porudžbinu</span>
                    </button>
                  )}
                </footer>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
