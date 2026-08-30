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
import { useAppDialog } from "../components/dialogs/AppDialogContext";
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

function getPublicOrderNumber(order: OrderDetailsDto) {
  return order.orderNumber?.trim() || "Nije dostupan";
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

    case "Otkazana":
      return "Otkazana";

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
    case "Otkazana":
      return "rejected";

    default:
      return "default";
  }
}

function getItemCountLabel(count: number) {
  if (count === 1) {
    return "stavka";
  }

  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "stavki";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "stavke";
  }

  return "stavki";
}

function getProgressSteps(type?: FulfillmentType) {
  if (type === "Pickup") {
    return [
      {
        status: "Na_Cekanju" as OrderStatus,
        label: "Primljena",
      },
      {
        status: "Prihvacena" as OrderStatus,
        label: "Priprema",
      },
      {
        status: "Spremna_za_preuzimanje" as OrderStatus,
        label: "Spremna",
      },
    ];
  }

  return [
    {
      status: "Na_Cekanju" as OrderStatus,
      label: "Primljena",
    },
    {
      status: "Prihvacena" as OrderStatus,
      label: "Priprema",
    },
    {
      status: "Spremna_za_preuzimanje" as OrderStatus,
      label: "Spremna",
    },
    {
      status: "Dostava_u_toku" as OrderStatus,
      label: "Na putu",
    },
  ];
}

function getProgressIndex(
  status: OrderStatus,
  fulfillmentType?: FulfillmentType,
) {
  const steps = getProgressSteps(fulfillmentType);

  const index = steps.findIndex((step) => step.status === status);

  return index < 0 ? 0 : index;
}

