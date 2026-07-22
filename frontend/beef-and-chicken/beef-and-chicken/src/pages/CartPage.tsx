import { Navigate, useNavigate } from "react-router-dom";
import { useCart } from "../state/cart/CartContext";
import { cartSubtotal } from "../state/cart/cart.selectors";
import { useAuth } from "../auth/AuthContext";

function formatPrice(value: number) {
  return `${value.toLocaleString("sr-RS")} RSD`;
}

export default function CartPage() {
  const { user } = useAuth();
  const { state, dispatch } = useCart();
  const navigate = useNavigate();

  const isCustomer = user?.roles.includes("Customer") ?? false;

  if (!isCustomer) {
    return <Navigate to="/" replace />;
  }

  const subtotal = cartSubtotal(state);
  const deliveryFee = 200;
  const total = state.items.length ? subtotal + deliveryFee : 0;

  return (
    <div>
      <h2>Korpa</h2>

      {state.items.length === 0 && <div>Korpa je prazna.</div>}

      {state.items.map((item) => {
        const sideDishes = item.selectedOptions.filter(
          (option) => option.type === "SideDish",
        );

        const spices = item.selectedOptions.filter(
          (option) => option.type === "Spice",
        );

        const itemUnitTotal = item.unitPrice + item.optionsTotal;
        const itemTotal = itemUnitTotal * item.quantity;

        return (
          <div
            key={item.cartItemId}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: 12,
              borderBottom: "1px solid #eee",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{item.name}</div>

              <div>Osnovna cena: {formatPrice(item.unitPrice)}</div>

              {sideDishes.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <strong>Prilozi:</strong>{" "}
                  {sideDishes
                    .map((option) =>
                      option.unitPrice > 0
                        ? `${option.name} (+${formatPrice(option.unitPrice)})`
                        : option.name,
                    )
                    .join(", ")}
                </div>
              )}

              {spices.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <strong>Začini:</strong>{" "}
                  {spices.map((option) => option.name).join(", ")}
                </div>
              )}

              {item.optionsTotal > 0 && (
                <div style={{ marginTop: 6 }}>
                  Doplata za priloge: {formatPrice(item.optionsTotal)}
                </div>
              )}

              <div style={{ marginTop: 6, fontWeight: 700 }}>
                Cena po komadu: {formatPrice(itemUnitTotal)}
              </div>

              <div>Ukupno za stavku: {formatPrice(itemTotal)}</div>
            </div>

            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => {
                const quantity = Number(e.target.value);

                if (quantity < 1) return;

                dispatch({
                  type: "SET-QTY",
                  payload: {
                    cartItemId: item.cartItemId,
                    quantity,
                  },
                });
              }}
              style={{ width: 70 }}
            />

            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: "REMOVE-ITEM",
                  payload: { cartItemId: item.cartItemId },
                })
              }
            >
              Ukloni
            </button>
          </div>
        );
      })}

      <div style={{ marginTop: 12 }}>
        <label>Beleška za porudžbinu</label>
        <textarea
          value={state.notes}
          onChange={(e) =>
            dispatch({
              type: "SET-NOTES",
              payload: { notes: e.target.value },
            })
          }
          rows={3}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <div>Subtotal: {formatPrice(subtotal)}</div>
        <div>Dostava: {formatPrice(deliveryFee)}</div>
        <div style={{ fontWeight: 800 }}>Ukupno: {formatPrice(total)}</div>
      </div>

      <button
        type="button"
        style={{ marginTop: 12 }}
        disabled={state.items.length === 0}
        onClick={() => navigate("/checkout")}
      >
        Nastavi na checkout
      </button>
    </div>
  );
}
