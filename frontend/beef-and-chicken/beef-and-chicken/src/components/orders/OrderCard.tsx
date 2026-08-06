import type { ReactNode } from "react";
import type {
  FulfillmentType,
  OrderDetailsDto,
  OrderStatus,
} from "../../api/orderApi";
import "./OrderCard.scss";

type OrderCardProps = {
  order: OrderDetailsDto;
  actions?: ReactNode;
  showGoogleMapsLink?: boolean;
  showCourierId?: boolean;
  showCreatedAt?: boolean;
};

function formatPrice(value: number) {
  return `${value.toLocaleString("sr-RS")} RSD`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("sr-RS");
}

function getOrderLabel(order: OrderDetailsDto) {
  return order.orderNumber ?? String(order.id);
}

function formatStatus(status: OrderStatus) {
  switch (status) {
    case "Na_Cekanju":
      return "Na čekanju";

    case "Otkazana":
      return "Otkazana";

    case "Prihvacena":
      return "Prihvaćena / u pripremi";

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
  switch (type) {
    case "Pickup":
      return "Lično preuzimanje";

    case "Delivery":
      return "Dostava";

    default:
      return "Dostava";
  }
}

function getFulfillmentModifier(type?: FulfillmentType) {
  return type === "Pickup" ? "pickup" : "delivery";
}

function getStatusModifier(status: OrderStatus) {
  switch (status) {
    case "Na_Cekanju":
      return "waiting";

    case "Otkazana":
      return "cancelled";

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

function getDeliveryAddressText(order: OrderDetailsDto) {
  const streetAndNumber =
    `${order.deliveryAddress.street} ${order.deliveryAddress.houseNumber}`.trim();

  const cityLine = order.deliveryAddress.postalCode
    ? `${order.deliveryAddress.postalCode} ${order.deliveryAddress.city}`
    : order.deliveryAddress.city;

  return [streetAndNumber, cityLine, "Srbija"].filter(Boolean).join(", ");
}

function getGoogleMapsDirectionsUrl(order: OrderDetailsDto) {
  const destination = encodeURIComponent(getDeliveryAddressText(order));

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

function getPhoneHref(phoneNumber: string) {
  const cleaned = phoneNumber.replace(/[^\d+]/g, "");

  return `tel:${cleaned}`;
}

function formatPaymentMethod(
  paymentMethod: string,
  fulfillmentType?: FulfillmentType,
) {
  const isPickup = fulfillmentType === "Pickup";

  switch (paymentMethod) {
    case "Cash":
      return isPickup ? "Gotovina pri preuzimanju" : "Gotovina pri dostavi";

    case "CardOnDelivery":
      return isPickup ? "Kartica pri preuzimanju" : "Kartica pri dostavi";

    default:
      return paymentMethod;
  }
}

function formatPaymentStatus(paymentStatus: string) {
  switch (paymentStatus) {
    case "Pending":
      return "Čeka naplatu";

    case "Paid":
      return "Plaćeno";

    case "Cancelled":
      return "Otkazano";

    default:
      return paymentStatus;
  }
}

function getPaymentStatusModifier(paymentStatus: string) {
  switch (paymentStatus) {
    case "Paid":
      return "paid";

    case "Cancelled":
      return "cancelled";

    case "Pending":
      return "pending";

    default:
      return "default";
  }
}

export default function OrderCard({
  order,
  actions,
  showGoogleMapsLink = false,
  showCourierId = true,
  showCreatedAt = true,
}: OrderCardProps) {
  const statusModifier = getStatusModifier(order.status);
  const paymentStatusModifier = getPaymentStatusModifier(order.paymentStatus);

  const isPickup = order.fulfillmentType === "Pickup";
  const fulfillmentModifier = getFulfillmentModifier(order.fulfillmentType);

  return (
    <article className="shared-order-card">
      <header className="shared-order-card__header">
        <div className="shared-order-card__identity">
          <span className="shared-order-card__eyebrow">PORUDŽBINA</span>

          <h2 className="shared-order-card__title">#{getOrderLabel(order)}</h2>

          <div className="shared-order-card__metadata">
            <span
              className={`shared-order-status shared-order-status--${statusModifier}`}
            >
              <span className="shared-order-status__dot" aria-hidden="true" />

              {formatStatus(order.status)}
            </span>

            <span
              className={`shared-order-fulfillment shared-order-fulfillment--${fulfillmentModifier}`}
            >
              {formatFulfillmentType(order.fulfillmentType)}
            </span>

            {showCreatedAt && (
              <span className="shared-order-card__created-at">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle
                    cx="12"
                    cy="12"
                    r="8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />

                  <path
                    d="M12 7.5V12l3 2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {formatDateTime(order.createdAt)}
              </span>
            )}

            {showCourierId && order.courierId && (
              <span className="shared-order-card__courier">
                Kurir ID: {order.courierId}
              </span>
            )}
          </div>
        </div>

        <div className="shared-order-card__header-summary">
          <span className="shared-order-card__items-count">
            {order.items.length}{" "}
            {order.items.length === 1 ? "stavka" : "stavke"}
          </span>

          <strong className="shared-order-card__total">
            {formatPrice(order.totalAmount)}
          </strong>
        </div>
      </header>

      <div className="shared-order-card__body">
        <div className="shared-order-card__information">
          <section className="shared-order-panel">
            <header className="shared-order-panel__header">
              <span className="shared-order-panel__icon" aria-hidden="true">
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
                <span className="shared-order-panel__eyebrow">
                  {isPickup ? "PREUZIMANJE" : "LOKACIJA"}
                </span>

                <h3 className="shared-order-panel__title">
                  {isPickup ? "Lično preuzimanje" : "Adresa dostave"}
                </h3>
              </div>
            </header>

            {isPickup ? (
              <div className="shared-order-address">
                <strong>Preuzimanje u restoranu</strong>

                <span>Kupac dolazi po porudžbinu kada bude spremna.</span>
              </div>
            ) : (
              <div className="shared-order-address">
                <strong>
                  {order.deliveryAddress.street}{" "}
                  {order.deliveryAddress.houseNumber}
                </strong>

                <span>
                  {order.deliveryAddress.postalCode
                    ? `${order.deliveryAddress.postalCode} `
                    : ""}
                  {order.deliveryAddress.city}
                </span>
              </div>
            )}

            {order.deliveryAddress.note && (
              <div className="shared-order-note">
                <span className="shared-order-note__label">
                  Napomena za adresu
                </span>

                <p>{order.deliveryAddress.note}</p>
              </div>
            )}

            {(showGoogleMapsLink || order.deliveryContactPhoneNumber) && (
              <div className="shared-order-panel__links">
                {showGoogleMapsLink && !isPickup && (
                  <a
                    className="shared-order-action-link"
                    href={getGoogleMapsDirectionsUrl(order)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
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

                    <span>Google Maps</span>
                  </a>
                )}

                {order.deliveryContactPhoneNumber && (
                  <a
                    className="shared-order-action-link"
                    href={getPhoneHref(order.deliveryContactPhoneNumber)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M8.2 3.5 10 7.7a1.4 1.4 0 0 1-.3 1.5L8.3 10.6a15.5 15.5 0 0 0 5.1 5.1l1.4-1.4a1.4 1.4 0 0 1 1.5-.3l4.2 1.8a1.4 1.4 0 0 1 .8 1.3v2.2a2 2 0 0 1-2 2C10.1 20.7 3.3 13.9 2.7 4.7a2 2 0 0 1 2-2h2.2a1.4 1.4 0 0 1 1.3.8Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <span>{order.deliveryContactPhoneNumber}</span>
                  </a>
                )}
              </div>
            )}
          </section>

          {order.notes && (
            <section className="shared-order-panel">
              <header className="shared-order-panel__header">
                <span className="shared-order-panel__icon" aria-hidden="true">
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
                </span>

                <div>
                  <span className="shared-order-panel__eyebrow">
                    DODATNE INFORMACIJE
                  </span>

                  <h3 className="shared-order-panel__title">
                    Napomena porudžbine
                  </h3>
                </div>
              </header>

              <p className="shared-order-panel__text">{order.notes}</p>
            </section>
          )}

          <section className="shared-order-payment">
            <div className="shared-order-payment__item">
              <span className="shared-order-payment__label">
                Način plaćanja
              </span>

              <strong>
                {formatPaymentMethod(
                  order.paymentMethod,
                  order.fulfillmentType,
                )}
              </strong>
            </div>

            <div className="shared-order-payment__item">
              <span className="shared-order-payment__label">
                Status plaćanja
              </span>

              <span
                className={`shared-payment-status shared-payment-status--${paymentStatusModifier}`}
              >
                {formatPaymentStatus(order.paymentStatus)}
              </span>
            </div>
          </section>
        </div>

        <div className="shared-order-card__details">
          <details className="shared-order-items" open>
            <summary className="shared-order-items__summary">
              <span>
                <span className="shared-order-items__eyebrow">
                  SADRŽAJ PORUDŽBINE
                </span>

                <strong className="shared-order-items__title">
                  Stavke porudžbine
                </strong>
              </span>

              <span className="shared-order-items__chevron" aria-hidden="true">
                ↓
              </span>
            </summary>

            <div className="shared-order-items__list">
              {order.items.map((item) => (
                <div key={item.id} className="shared-order-item">
                  <div className="shared-order-item__main">
                    <span className="shared-order-item__quantity">
                      {item.quantity}×
                    </span>

                    <div className="shared-order-item__content">
                      <strong className="shared-order-item__name">
                        {item.dishName}
                      </strong>

                      {item.options.length > 0 && (
                        <span className="shared-order-item__options">
                          {item.options
                            .map((option) =>
                              option.unitPrice > 0
                                ? `${option.optionName} (+${formatPrice(
                                    option.unitPrice,
                                  )})`
                                : option.optionName,
                            )
                            .join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  <strong className="shared-order-item__price">
                    {formatPrice(
                      (item.unitPrice + item.optionsTotal) * item.quantity,
                    )}
                  </strong>
                </div>
              ))}
            </div>
          </details>

          <section className="shared-order-totals">
            <div className="shared-order-totals__row">
              <span>{isPickup ? "Preuzimanje" : "Dostava"}</span>

              <strong>
                {isPickup
                  ? "Besplatno"
                  : order.deliveryFee === 0
                    ? "Besplatna"
                    : formatPrice(order.deliveryFee)}
              </strong>
            </div>

            <div className="shared-order-totals__row">
              <span>Dostava</span>

              <strong>
                {order.deliveryFee === 0
                  ? "Besplatna"
                  : formatPrice(order.deliveryFee)}
              </strong>
            </div>

            <div className="shared-order-totals__row shared-order-totals__row--total">
              <span>Ukupno</span>

              <strong>{formatPrice(order.totalAmount)}</strong>
            </div>
          </section>
        </div>
      </div>

      {actions && (
        <footer className="shared-order-card__actions">{actions}</footer>
      )}
    </article>
  );
}
