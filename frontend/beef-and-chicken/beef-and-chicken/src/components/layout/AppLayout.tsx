import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../state/cart/CartContext";
import { cartSubtotal } from "../../state/cart/cart.selectors";
import { useAuth } from "../../auth/AuthContext";
import { AppRoles } from "../../auth/roles";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { state } = useCart();
  const { isAuthenticated, hasRole, logout } = useAuth();

  const navigate = useNavigate();

  const count = state.items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cartSubtotal(state);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <header
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <Link to="/menu">Meni</Link>
        <Link to="/cart">Korpa ({count})</Link>

        {isAuthenticated && <Link to="/my-allergens">Moji alergeni</Link>}

        {hasRole(AppRoles.Customer) && (
          <>
            <Link to="/addresses">Adrese</Link>
            <Link to="/my-orders">Moje porudžbine</Link>
          </>
        )}

        {hasRole(AppRoles.Admin) && (
          <>
            <Link to="/admin/dishes">Admin meni</Link>
            <Link to="/admin/dish-options">Prilozi i začini</Link>
            <Link to="/allergens">Alergeni</Link>
            <Link to="/admin/users">Korisnici</Link>
            <Link to="/admin/dashboard">Dashboard</Link>
            <Link to="/admin/categories">Kategorije</Link>
          </>
        )}

        {(hasRole(AppRoles.Admin) || hasRole(AppRoles.Employee)) && (
          <>
            <Link to="/admin/orders">Porudžbine</Link>
            <Link to="/admin/orders/history">Istorija porudžbina</Link>
          </>
        )}

        {hasRole(AppRoles.Courier) && <Link to="/courier/orders">Dostave</Link>}

        <div style={{ marginLeft: "auto" }}>Ukupno: {subtotal} RSD</div>

        <button disabled={count === 0} onClick={() => navigate("/cart")}>
          Otvori korpu
        </button>

        {isAuthenticated ? (
          <button type="button" onClick={handleLogout}>
            Odjavi se
          </button>
        ) : (
          <button type="button" onClick={() => navigate("/login")}>
            Prijavi se
          </button>
        )}
      </header>

      {children}
    </div>
  );
}
