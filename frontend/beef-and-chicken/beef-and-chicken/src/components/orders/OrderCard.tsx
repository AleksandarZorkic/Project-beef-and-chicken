import type { CSSProperties, ReactNode } from "react";
import type { OrderDetailsDto, OrderStatus } from "../../api/orderApi";

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
  if (!value) return "-";

  return new Date(value).toLocaleString("sr-RS");
}

function getOrderLabel(order: OrderDetailsDto) {
  return order.orderNumber ?? String(order.id);
}

function formatStatus(status: OrderStatus) {
  switch (status) {
    case "Na_Cekanju":
      return "Na čekanju";
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

function getStatusStyle(status: OrderStatus): CSSProperties {
  switch (status) {
    case "Na_Cekanju":
      return {
        background: "#fff7e6",
        color: "#8a5a00",
        border: "1px solid #ffd591",
      };
    case "Prihvacena":
      return {
        background: "#e6f4ff",
        color: "#0958d9",
        border: "1px solid #91caff",
      };
    case "Spremna_za_preuzimanje":
      return {
        background: "#f6ffed",
        color: "#237804",
        border: "1px solid #b7eb8f",
      };
    case "Dostava_u_toku":
      return {
        background: "#f9f0ff",
        color: "#531dab",
        border: "1px solid #d3adf7",
      };
    case "Dostavljena":
      return {
        background: "#f6ffed",
        color: "#237804",
        border: "1px solid #b7eb8f",
      };
    case "Odbijena":
      return {
        background: "#fff1f0",
        color: "#a8071a",
        border: "1px solid #ffa39e",
      };
    default:
      return {
        background: "#f5f5f5",
        color: "#333",
        border: "1px solid #ddd",
      };
  }
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        ...getStatusStyle(status),
      }}
    >
      {formatStatus(status)}
    </span>
  );
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

export default function OrderCard({
  order,
  actions,
  showGoogleMapsLink = false,
  showCourierId = true,
  showCreatedAt = true,
}: OrderCardProps) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 10,
        padding: 16,
        background: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 22 }}>
            Porudžbina #{getOrderLabel(order)}
          </h3>

          <div style={{ marginTop: 6 }}>
            <StatusBadge status={order.status} />
          </div>

          {showCreatedAt && (
            <div style={{ marginTop: 6, fontSize: 13, color: "#555" }}>
              Kreirana: {formatDateTime(order.createdAt)}
            </div>
          )}

          {showCourierId && order.courierId && (
            <div style={{ marginTop: 4, fontSize: 13 }}>
              Kurir ID: {order.courierId}
            </div>
          )}
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            {formatPrice(order.totalAmount)}
          </div>

          <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
            Stavki: {order.items.length}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <strong>Adresa dostave:</strong>

        <div>
          {order.deliveryAddress.street} {order.deliveryAddress.houseNumber}
        </div>

        <div>
          {order.deliveryAddress.postalCode
            ? `${order.deliveryAddress.postalCode} `
            : ""}
          {order.deliveryAddress.city}
        </div>

        {showGoogleMapsLink && (
          <div style={{ marginTop: 8 }}>
            <a
              href={getGoogleMapsDirectionsUrl(order)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: 8,
                textDecoration: "none",
                color: "inherit",
                fontWeight: 700,
              }}
            >
              Otvori u Google Maps
            </a>
          </div>
        )}

        {order.deliveryAddress.note && (
          <div style={{ fontStyle: "italic", marginTop: 8 }}>
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

      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          Prikaži stavke porudžbine
        </summary>

        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {order.items.map((item) => (
            <div
              key={item.id}
              style={{
                borderBottom: "1px solid #eee",
                paddingBottom: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span>
                  {item.dishName} x {item.quantity}
                </span>

                <span>
                  {formatPrice(
                    (item.unitPrice + item.optionsTotal) * item.quantity,
                  )}
                </span>
              </div>

              {item.options.length > 0 && (
                <div style={{ fontSize: 13, marginTop: 4, color: "#555" }}>
                  Dodaci:{" "}
                  {item.options
                    .map((option) =>
                      option.unitPrice > 0
                        ? `${option.optionName} (+${formatPrice(
                            option.unitPrice,
                          )})`
                        : option.optionName,
                    )
                    .join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </details>

      <div style={{ marginTop: 12, fontSize: 14 }}>
        <div>Subtotal: {formatPrice(order.subtotal)}</div>
        <div>Dostava: {formatPrice(order.deliveryFee)}</div>
        <div style={{ fontWeight: 800 }}>
          Ukupno: {formatPrice(order.totalAmount)}
        </div>
      </div>

      {actions && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 14,
            flexWrap: "wrap",
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
