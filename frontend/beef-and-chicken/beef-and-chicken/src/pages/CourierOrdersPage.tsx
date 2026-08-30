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
import { useAppDialog } from "../components/dialogs/AppDialogContext";
import OrderCard from "../components/orders/OrderCard";
import { useOrderRealtime } from "../realtime/useOrderRealtime";
import "../styles/CourierOrdersPage.scss";

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error ??
    error?.response?.data?.message ??
    error?.response?.data?.title ??
    error?.message ??
    fallback
  );
}

function getPublicOrderLabel(order: OrderDetailsDto) {
  const orderNumber = order.orderNumber?.trim();

  return orderNumber ? `#${orderNumber}` : "porudžbinu bez javnog broja";
}

function getOrderCountLabel(count: number) {
  if (count === 1) {
    return "porudžbinu";
  }

  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "porudžbina";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "porudžbine";
  }

  return "porudžbina";
}

export default function CourierOrdersPage() {
  const { isAuthenticated, hasRole } = useAuth();
  const { confirm } = useAppDialog();

  const isCourier = isAuthenticated && hasRole(AppRoles.Courier);

  const [readyOrders, setReadyOrders] = useState<OrderDetailsDto[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<OrderDetailsDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedReadyOrderIds, setSelectedReadyOrderIds] = useState<number[]>(
    [],
  );

  const loadOrders = useCallback(
    async (showLoading = true) => {
      if (!isCourier) {
        setLoading(false);
        return;
      }

      try {
        setError(null);

        if (showLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const [ready, deliveries] = await Promise.all([
          getReadyForPickupOrders(),
          getCourierOrders(),
        ]);

        setReadyOrders(ready);
        setMyDeliveries(deliveries);
      } catch (error: any) {
        setError(
          getErrorMessage(error, "Greška pri učitavanju kurirskih porudžbina."),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isCourier],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useOrderRealtime({
    enabled: isCourier,
    onOrderChanged: () => {
      void loadOrders(false);
    },
  });

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    const readyIds = new Set(readyOrders.map((order) => order.id));

    setSelectedReadyOrderIds((current) =>
      current.filter((id) => readyIds.has(id)),
    );
  }, [readyOrders]);

  async function handleStartDelivery(order: OrderDetailsDto) {
    const publicLabel = getPublicOrderLabel(order);

    const confirmed = await confirm({
      title: "Preuzimanje porudžbine",
      message: (
        <p>
          Da li potvrđujete da ste preuzeli porudžbinu{" "}
          <strong>{publicLabel}</strong> i da krećete sa dostavom?
        </p>
      ),
      confirmText: "Pokreni dostavu",
      cancelText: "Odustani",
      tone: "success",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(order.id);

      await startDelivery(order.id);
      await loadOrders(false);

      setSuccessMessage(
        `Porudžbina ${publicLabel} je preuzeta i dostava je pokrenuta.`,
      );
    } catch (error: any) {
      setError(getErrorMessage(error, "Greška pri pokretanju dostave."));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelivered(order: OrderDetailsDto) {
    const publicLabel = getPublicOrderLabel(order);

    const confirmed = await confirm({
      title: "Potvrda dostave",
      message: (
        <p>
          Da li potvrđujete da je porudžbina <strong>{publicLabel}</strong>{" "}
          uspešno dostavljena kupcu?
        </p>
      ),
      confirmText: "Označi kao dostavljeno",
      cancelText: "Odustani",
      tone: "success",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(order.id);

      await markOrderDelivered(order.id);
      await loadOrders(false);

      setSuccessMessage(
        `Porudžbina ${publicLabel} je označena kao dostavljena.`,
      );
    } catch (error: any) {
      setError(
        getErrorMessage(
          error,
          "Greška pri označavanju porudžbine kao dostavljene.",
        ),
      );
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
    const allSelected =
      readyOrders.length > 0 &&
      selectedReadyOrderIds.length === readyOrders.length;

    setSelectedReadyOrderIds(
      allSelected ? [] : readyOrders.map((order) => order.id),
    );
  }

  async function handleStartDeliveryBatch() {
    if (selectedReadyOrderIds.length === 0) {
      setError("Morate izabrati bar jednu porudžbinu.");
      return;
    }

    const selectedCount = selectedReadyOrderIds.length;

    const confirmed = await confirm({
      title: "Pokretanje više dostava",
      message: (
        <p>
          Da li potvrđujete da ste preuzeli{" "}
          <strong>
            {selectedCount} {getOrderCountLabel(selectedCount)}
          </strong>{" "}
          i želite da pokrenete dostavu za sve izabrane?
        </p>
      ),
      confirmText: "Pokreni dostave",
      cancelText: "Odustani",
      tone: "success",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setBatchLoading(true);

      await startDeliveryBatch(selectedReadyOrderIds);
      await loadOrders(false);

      setSelectedReadyOrderIds([]);
      setSuccessMessage(
        `Pokrenuta je dostava za ${selectedCount} ${getOrderCountLabel(
          selectedCount,
        )}.`,
      );
    } catch (error: any) {
      setError(
        getErrorMessage(error, "Greška pri pokretanju izabranih dostava."),
      );
    } finally {
      setBatchLoading(false);
    }
  }

  const allReadySelected =
    readyOrders.length > 0 &&
    selectedReadyOrderIds.length === readyOrders.length;

  if (!isCourier) {
    return null;
  }

  return (
    <main className="courier-orders-page">
      <section className="courier-orders-page__header">
        <div className="courier-orders-page__heading">
          <span className="courier-orders-page__eyebrow">
            BEEF N&apos; CHICKEN • KURIR
          </span>

          <h1 className="courier-orders-page__title">Moje dostave</h1>

          <p className="courier-orders-page__description">
            Preuzmite porudžbine koje su spremne, pokrenite jednu ili više
            dostava i označite ih kao dostavljene kada stignu do kupca.
          </p>
        </div>

        <div className="courier-orders-page__realtime">
          <span
            className="courier-orders-page__realtime-dot"
            aria-hidden="true"
          />

          <div>
            <strong>
              {refreshing ? "Sinhronizujem..." : "Praćenje uživo"}
            </strong>
            <span>
              {refreshing
                ? "Preuzimamo najnovije stanje"
                : "Promene stižu automatski"}
            </span>
          </div>
        </div>
      </section>

      <section className="courier-stats" aria-label="Pregled kurirskih dostava">
        <article className="courier-stat-card courier-stat-card--selected">
          <span className="courier-stat-card__icon" aria-hidden="true">
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

          <div>
            <span className="courier-stat-card__label">
              Spremno za preuzimanje
            </span>
            <strong className="courier-stat-card__value">
              {loading ? "—" : readyOrders.length}
            </strong>
          </div>
        </article>

        <article className="courier-stat-card">
          <span className="courier-stat-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M3 16h2l2-6h8l3 6h3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="7"
                cy="17"
                r="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <circle
                cx="18"
                cy="17"
                r="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </span>

          <div>
            <span className="courier-stat-card__label">Aktivne dostave</span>
            <strong className="courier-stat-card__value">
              {loading ? "—" : myDeliveries.length}
            </strong>
          </div>
        </article>

        <article className="courier-stat-card">
          <span className="courier-stat-card__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="m5 12 4 4L19 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <div>
            <span className="courier-stat-card__label">
              Izabrano za preuzimanje
            </span>
            <strong className="courier-stat-card__value">
              {selectedReadyOrderIds.length}
            </strong>
          </div>
        </article>
      </section>

      {successMessage && (
        <div
          className="courier-alert courier-alert--success"
          role="status"
          aria-live="polite"
        >
          <span className="courier-alert__icon" aria-hidden="true">
            ✓
          </span>

          <div>
            <strong>Uspešno</strong>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="courier-alert courier-alert--error" role="alert">
          <span className="courier-alert__icon" aria-hidden="true">
            !
          </span>

          <div>
            <strong>Došlo je do greške</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <section className="courier-loading" aria-live="polite">
          <span className="courier-loading__spinner" aria-hidden="true" />

          <div>
            <strong>Učitavamo kurirske porudžbine</strong>
            <p>Sačekajte trenutak dok preuzmemo trenutno stanje dostava.</p>
          </div>
        </section>
      ) : (
        <>
          <section className="courier-orders-section">
            <header className="courier-orders-section__header">
              <div>
                <span className="courier-orders-section__eyebrow">
                  PREUZIMANJE U RESTORANU
                </span>

                <h2 className="courier-orders-section__title">
                  Spremno za preuzimanje
                </h2>

                <p className="courier-orders-section__description">
                  Izaberite porudžbine koje preuzimate. Možete pokrenuti jednu
                  dostavu ili više izabranih odjednom.
                </p>
              </div>

              <span className="courier-orders-section__count">
                {readyOrders.length}
              </span>
            </header>

            {readyOrders.length > 0 && (
              <div className="courier-batch-toolbar">
                <button
                  type="button"
                  className="courier-batch-toolbar__select-button"
                  disabled={batchLoading}
                  onClick={toggleSelectAllReadyOrders}
                >
                  <span
                    className={[
                      "courier-batch-toolbar__checkbox",
                      allReadySelected
                        ? "courier-batch-toolbar__checkbox--checked"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden="true"
                  >
                    {allReadySelected ? "✓" : ""}
                  </span>

                  {allReadySelected ? "Poništi izbor" : "Izaberi sve"}
                </button>

                <div className="courier-batch-toolbar__summary">
                  <span>
                    Izabrano: <strong>{selectedReadyOrderIds.length}</strong>
                  </span>

                  <button
                    type="button"
                    className="courier-batch-toolbar__start-button"
                    disabled={
                      selectedReadyOrderIds.length === 0 || batchLoading
                    }
                    onClick={() => void handleStartDeliveryBatch()}
                  >
                    {batchLoading && (
                      <span
                        className="courier-button-spinner"
                        aria-hidden="true"
                      />
                    )}

                    <span>
                      {batchLoading
                        ? "Pokrećem dostave..."
                        : `Pokreni izabrane (${selectedReadyOrderIds.length})`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {readyOrders.length === 0 ? (
              <div className="courier-empty-state">
                <span className="courier-empty-state__icon" aria-hidden="true">
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

                <span className="courier-empty-state__eyebrow">
                  NEMA SPREMNIH PORUDŽBINA
                </span>

                <h3 className="courier-empty-state__title">
                  Trenutno nema ništa za preuzimanje
                </h3>

                <p className="courier-empty-state__description">
                  Nove porudžbine će se pojaviti ovde čim ih restoran označi kao
                  spremne za dostavu.
                </p>
              </div>
            ) : (
              <div className="courier-orders-list">
                {readyOrders.map((order) => {
                  const isProcessing = actionLoadingId === order.id;
                  const isSelected = selectedReadyOrderIds.includes(order.id);

                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      showGoogleMapsLink
                      showCourierId={false}
                      actions={
                        <>
                          <label className="courier-order-selection">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={batchLoading || isProcessing}
                              onChange={() =>
                                toggleReadyOrderSelection(order.id)
                              }
                            />

                            <span className="courier-order-selection__control">
                              {isSelected ? "✓" : ""}
                            </span>

                            <span>Izaberi za preuzimanje</span>
                          </label>

                          <button
                            type="button"
                            className="courier-order-action courier-order-action--start"
                            disabled={isProcessing || batchLoading}
                            onClick={() => void handleStartDelivery(order)}
                          >
                            {isProcessing && (
                              <span
                                className="courier-button-spinner"
                                aria-hidden="true"
                              />
                            )}

                            <span>
                              {isProcessing
                                ? "Pokrećem..."
                                : "Pokreni ovu dostavu"}
                            </span>

                            {!isProcessing && <span aria-hidden="true">→</span>}
                          </button>
                        </>
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>

          <section className="courier-orders-section">
            <header className="courier-orders-section__header">
              <div>
                <span className="courier-orders-section__eyebrow">
                  DOSTAVA U TOKU
                </span>

                <h2 className="courier-orders-section__title">
                  Moje aktivne dostave
                </h2>

                <p className="courier-orders-section__description">
                  Ovde su porudžbine koje ste već preuzeli. Kada kupac primi
                  porudžbinu, označite je kao dostavljenu.
                </p>
              </div>

              <span className="courier-orders-section__count">
                {myDeliveries.length}
              </span>
            </header>

            {myDeliveries.length === 0 ? (
              <div className="courier-empty-state courier-empty-state--compact">
                <span className="courier-empty-state__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M3 16h2l2-6h8l3 6h3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="7"
                      cy="17"
                      r="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <circle
                      cx="18"
                      cy="17"
                      r="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>
                </span>

                <span className="courier-empty-state__eyebrow">
                  NEMA AKTIVNIH DOSTAVA
                </span>

                <h3 className="courier-empty-state__title">
                  Nema porudžbina na putu
                </h3>

                <p className="courier-empty-state__description">
                  Kada preuzmete spremnu porudžbinu, ona će se pojaviti u ovoj
                  sekciji.
                </p>
              </div>
            ) : (
              <div className="courier-orders-list">
                {myDeliveries.map((order) => {
                  const isProcessing = actionLoadingId === order.id;

                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      showGoogleMapsLink
                      actions={
                        <button
                          type="button"
                          className="courier-order-action courier-order-action--delivered"
                          disabled={isProcessing}
                          onClick={() => void handleDelivered(order)}
                        >
                          {isProcessing ? (
                            <span
                              className="courier-button-spinner"
                              aria-hidden="true"
                            />
                          ) : (
                            <span
                              className="courier-order-action__check"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                          )}

                          <span>
                            {isProcessing
                              ? "Potvrđujem..."
                              : "Označi kao dostavljeno"}
                          </span>
                        </button>
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
