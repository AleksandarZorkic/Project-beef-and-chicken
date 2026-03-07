import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../state/cart/CartContext";
import { createOrder } from "../api/orderApi";

export default function CheckoutPage() {
  const { state, dispatch } = useCart();
  const navigate = useNavigate();

  const [customerAddressId, setCustomerAddressId] = useState<number>(1); // privremeno
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    try {
      setError(null);
      setLoading(true);

      const payload = {
        customerAddressId,
        notes: state.notes || undefined,
        items: state.items.map((i) => ({
          dishId: i.dishId,
          quantity: i.quantity,
        })),
      };

      const created = await createOrder(payload);
      dispatch({ type: "CLEAR" });
      navigate(`/success/${created.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Greška pri kreiranju porudžbine.");
    } finally {
      setLoading(false);
    }
  }

  if (state.items.length === 0) return <div>Korpa je prazna</div>;

  return (
    <div>
      <h2>Checkout</h2>

      <label>CustomerAddressId (privremeno)</label>
      <input
        type="number"
        min={1}
        value={customerAddressId}
        onChange={(e) => setCustomerAddressId(Number(e.target.value))}
      />

      {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}

      <button disabled={loading} style={{ marginTop: 12 }} onClick={onSubmit}>
        {loading ? "Kreiram..." : "Poruči"}
      </button>
    </div>
  );
}
