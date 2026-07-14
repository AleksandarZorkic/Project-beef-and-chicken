import { useNavigate } from "react-router-dom";
import { useCart } from "../state/cart/CartContext";
import { cartSubtotal } from "../state/cart/cart.selectors";

export default function CartPage() {
  const { state, dispatch } = useCart();
  const navigate = useNavigate();
  const subtotal = cartSubtotal(state);
  const deliveryFee = 200; // promeniti da vuce sa back-a
  const total = state.items.length ? subtotal + deliveryFee : 0;

  return (
    <div>
      <h2>Korpa</h2>

      {state.items.map((i) => (
        <div
          key={i.dishId}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            padding: 8,
            borderBottom: "1px solid #eee",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{i.name}</div>
            <div>{i.unitPrice} RSD</div>
          </div>

          <input
            type="number"
            min={1}
            value={i.quantity}
            onChange={(e) => {
              const quantity = Number(e.target.value);

              if (quantity < 1) return;

              dispatch({
                type: "SET-QTY",
                payload: { dishId: i.dishId, quantity },
              });
            }}
            style={{ width: 70 }}
          />
          <button
            onClick={() =>
              dispatch({ type: "REMOVE-ITEM", payload: { dishId: i.dishId } })
            }
          >
            Ukloni
          </button>
        </div>
      ))}
      <div style={{ marginTop: 12 }}>
        <label>Beleška za porudžbinu</label>
        <textarea
          value={state.notes}
          onChange={(e) =>
            dispatch({ type: "SET-NOTES", payload: { notes: e.target.value } })
          }
          rows={3}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <div>Subtotal: {subtotal} RSD</div>
        <div>Dostava: {deliveryFee} RSD</div>
        <div style={{ fontWeight: 800 }}>Ukupno: {total} RSD</div>
      </div>

      <button
        style={{ marginTop: 12 }}
        disabled={state.items.length === 0}
        onClick={() => navigate("/checkout")}
      >
        Nastavi na checkout
      </button>
    </div>
  );
}
