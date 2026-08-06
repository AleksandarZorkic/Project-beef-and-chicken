import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrderById, type OrderDetailsDto } from "../api/orderApi";
import "../styles/OrderSuccessPage.scss";

export default function OrderSuccessPage() {
  const { orderId } = useParams();

  const [order, setOrder] = useState<OrderDetailsDto | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const isPickup = order?.fulfillmentType === "Pickup";

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) {
        return;
      }

      const parsedOrderId = Number(orderId);

      if (!Number.isFinite(parsedOrderId)) {
        setOrderError("Broj porudžbine nije validan.");
        return;
      }

      try {
        setLoadingOrder(true);
        setOrderError(null);

        const data = await getOrderById(parsedOrderId);

        setOrder(data);
      } catch (error: any) {
        setOrderError(
          error?.response?.data?.error ??
            error?.response?.data?.message ??
            error?.response?.data?.title ??
            error?.message ??
            "Detalji porudžbine nisu učitani.",
        );
      } finally {
        setLoadingOrder(false);
      }
    }

    loadOrder();
  }, [orderId]);

  return (
    <main className="order-success-page">
      <section
        className="order-success-card"
        aria-labelledby="order-success-title"
      >
        <div className="order-success-card__decoration" aria-hidden="true" />

        <div className="order-success-card__icon-shell" aria-hidden="true">
          <svg className="order-success-card__icon" viewBox="0 0 24 24">
            <path
              d="M5 12.5 9.2 17 19 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <span className="order-success-card__eyebrow">
          PORUDŽBINA JE PRIMLJENA
        </span>

        <h1 id="order-success-title" className="order-success-card__title">
          Uspešno ste poručili!
        </h1>

        <p className="order-success-card__description">
          {isPickup
            ? "Vaša porudžbina je uspešno kreirana za lično preuzimanje. Status možete pratiti u sekciji „Moje porudžbine“."
            : "Vaša porudžbina je uspešno kreirana. Status i ostale detalje možete pratiti u sekciji „Moje porudžbine“."}
        </p>

        <div className="order-success-card__number">
          <span>Broj porudžbine</span>

          <strong>#{order?.orderNumber ?? orderId}</strong>
        </div>

        {loadingOrder && (
          <div className="order-success-card__info">
            <span className="order-success-card__info-icon" aria-hidden="true">
              i
            </span>

            <p>Učitavamo detalje porudžbine...</p>
          </div>
        )}

        {!loadingOrder && order && (
          <div className="order-success-card__info">
            <span className="order-success-card__info-icon" aria-hidden="true">
              {isPickup ? "P" : "D"}
            </span>

            <p>
              <strong>Tip porudžbine: </strong>
              {isPickup ? "Lično preuzimanje" : "Dostava na adresu"}
            </p>
          </div>
        )}

        {!loadingOrder && orderError && (
          <div className="order-success-card__info">
            <span className="order-success-card__info-icon" aria-hidden="true">
              i
            </span>

            <p>
              Sačuvajte broj porudžbine radi lakšeg praćenja i komunikacije sa
              restoranom.
            </p>
          </div>
        )}

        {!loadingOrder && !orderError && !order && (
          <div className="order-success-card__info">
            <span className="order-success-card__info-icon" aria-hidden="true">
              i
            </span>

            <p>
              Sačuvajte broj porudžbine radi lakšeg praćenja i komunikacije sa
              restoranom.
            </p>
          </div>
        )}

        <div className="order-success-card__actions">
          <Link
            to="/my-orders"
            className="order-success-card__link order-success-card__link--primary"
          >
            <span>Prikaži moje porudžbine</span>

            <span className="order-success-card__link-arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link
            to="/menu"
            className="order-success-card__link order-success-card__link--secondary"
          >
            Nazad na meni
          </Link>
        </div>

        <div className="order-success-card__footer">
          <img src="/logo.png" alt="" className="order-success-card__logo" />

          <span>Hvala na poverenju</span>
        </div>
      </section>
    </main>
  );
}