export default function MyOrdersPage() {
  const { isAuthenticated, hasRole } = useAuth();
  const { confirm } = useAppDialog();

  const [orders, setOrders] = useState<OrderDetailsDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isCustomer = isAuthenticated && hasRole("Customer");

  const loadOrders = useCallback(async (showLoading = true) => {
    try {
      setError(null);

      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const data = await getMyOrders();

      const activeOrders = data.filter((order) =>
        activeStatuses.includes(order.status),
      );

      setOrders(activeOrders);
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri učitavanju porudžbina."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isCustomer) {
      setLoading(false);
      return;
    }

    void loadOrders();
  }, [isCustomer, loadOrders]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useOrderRealtime({
    enabled: isCustomer,
    onOrderChanged: () => {
      void loadOrders(false);
    },
  });

  async function handleCancelOrder(order: OrderDetailsDto) {
    const publicOrderNumber = getPublicOrderNumber(order);

    const confirmed = await confirm({
      title: "Otkazivanje porudžbine",
      message: (
        <p>
          Da li sigurno želite da otkažete porudžbinu{" "}
          <strong>#{publicOrderNumber}</strong>? Nakon otkazivanja neće biti
          moguće nastaviti ovu porudžbinu.
        </p>
      ),
      confirmText: "Otkaži porudžbinu",
      cancelText: "Zadrži porudžbinu",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setCancellingId(order.id);

      // Internal database ID is used only for the API request.
      await cancelMyOrder(order.id);

      setOrders((currentOrders) =>
        currentOrders.filter((currentOrder) => currentOrder.id !== order.id),
      );

      setSuccessMessage(
        `Porudžbina #${publicOrderNumber} je uspešno otkazana.`,
      );
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri otkazivanju porudžbine."));
    } finally {
      setCancellingId(null);
    }
  }

  if (!isCustomer) {
    return (
      <main className="my-orders-guest">
        <section className="my-orders-guest__card">
          <div className="my-orders-guest__icon" aria-hidden="true">
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
          </div>

          <span className="my-orders-guest__eyebrow">PRIJAVA JE POTREBNA</span>

          <h1>Moje porudžbine</h1>

          <p>
            Prijavite se kako biste pratili aktivne porudžbine i njihov trenutni
            status.
          </p>

          <Link to="/login" className="btn btn--primary">
            Prijavi se
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="my-orders-page">
      <section className="my-orders-hero">
        <div className="my-orders-hero__content">
          <span className="my-orders-hero__eyebrow">
            PRAĆENJE U REALNOM VREMENU
          </span>

          <h1 className="my-orders-hero__title">Moje porudžbine</h1>

          <p className="my-orders-hero__description">
            Pratite pripremu i dostavu svojih aktivnih porudžbina. Status se
            automatski ažurira čim restoran ili kurir naprave sledeći korak.
          </p>

          <div className="my-orders-hero__note">
            <span className="my-orders-hero__note-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3a9 9 0 1 0 9 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />

                <path
                  d="M12 7v5l3 2M17 3h4v4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span>
              Nema potrebe da ručno osvežavate stranicu — promene stižu
              automatski.
            </span>
          </div>
        </div>

        <aside className="my-orders-summary">
          <div className="my-orders-summary__top">
            <span className="my-orders-summary__icon" aria-hidden="true">
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

            <span className="my-orders-summary__live">
              <span aria-hidden="true" />
              Uživo
            </span>
          </div>

          <div className="my-orders-summary__count">
            <strong>{loading ? "—" : orders.length}</strong>

            <span>
              {orders.length === 1
                ? "aktivna porudžbina"
                : "aktivnih porudžbina"}
            </span>
          </div>

          <div className="my-orders-summary__footer">
            <span>Automatsko ažuriranje</span>

            <strong>{refreshing ? "Sinhronizujem..." : "Povezano"}</strong>
          </div>
        </aside>
      </section>

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

      {successMessage && (
        <div
          className="orders-alert orders-alert--success"
          role="status"
          aria-live="polite"
        >
          <span className="orders-alert__icon" aria-hidden="true">
            ✓
          </span>

          <div>
            <strong>Porudžbina je ažurirana</strong>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      <section className="orders-collection">
        <header className="orders-collection__header">
          <div>
            <span className="orders-collection__eyebrow">
              AKTIVNE PORUDŽBINE
            </span>

            <h2>Pratite svoj obrok</h2>

            <p>Ovde se prikazuju samo porudžbine koje su trenutno u toku.</p>
          </div>

          <button
            type="button"
            className="orders-collection__refresh"
            disabled={loading || refreshing}
            onClick={() => void loadOrders(false)}
          >
            {refreshing ? (
              <span className="orders-collection__spinner" />
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

            {refreshing ? "Osvežavam..." : "Osveži"}
          </button>
        </header>

        {loading ? (
          <div className="orders-loading" aria-live="polite">
            <span className="orders-loading__spinner" aria-hidden="true" />

            <div>
              <strong>Učitavamo porudžbine</strong>

              <p>Još samo trenutak dok preuzmemo najnovije podatke.</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-empty">
            <div className="orders-empty__icon" aria-hidden="true">
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
            </div>

            <span className="orders-empty__eyebrow">
              NEMA AKTIVNIH PORUDŽBINA
            </span>

            <h3>Vreme je za nešto dobro</h3>

            <p>
              Kada napravite novu porudžbinu, njen status ćete pratiti upravo
              ovde.
            </p>

            <Link to="/menu" className="btn btn--primary">
              Pogledaj meni
            </Link>
          </div>
        ) : (
          <div className="orders-list" aria-label="Aktivne porudžbine">
            {orders.map((order) => {
              const statusModifier = getStatusModifier(order.status);

              const isPickup = order.fulfillmentType === "Pickup";

              const progressSteps = getProgressSteps(order.fulfillmentType);

              const progressIndex = getProgressIndex(
                order.status,
                order.fulfillmentType,
              );

              return (
                <article key={order.id} className="order-card">
                  <header className="order-card__header">
                    <div className="order-card__identity">
                      <span className="order-card__eyebrow">
                        AKTIVNA PORUDŽBINA
                      </span>

                      <div className="order-card__number">
                        <span>Broj porudžbine</span>

                        <strong>#{getPublicOrderNumber(order)}</strong>
                      </div>

                      <span className="order-card__fulfillment">
                        {formatFulfillmentType(order.fulfillmentType)}
                      </span>
                    </div>

                    <div className="order-card__header-side">
                      <span
                        className={`order-status order-status--${statusModifier}`}
                      >
                        <span
                          className="order-status__dot"
                          aria-hidden="true"
                        />

                        {formatStatus(order.status)}
                      </span>

                      <strong className="order-card__header-total">
                        {formatPrice(order.totalAmount)}
                      </strong>
                    </div>
                  </header>

                  <section
                    className="order-progress"
                    aria-label="Napredak porudžbine"
                  >
                    {progressSteps.map((step, index) => {
                      const completed = index <= progressIndex;
                      const current = index === progressIndex;

                      return (
                        <div
                          key={step.status}
                          className={[
                            "order-progress__step",
                            completed ? "order-progress__step--completed" : "",
                            current ? "order-progress__step--current" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="order-progress__marker">
                            {completed ? "✓" : index + 1}
                          </span>

                          <span className="order-progress__label">
                            {step.label}
                          </span>

                          {index < progressSteps.length - 1 && (
                            <span
                              className="order-progress__line"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      );
                    })}
                  </section>

                  <div className="order-card__body">
                    <div className="order-card__info">
                      <section className="order-card__section">
                        <span
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
                        </span>

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
                                Dođite po porudžbinu kada bude označena kao
                                spremna.
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
                        <section className="order-card__section">
                          <span
                            className="order-card__section-icon"
                            aria-hidden="true"
                          >
                            <svg viewBox="0 0 24 24">
                              <path
                                d="M6 4h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>

                          <div>
                            <span className="order-card__section-label">
                              Napomena za porudžbinu
                            </span>

                            <p className="order-card__note-text">
                              {order.notes}
                            </p>
                          </div>
                        </section>
                      )}
                    </div>

                    <section className="order-items">
                      <header className="order-items__header">
                        <div>
                          <span className="order-items__eyebrow">
                            SADRŽAJ PORUDŽBINE
                          </span>

                          <h4>Odabrana jela</h4>
                        </div>

                        <span className="order-items__count">
                          {order.items.length}{" "}
                          {getItemCountLabel(order.items.length)}
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
                        className="order-card__cancel"
                        disabled={cancellingId === order.id}
                        onClick={() => void handleCancelOrder(order)}
                      >
                        {cancellingId === order.id ? (
                          <span className="order-card__cancel-spinner" />
                        ) : (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="m7 7 10 10M17 7 7 17"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}

                        {cancellingId === order.id
                          ? "Otkazujem..."
                          : "Otkaži porudžbinu"}
                      </button>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
