import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../state/cart/CartContext";
import { cartSubtotal } from "../../state/cart/cart.selectors";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { state } = useCart();
  const navigate = useNavigate();
  const count = state.items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cartSubtotal(state);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <header
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Link to="/menu">Meni</Link>
        <Link to="/cart">Korpa ({count})</Link>
        <Link to="/addresses">Adrese</Link>
        <Link to="/allergens">Alergeni</Link>
        <Link to="/profile/allergens">Moji alergeni</Link>
        <div style={{ marginLeft: "auto" }}>Subtotal: {subtotal} RSD</div>
        <button disabled={count === 0} onClick={() => navigate("/cart")}>
          Otvori korpu
        </button>
      </header>
      {children}
    </div>
  );
}
