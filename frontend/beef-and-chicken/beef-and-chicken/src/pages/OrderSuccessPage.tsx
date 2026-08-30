import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrderById, type OrderDetailsDto } from "../api/orderApi";
import "../styles/OrderSuccessPage.scss";

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

export default function OrderSuccessPage() {
  const { orderId } = useParams();

  const [order, setOrder] = useState<OrderDetailsDto | null>(null);

  const [loadingOrder, setLoadingOrder] = useState(true);

  const [orderError, setOrderError] = useState<string | null>(null);

  const isPickup = order?.fulfillmentType === "Pickup";

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) {
        setOrderError("Porudžbina nije pronađena.");

        setLoadingOrder(false);

        return;
      }

      const parsedOrderId = Number(orderId);

      if (
        !Number.isFinite(parsedOrderId) ||
        !Number.isInteger(parsedOrderId) ||
        parsedOrderId <= 0
      ) {
        setOrderError("Identifikator porudžbine nije validan.");

        setLoadingOrder(false);

        return;
      }

      try {
        setLoadingOrder(true);
        setOrderError(null);

        const data = await getOrderById(parsedOrderId);

        setOrder(data);
      } catch (error: any) {
        setOrderError(
          getErrorMessage(error, "Detalji porudžbine trenutno nisu dostupni."),
        );
      } finally {
        setLoadingOrder(false);
      }
    }

    void loadOrder();
  }, [orderId]);

  /*
   * Public order number comes exclusively from backend.
   * Never replace it with internal database Order.Id.
   */
  const publicOrderNumber = order?.orderNumber?.trim() || null;

  return (
    <main className="order-success-page">
      <section
        className="order-success-panel"
        aria-labelledby="order-success-title"
      >
        <div className="order-success-panel__main">
          <div className="order-success-panel__success-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="m6 12.5 4 4L18.5 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <span className="order-success-panel__eyebrow">
            PORUDŽBINA JE USPEŠNO POSLATA
          </span>

          <h1 id="order-success-title" className="order-success-panel__title">
            Hvala na porudžbini!
          </h1>

          <p className="order-success-panel__description">
            {loadingOrder
              ? "Porudžbina je primljena. Učitavamo poslednje detalje."
              : isPickup
                ? "Vaša porudžbina je primljena i uskoro kreće u pripremu. Obavestićemo vas kada bude spremna za preuzimanje."
                : "Vaša porudžbina je primljena i uskoro kreće u pripremu. Status možete pratiti u realnom vremenu kroz svoje porudžbine."}
          </p>

          <div className="order-success-progress">
            <div className="order-success-progress__step order-success-progress__step--active">
              <span className="order-success-progress__marker">✓</span>

              <span className="order-success-progress__content">
                <strong>Primljena</strong>

                <small>Porudžbina je poslata restoranu</small>
              </span>

              <span
                className="order-success-progress__line"
                aria-hidden="true"
              />
            </div>

            <div className="order-success-progress__step">
              <span className="order-success-progress__marker">2</span>

              <span className="order-success-progress__content">
                <strong>Priprema</strong>

                <small>Restoran priprema vaš obrok</small>
              </span>

              <span
                className="order-success-progress__line"
                aria-hidden="true"
              />
            </div>

            <div className="order-success-progress__step">
              <span className="order-success-progress__marker">3</span>

              <span className="order-success-progress__content">
                <strong>{isPickup ? "Preuzimanje" : "Dostava"}</strong>

                <small>
                  {isPickup
                    ? "Porudžbina će biti spremna za vas"
                    : "Porudžbina kreće ka vašoj adresi"}
                </small>
              </span>
            </div>
          </div>
        </div>

        <aside className="order-success-summary">
          <header className="order-success-summary__header">
            <span className="order-success-summary__icon" aria-hidden="true">
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

            <span className="order-success-summary__status">
              <span aria-hidden="true" />
              Primljena
            </span>
          </header>

          <div className="order-success-summary__number">
            <span>Broj porudžbine</span>

            {loadingOrder ? (
              <strong className="order-success-summary__number-loading">
                Učitava se...
              </strong>
            ) : publicOrderNumber ? (
              <strong>#{publicOrderNumber}</strong>
            ) : (
              <strong className="order-success-summary__number-unavailable">
                Nije dostupan
              </strong>
            )}

            <small>Sačuvajte ovaj broj za praćenje porudžbine.</small>
          </div>

          {loadingOrder ? (
            <div className="order-success-summary__loading">
              <span
                className="order-success-summary__spinner"
                aria-hidden="true"
              />

              <span>Učitavamo detalje...</span>
            </div>
          ) : order ? (
            <div className="order-success-summary__details">
              <div className="order-success-summary__detail">
                <span>Tip porudžbine</span>

                <strong>{isPickup ? "Lično preuzimanje" : "Dostava"}</strong>
              </div>

              <div className="order-success-summary__detail">
                <span>Ukupno</span>

                <strong className="order-success-summary__total">
                  {formatPrice(order.totalAmount)}
                </strong>
              </div>

              {!isPickup && order.deliveryAddress && (
                <div className="order-success-summary__detail order-success-summary__detail--wide">
                  <span>Adresa dostave</span>

                  <strong>
                    {order.deliveryAddress.street}{" "}
                    {order.deliveryAddress.houseNumber}
                  </strong>

                  <small>
                    {order.deliveryAddress.postalCode
                      ? `${order.deliveryAddress.postalCode} `
                      : ""}

                    {order.deliveryAddress.city}
                  </small>
                </div>
              )}
            </div>
          ) : (
            <div className="order-success-summary__notice">
              <span aria-hidden="true">i</span>

              <p>
                Detalji trenutno nisu dostupni. Porudžbinu možete pronaći u
                sekciji „Moje porudžbine“.
              </p>
            </div>
          )}
        </aside>
      </section>

      {orderError && (
        <div className="order-success-warning" role="status">
          <span className="order-success-warning__icon" aria-hidden="true">
            !
          </span>

          <div>
            <strong>Detalji nisu učitani</strong>

            <p>
              {orderError} Porudžbinu i dalje možete pronaći u sekciji „Moje
              porudžbine“.
            </p>
          </div>
        </div>
      )}

      <section className="order-success-actions">
        <div className="order-success-actions__content">
          <span className="order-success-actions__eyebrow">ŠTA DALJE?</span>

          <h2>Pratite porudžbinu bez čekanja</h2>

          <p>
            Status će se automatski menjati kako porudžbina prolazi kroz
            pripremu
            {isPickup ? " i preuzimanje." : " i dostavu."}
          </p>
        </div>

        <div className="order-success-actions__buttons">
          <Link to="/my-orders" className="order-success-actions__primary">
            <span>Prati porudžbinu</span>

            <span className="order-success-actions__arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link to="/menu" className="order-success-actions__secondary">
            Nazad na meni
          </Link>
        </div>
      </section>
    </main>
  );
}
