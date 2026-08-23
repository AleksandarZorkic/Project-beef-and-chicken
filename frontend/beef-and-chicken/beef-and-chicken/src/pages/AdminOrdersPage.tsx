import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acceptOrder,
  completePickupOrder,
  getActiveOrders,
  markReadyForPickup,
  rejectOrder,
  type OrderDetailsDto,
} from "../api/orderApi";
import { AppRoles } from "../auth/roles";
import { useAuth } from "../auth/AuthContext";
import { useOrderRealtime } from "../realtime/useOrderRealtime";
import OrderCard from "../components/orders/OrderCard";
import { useAppDialog } from "../components/dialogs/AppDialogContext";
import "../styles/AdminOrdersPage.scss";

type AdminOrderTab =
  | "Sve"
  | "Na_Cekanju"
  | "Prihvacena"
  | "Spremna_za_preuzimanje"
  | "Dostava_u_toku";

const tabs: AdminOrderTab[] = [
  "Sve",
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

function getOrderLabel(order: OrderDetailsDto) {
  return order.orderNumber ?? String(order.id);
}

function getTabLabel(tab: AdminOrderTab) {
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

function getTabModifier(tab: AdminOrderTab) {
  switch (tab) {
    case "Sve":
      return "all";

    case "Na_Cekanju":
      return "waiting";

    case "Prihvacena":
      return "preparing";

    case "Spremna_za_preuzimanje":
      return "ready";

    case "Dostava_u_toku":
      return "delivery";

    default:
      return "all";
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

  const { confirm, alert } = useAppDialog();

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
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri učitavanju porudžbina."));
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
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const statusPriority: Record<OrderDetailsDto["status"], number> = {
    Na_Cekanju: 1,
    Prihvacena: 2,
    Spremna_za_preuzimanje: 3,
    Dostava_u_toku: 4,
    Dostavljena: 5,
    Odbijena: 6,
    Otkazana: 7,
  };

  const sortedOrders = useMemo(() => {
    return [...orders].sort((first, second) => {
      const firstPriority = statusPriority[first.status] ?? 99;
      const secondPriority = statusPriority[second.status] ?? 99;

      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }

      const firstTime = first.createdAt
        ? new Date(first.createdAt).getTime()
        : 0;

      const secondTime = second.createdAt
        ? new Date(second.createdAt).getTime()
        : 0;

      return firstTime - secondTime;
    });
  }, [orders]);

  const counts = useMemo<Record<AdminOrderTab, number>>(() => {
    return {
      Sve: sortedOrders.length,

      Na_Cekanju: sortedOrders.filter((order) => order.status === "Na_Cekanju")
        .length,

      Prihvacena: sortedOrders.filter((order) => order.status === "Prihvacena")
        .length,

      Spremna_za_preuzimanje: sortedOrders.filter(
        (order) => order.status === "Spremna_za_preuzimanje",
      ).length,

      Dostava_u_toku: sortedOrders.filter(
        (order) => order.status === "Dostava_u_toku",
      ).length,
    };
  }, [sortedOrders]);

  const visibleOrders = useMemo(() => {
    if (activeTab === "Sve") {
      return sortedOrders;
    }

    return sortedOrders.filter((order) => order.status === activeTab);
  }, [activeTab, sortedOrders]);

  async function handleReadyForPickup(order: OrderDetailsDto) {
    const ok = await confirm({
      title: "Porudžbina je spremna",
      message: (
        <p>
          Da li je porudžbina <strong>#{getOrderLabel(order)}</strong> spremna
          za preuzimanje?
        </p>
      ),
      confirmText: "Spremna je",
      cancelText: "Odustani",
      tone: "warning",
    });

    if (!ok) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(order.id);

      await markReadyForPickup(order.id);
      await loadOrders(false);

      setSuccessMessage(
        `Porudžbina #${getOrderLabel(order)} je spremna za preuzimanje.`,
      );
    } catch (error: any) {
      const message = getErrorMessage(
        error,
        "Greška pri označavanju porudžbine kao spremne.",
      );

      setError(message);

      await alert({
        title: "Greška",
        message: <p>{message}</p>,
        confirmText: "Razumem",
        tone: "danger",
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCompletePickup(order: OrderDetailsDto) {
    const ok = await confirm({
      title: "Preuzimanje porudžbine",
      message: (
        <p>
          Da li je kupac preuzeo porudžbinu{" "}
          <strong>#{getOrderLabel(order)}</strong>?
        </p>
      ),
      confirmText: "Kupac je preuzeo",
      cancelText: "Odustani",
      tone: "success",
    });

    if (!ok) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(order.id);

      await completePickupOrder(order.id);
      await loadOrders(false);

      setSuccessMessage(
        `Porudžbina #${getOrderLabel(order)} je označena kao preuzeta.`,
      );
    } catch (error: any) {
      const message = getErrorMessage(
        error,
        "Greška pri označavanju porudžbine kao preuzete.",
      );

      setError(message);

      await alert({
        title: "Greška",
        message: <p>{message}</p>,
        confirmText: "Razumem",
        tone: "danger",
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleAccept(order: OrderDetailsDto) {
    const ok = await confirm({
      title: "Prihvatanje porudžbine",
      message: (
        <p>
          Da li želiš da prihvatiš porudžbinu{" "}
          <strong>#{getOrderLabel(order)}</strong>?
        </p>
      ),
      confirmText: "Prihvati",
      cancelText: "Odustani",
      tone: "success",
    });

    if (!ok) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(order.id);

      await acceptOrder(order.id);
      await loadOrders(false);

      setSuccessMessage(`Porudžbina #${getOrderLabel(order)} je prihvaćena.`);
    } catch (error: any) {
      const message = getErrorMessage(
        error,
        "Greška pri prihvatanju porudžbine.",
      );

      setError(message);

      await alert({
        title: "Greška",
        message: <p>{message}</p>,
        confirmText: "Razumem",
        tone: "danger",
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(order: OrderDetailsDto) {
    const ok = await confirm({
      title: "Odbijanje porudžbine",
      message: (
        <p>
          Da li želiš da odbiješ porudžbinu{" "}
          <strong>#{getOrderLabel(order)}</strong>?
        </p>
      ),
      confirmText: "Odbij",
      cancelText: "Odustani",
      tone: "danger",
    });

    if (!ok) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(order.id);

      await rejectOrder(order.id);
      await loadOrders(false);

      setSuccessMessage(`Porudžbina #${getOrderLabel(order)} je odbijena.`);
    } catch (error: any) {
      const message = getErrorMessage(
        error,
        "Greška pri odbijanju porudžbine.",
      );

      setError(message);

      await alert({
        title: "Greška",
        message: <p>{message}</p>,
        confirmText: "Razumem",
        tone: "danger",
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <main className="admin-orders-page">
      <header className="admin-orders-page__header">
        <div className="admin-orders-page__heading">
          <span className="admin-orders-page__eyebrow">OPERATIVNI PANEL</span>

          <h1 className="admin-orders-page__title">Porudžbine</h1>

          <p className="admin-orders-page__description">
            Prihvatite nove porudžbine, pratite pripremu i prosledite spremne
            porudžbine kurirskoj službi.
          </p>
        </div>

        <div className="admin-orders-page__header-actions">
          <div className="admin-orders-page__realtime">
            <span
              className="admin-orders-page__realtime-dot"
              aria-hidden="true"
            />

            <span>Porudžbine uživo</span>
          </div>

          <button
            type="button"
            className="admin-orders-page__refresh-button"
            disabled={loading || refreshing}
            onClick={() => loadOrders(false)}
          >
            {refreshing ? (
              <span className="admin-orders-page__spinner" aria-hidden="true" />
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

            <span>{refreshing ? "Osvežavam..." : "Osveži"}</span>
          </button>
        </div>
      </header>

      <section className="admin-orders-overview">
        <article className="admin-orders-overview__card admin-orders-overview__card--waiting">
          <span className="admin-orders-overview__label">Na čekanju</span>

          <strong>{counts.Na_Cekanju}</strong>
        </article>

        <article className="admin-orders-overview__card admin-orders-overview__card--preparing">
          <span className="admin-orders-overview__label">U pripremi</span>

          <strong>{counts.Prihvacena}</strong>
        </article>

        <article className="admin-orders-overview__card admin-orders-overview__card--ready">
          <span className="admin-orders-overview__label">Spremne</span>

          <strong>{counts.Spremna_za_preuzimanje}</strong>
        </article>

        <article className="admin-orders-overview__card admin-orders-overview__card--delivery">
          <span className="admin-orders-overview__label">Dostava u toku</span>

          <strong>{counts.Dostava_u_toku}</strong>
        </article>
      </section>

      <section className="admin-orders-filter">
        <header className="admin-orders-filter__header">
          <div>
            <span className="admin-orders-filter__eyebrow">FILTRIRANJE</span>

            <h2 className="admin-orders-filter__title">Aktivne porudžbine</h2>
          </div>

          <span className="admin-orders-filter__total">
            Ukupno aktivnih: <strong>{counts.Sve}</strong>
          </span>
        </header>

        <div
          className="admin-orders-tabs"
          role="tablist"
          aria-label="Filtriranje aktivnih porudžbina"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab;

            const modifier = getTabModifier(tab);

            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={[
                  "admin-orders-tabs__button",
                  `admin-orders-tabs__button--${modifier}`,
                  isActive ? "admin-orders-tabs__button--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setActiveTab(tab)}
              >
                <span className="admin-orders-tabs__dot" aria-hidden="true" />

                <span>{getTabLabel(tab)}</span>

                <strong className="admin-orders-tabs__count">
                  {counts[tab]}
                </strong>
              </button>
            );
          })}
        </div>
      </section>

      {successMessage && (
        <div
          className="admin-orders-alert admin-orders-alert--success"
          role="status"
          aria-live="polite"
        >
          <span className="admin-orders-alert__icon" aria-hidden="true">
            ✓
          </span>

          <div>
            <strong>Uspešno</strong>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div
          className="admin-orders-alert admin-orders-alert--error"
          role="alert"
        >
          <span className="admin-orders-alert__icon" aria-hidden="true">
            !
          </span>

          <div>
            <strong>Došlo je do greške</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <section className="admin-orders-loading" aria-live="polite">
          <span className="admin-orders-loading__spinner" aria-hidden="true" />

          <div>
            <strong>Učitavamo porudžbine</strong>

            <p>Sačekajte trenutak dok preuzmemo trenutno stanje operative.</p>
          </div>
        </section>
      ) : visibleOrders.length === 0 ? (
        <section className="admin-orders-empty">
          <div className="admin-orders-empty__icon" aria-hidden="true">
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

          <span className="admin-orders-empty__eyebrow">NEMA PORUDŽBINA</span>

          <h2 className="admin-orders-empty__title">
            Nema porudžbina za ovaj prikaz
          </h2>

          <p className="admin-orders-empty__description">
            Izaberite drugi status ili sačekajte da stigne nova porudžbina.
          </p>
        </section>
      ) : (
        <section className="admin-orders-results">
          <header className="admin-orders-results__header">
            <div>
              <span className="admin-orders-results__eyebrow">REZULTATI</span>

              <h2 className="admin-orders-results__title">
                {getTabLabel(activeTab)}
              </h2>
            </div>

            <span className="admin-orders-results__count">
              {visibleOrders.length}
            </span>
          </header>

          <div className="admin-orders-list">
            {visibleOrders.map((order) => {
              const isProcessing = actionLoadingId === order.id;

              return (
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
                            className="admin-order-action admin-order-action--accept"
                            disabled={isProcessing}
                            onClick={() => handleAccept(order)}
                          >
                            {isProcessing && (
                              <span
                                className="admin-order-action__spinner"
                                aria-hidden="true"
                              />
                            )}

                            {!isProcessing && (
                              <span
                                className="admin-order-action__icon"
                                aria-hidden="true"
                              >
                                ✓
                              </span>
                            )}

                            <span>
                              {isProcessing
                                ? "Obrađujem..."
                                : "Prihvati porudžbinu"}
                            </span>
                          </button>

                          <button
                            type="button"
                            className="admin-order-action admin-order-action--reject"
                            disabled={isProcessing}
                            onClick={() => handleReject(order)}
                          >
                            {!isProcessing && (
                              <span
                                className="admin-order-action__icon"
                                aria-hidden="true"
                              >
                                ×
                              </span>
                            )}

                            <span>
                              {isProcessing ? "Obrađujem..." : "Odbij"}
                            </span>
                          </button>
                        </>
                      )}

                      {order.status === "Prihvacena" && (
                        <button
                          type="button"
                          className="admin-order-action admin-order-action--ready"
                          disabled={isProcessing}
                          onClick={() => handleReadyForPickup(order)}
                        >
                          {isProcessing && (
                            <span
                              className="admin-order-action__spinner"
                              aria-hidden="true"
                            />
                          )}

                          {!isProcessing && (
                            <span
                              className="admin-order-action__icon"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                          )}

                          <span>
                            {isProcessing
                              ? "Obrađujem..."
                              : "Označi kao spremnu"}
                          </span>

                          {!isProcessing && <span aria-hidden="true">→</span>}
                        </button>
                      )}

                      {order.status === "Spremna_za_preuzimanje" &&
                        order.fulfillmentType === "Pickup" && (
                          <button
                            type="button"
                            className="admin-order-action admin-order-action--ready"
                            disabled={isProcessing}
                            onClick={() => handleCompletePickup(order)}
                          >
                            {isProcessing && (
                              <span
                                className="admin-order-action__spinner"
                                aria-hidden="true"
                              />
                            )}

                            {!isProcessing && (
                              <span
                                className="admin-order-action__icon"
                                aria-hidden="true"
                              >
                                ✓
                              </span>
                            )}

                            <span>
                              {isProcessing ? "Obrađujem..." : "Kupac preuzeo"}
                            </span>

                            {!isProcessing && <span aria-hidden="true">→</span>}
                          </button>
                        )}

                      {order.status === "Spremna_za_preuzimanje" &&
                        order.fulfillmentType === "Delivery" && (
                          <div className="admin-order-notice admin-order-notice--ready">
                            <span
                              className="admin-order-notice__dot"
                              aria-hidden="true"
                            />

                            <div>
                              <strong>Čeka kurira</strong>

                              <span>
                                Porudžbina je spremna i čeka preuzimanje za
                                dostavu.
                              </span>
                            </div>
                          </div>
                        )}

                      {order.status === "Dostava_u_toku" && (
                        <div className="admin-order-notice admin-order-notice--delivery">
                          <span
                            className="admin-order-notice__dot"
                            aria-hidden="true"
                          />

                          <div>
                            <strong>Dostava je u toku</strong>

                            <span>Porudžbina je trenutno kod kurira.</span>
                          </div>
                        </div>
                      )}
                    </>
                  }
                />
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
