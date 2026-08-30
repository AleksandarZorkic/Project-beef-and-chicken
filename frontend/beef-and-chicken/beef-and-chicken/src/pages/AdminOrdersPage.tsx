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
import OrderCard from "../components/orders/OrderCard";
import { useAppDialog } from "../components/dialogs/AppDialogContext";
import { useOrderRealtime } from "../realtime/useOrderRealtime";
import "../styles/AdminOrdersPage.scss";

type AdminOrderTab =
  | "Sve"
  | "Na_Cekanju"
  | "Prihvacena"
  | "Spremna_za_preuzimanje"
  | "Dostava_u_toku";

type FulfillmentFilter = "All" | "Delivery" | "Pickup";

type LoadMode = "initial" | "manual" | "silent";

const tabs: AdminOrderTab[] = [
  "Sve",
  "Na_Cekanju",
  "Prihvacena",
  "Spremna_za_preuzimanje",
  "Dostava_u_toku",
];

const statusPriority: Record<OrderDetailsDto["status"], number> = {
  Na_Cekanju: 1,
  Prihvacena: 2,
  Spremna_za_preuzimanje: 3,
  Dostava_u_toku: 4,
  Dostavljena: 5,
  Odbijena: 6,
  Otkazana: 7,
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

function getTabDescription(tab: AdminOrderTab) {
  switch (tab) {
    case "Sve":
      return "Kompletan pregled aktivnih porudžbina.";

    case "Na_Cekanju":
      return "Nove porudžbine koje čekaju odluku.";

    case "Prihvacena":
      return "Prihvaćene porudžbine koje se trenutno pripremaju.";

    case "Spremna_za_preuzimanje":
      return "Porudžbine koje su završene i čekaju kupca ili kurira.";

    case "Dostava_u_toku":
      return "Porudžbine koje su trenutno kod kurira.";

    default:
      return "";
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

  const { confirm, alert } = useAppDialog();

  const [orders, setOrders] = useState<OrderDetailsDto[]>([]);

  const [activeTab, setActiveTab] = useState<AdminOrderTab>("Sve");

  const [fulfillmentFilter, setFulfillmentFilter] =
    useState<FulfillmentFilter>("All");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const realtimeEnabled =
    isAuthenticated && hasAnyRole([AppRoles.Admin, AppRoles.Employee]);

  const loadOrders = useCallback(async (mode: LoadMode = "initial") => {
    try {
      setError(null);

      if (mode === "initial") {
        setLoading(true);
      }

      if (mode === "manual") {
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
    void loadOrders("initial");
  }, [loadOrders]);

  const handleOrderChanged = useCallback(() => {
    /*
     * SignalR updates are intentionally
     * silent so the UI does not flash
     * every time an order changes.
     */
    void loadOrders("silent");
  }, [loadOrders]);

  useOrderRealtime({
    enabled: realtimeEnabled,
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

      /*
       * For orders with the same status,
       * older ones remain first so the
       * restaurant processes them first.
       */
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

  const fulfillmentCounts = useMemo(() => {
    return {
      delivery: sortedOrders.filter(
        (order) => order.fulfillmentType === "Delivery",
      ).length,

      pickup: sortedOrders.filter((order) => order.fulfillmentType === "Pickup")
        .length,
    };
  }, [sortedOrders]);

  const visibleOrders = useMemo(() => {
    return sortedOrders.filter((order) => {
      if (activeTab !== "Sve" && order.status !== activeTab) {
        return false;
      }

      if (
        fulfillmentFilter !== "All" &&
        order.fulfillmentType !== fulfillmentFilter
      ) {
        return false;
      }

      return true;
    });
  }, [activeTab, fulfillmentFilter, sortedOrders]);

  async function showActionError(error: unknown, fallback: string) {
    const message = getErrorMessage(error, fallback);

    setError(message);

    await alert({
      title: "Greška",
      message: <p>{message}</p>,
      confirmText: "Razumem",
      tone: "danger",
    });
  }

  async function handleAccept(order: OrderDetailsDto) {
    const ok = await confirm({
      title: "Prihvatanje porudžbine",
      message: (
        <p>
          Da li želite da prihvatite porudžbinu{" "}
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

      await loadOrders("silent");

      setSuccessMessage(`Porudžbina #${getOrderLabel(order)} je prihvaćena.`);
    } catch (error) {
      await showActionError(error, "Greška pri prihvatanju porudžbine.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(order: OrderDetailsDto) {
    const ok = await confirm({
      title: "Odbijanje porudžbine",
      message: (
        <p>
          Da li želite da odbijete porudžbinu{" "}
          <strong>#{getOrderLabel(order)}</strong>? Ona će biti uklonjena iz
          aktivne operative.
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

      await loadOrders("silent");

      setSuccessMessage(`Porudžbina #${getOrderLabel(order)} je odbijena.`);
    } catch (error) {
      await showActionError(error, "Greška pri odbijanju porudžbine.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReadyForPickup(order: OrderDetailsDto) {
    const ok = await confirm({
      title: "Porudžbina je spremna",
      message: (
        <p>
          Potvrdite da je porudžbina <strong>#{getOrderLabel(order)}</strong>{" "}
          završena i spremna za{" "}
          {order.fulfillmentType === "Pickup" ? "kupca" : "kurira"}.
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

      await loadOrders("silent");

      setSuccessMessage(
        `Porudžbina #${getOrderLabel(order)} je spremna za preuzimanje.`,
      );
    } catch (error) {
      await showActionError(
        error,
        "Greška pri označavanju porudžbine kao spremne.",
      );
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

      await loadOrders("silent");

      setSuccessMessage(
        `Porudžbina #${getOrderLabel(order)} je označena kao preuzeta.`,
      );
    } catch (error) {
      await showActionError(
        error,
        "Greška pri označavanju porudžbine kao preuzete.",
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <main className="admin-orders-page">
      <section className="admin-orders-hero">
        <div className="admin-orders-hero__content">
          <span className="admin-orders-hero__eyebrow">
            BEEF N&apos; CHICKEN • OPERATIVA
          </span>

          <h1 className="admin-orders-hero__title">Porudžbine</h1>

          <p className="admin-orders-hero__description">
            Prihvatite nove porudžbine, pratite pripremu i upravljajte aktivnim
            tokom dostave i ličnog preuzimanja.
          </p>

          <div className="admin-orders-hero__meta">
            <span className="admin-orders-hero__live">
              <span
                className="admin-orders-hero__live-dot"
                aria-hidden="true"
              />
              Porudžbine uživo
            </span>

            <span className="admin-orders-hero__total">
              {counts.Sve} aktivnih
            </span>
          </div>
        </div>

        <aside className="admin-orders-summary">
          <header className="admin-orders-summary__header">
            <span className="admin-orders-summary__icon" aria-hidden="true">
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

            <span className="admin-orders-summary__label">UŽIVO</span>
          </header>

          <div className="admin-orders-summary__value">
            <strong>{counts.Na_Cekanju}</strong>

            <span>novih porudžbina čeka odgovor</span>
          </div>

          <footer className="admin-orders-summary__footer">
            <div>
              <span>Dostava</span>

              <strong>{fulfillmentCounts.delivery}</strong>
            </div>

            <div>
              <span>Preuzimanje</span>

              <strong>{fulfillmentCounts.pickup}</strong>
            </div>

            <button
              type="button"
              className="admin-orders-summary__refresh"
              disabled={loading || refreshing}
              onClick={() => void loadOrders("manual")}
              aria-label="Osveži porudžbine"
            >
              {refreshing ? (
                <span className="admin-orders-summary__spinner" />
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
          </footer>
        </aside>
      </section>

      <section
        className="admin-orders-overview"
        aria-label="Trenutno stanje porudžbina"
      >
        <article className="admin-orders-overview__card admin-orders-overview__card--waiting">
          <div>
            <span className="admin-orders-overview__label">Na čekanju</span>

            <small>Potrebna reakcija</small>
          </div>

          <strong>{counts.Na_Cekanju}</strong>
        </article>

        <article className="admin-orders-overview__card admin-orders-overview__card--preparing">
          <div>
            <span className="admin-orders-overview__label">U pripremi</span>

            <small>Kuhinja priprema</small>
          </div>

          <strong>{counts.Prihvacena}</strong>
        </article>

        <article className="admin-orders-overview__card admin-orders-overview__card--ready">
          <div>
            <span className="admin-orders-overview__label">Spremne</span>

            <small>Čekaju preuzimanje</small>
          </div>

          <strong>{counts.Spremna_za_preuzimanje}</strong>
        </article>

        <article className="admin-orders-overview__card admin-orders-overview__card--delivery">
          <div>
            <span className="admin-orders-overview__label">Dostava u toku</span>

            <small>Kod kurira</small>
          </div>

          <strong>{counts.Dostava_u_toku}</strong>
        </article>
      </section>

      <div className="admin-orders-page__messages" aria-live="polite">
        {successMessage && (
          <div className="admin-orders-alert admin-orders-alert--success">
            <span className="admin-orders-alert__icon" aria-hidden="true">
              ✓
            </span>

            <div>
              <strong>Promena je sačuvana</strong>

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
      </div>

      <section className="admin-orders-workspace">
        <header className="admin-orders-workspace__header">
          <div>
            <span className="admin-orders-workspace__eyebrow">
              OPERATIVNI TOK
            </span>

            <h2 className="admin-orders-workspace__title">
              Aktivne porudžbine
            </h2>

            <p>Porudžbine su sortirane prema prioritetu i vremenu kreiranja.</p>
          </div>

          <div className="admin-orders-workspace__result">
            <strong>{visibleOrders.length}</strong>

            <span>prikazano</span>
          </div>
        </header>

        <div className="admin-orders-controls">
          <div
            className="admin-orders-tabs"
            role="tablist"
            aria-label="Status porudžbine"
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

          <div
            className="admin-orders-fulfillment"
            role="group"
            aria-label="Tip porudžbine"
          >
            <button
              type="button"
              className={[
                "admin-orders-fulfillment__button",
                fulfillmentFilter === "All"
                  ? "admin-orders-fulfillment__button--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setFulfillmentFilter("All")}
            >
              Sve
            </button>

            <button
              type="button"
              className={[
                "admin-orders-fulfillment__button",
                fulfillmentFilter === "Delivery"
                  ? "admin-orders-fulfillment__button--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setFulfillmentFilter("Delivery")}
            >
              Dostava
              <span>{fulfillmentCounts.delivery}</span>
            </button>

            <button
              type="button"
              className={[
                "admin-orders-fulfillment__button",
                fulfillmentFilter === "Pickup"
                  ? "admin-orders-fulfillment__button--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setFulfillmentFilter("Pickup")}
            >
              Preuzimanje
              <span>{fulfillmentCounts.pickup}</span>
            </button>
          </div>
        </div>

        <div className="admin-orders-current-filter">
          <div>
            <span>Trenutni prikaz</span>

            <strong>{getTabLabel(activeTab)}</strong>
          </div>

          <p>{getTabDescription(activeTab)}</p>
        </div>

        {loading ? (
          <section className="admin-orders-loading" aria-live="polite">
            <span
              className="admin-orders-loading__spinner"
              aria-hidden="true"
            />

            <div>
              <strong>Učitavamo porudžbine</strong>

              <p>Preuzimamo trenutno stanje operative.</p>
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

            <h3 className="admin-orders-empty__title">
              Nema porudžbina za ovaj prikaz
            </h3>

            <p className="admin-orders-empty__description">
              Izaberite drugi status ili tip porudžbine, ili sačekajte da stigne
              nova.
            </p>

            {(activeTab !== "Sve" || fulfillmentFilter !== "All") && (
              <button
                type="button"
                className="admin-orders-empty__reset"
                onClick={() => {
                  setActiveTab("Sve");

                  setFulfillmentFilter("All");
                }}
              >
                Prikaži sve aktivne
              </button>
            )}
          </section>
        ) : (
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
                            onClick={() => void handleAccept(order)}
                          >
                            {isProcessing ? (
                              <span
                                className="admin-order-action__spinner"
                                aria-hidden="true"
                              />
                            ) : (
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
                            onClick={() => void handleReject(order)}
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
                          onClick={() => void handleReadyForPickup(order)}
                        >
                          {isProcessing ? (
                            <span
                              className="admin-order-action__spinner"
                              aria-hidden="true"
                            />
                          ) : (
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
                            onClick={() => void handleCompletePickup(order)}
                          >
                            {isProcessing ? (
                              <span
                                className="admin-order-action__spinner"
                                aria-hidden="true"
                              />
                            ) : (
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
        )}
      </section>
    </main>
  );
}
