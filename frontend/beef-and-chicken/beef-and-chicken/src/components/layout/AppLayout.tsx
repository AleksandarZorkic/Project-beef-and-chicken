import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../../state/cart/CartContext";
import { cartSubtotal } from "../../state/cart/cart.selectors";
import { useAuth } from "../../auth/AuthContext";
import { AppRoles } from "../../auth/roles";

type AppLayoutProps = {
  children: ReactNode;
};

type NavigationItem = {
  to: string;
  label: string;
  end?: boolean;
};

function getNavLinkClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? "app-header__nav-link app-header__nav-link--active"
    : "app-header__nav-link";
}

function getSecondaryNavLinkClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? "app-header__secondary-link app-header__secondary-link--active"
    : "app-header__secondary-link";
}

function getMobileNavLinkClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? "app-header__mobile-link app-header__mobile-link--active"
    : "app-header__mobile-link";
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { state } = useCart();
  const { isAuthenticated, hasRole, logout } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isCustomer = hasRole(AppRoles.Customer);
  const isAdmin = hasRole(AppRoles.Admin);
  const isEmployee = hasRole(AppRoles.Employee);
  const isCourier = hasRole(AppRoles.Courier);

  const canUseCart = isCustomer;

  const count = canUseCart
    ? state.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  const subtotal = canUseCart ? cartSubtotal(state) : 0;

  const formattedSubtotal = subtotal.toLocaleString("sr-RS");

  const primaryLinks: NavigationItem[] = [
    {
      to: "/menu",
      label: "Meni",
      end: true,
    },
    {
      to: "/delivery-rush",
      label: "Delivery Rush",
    },
  ];

  if (canUseCart) {
    primaryLinks.push({
      to: "/my-allergens",
      label: "Moji alergeni",
    });
  }

  if (isCustomer) {
    primaryLinks.push(
      {
        to: "/profile",
        label: "Moj profil",
      },
      {
        to: "/addresses",
        label: "Adrese",
      },
      {
        to: "/my-orders",
        label: "Moje porudžbine",
      },
    );
  }

  const secondaryLinks: NavigationItem[] = [];

  if (isAdmin) {
    secondaryLinks.push(
      {
        to: "/admin/dashboard",
        label: "Dashboard",
      },
      {
        to: "/admin/visits",
        label: "Statistika",
      },
      {
        to: "/admin/dishes",
        label: "Admin meni",
      },
      {
        to: "/admin/announcements",
        label: "Novosti",
      },
      {
        to: "/admin/restaurant-settings",
        label: "Podešavanja porudžbina",
      },
      {
        to: "/admin/dish-options",
        label: "Prilozi i začini",
      },
      {
        to: "/allergens",
        label: "Alergeni",
      },
      {
        to: "/admin/users",
        label: "Korisnici",
      },
      {
        to: "/admin/categories",
        label: "Kategorije",
      },
    );
  }

  if (isAdmin || isEmployee) {
    secondaryLinks.push(
      {
        to: "/admin/orders",
        label: "Porudžbine",
        end: true,
      },
      {
        to: "/admin/orders/history",
        label: "Istorija porudžbina",
      },
    );
  }

  if (isCourier) {
    secondaryLinks.push({
      to: "/courier/orders",
      label: "Dostave",
    });
  }

  const hasSecondaryNavigation = secondaryLinks.length > 0;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    setIsMobileMenuOpen(false);
    navigate("/login");
  }

  function handleCartOpen() {
    navigate("/cart");
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header__main">
          <div className="container app-header__main-inner">
            <NavLink
              to="/"
              className="app-header__brand"
              aria-label="Beef n' Chicken početna stranica"
            >
              <img src="/logo.png" alt="" className="app-header__logo" />

              <span className="app-header__brand-content">
                <span className="app-header__brand-name">
                  Beef n&apos; Chicken
                </span>

                <span className="app-header__brand-description">
                  American Grill
                </span>
              </span>
            </NavLink>

            <nav
              className="app-header__desktop-nav"
              aria-label="Glavna navigacija"
            >
              {primaryLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={getNavLinkClass}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="app-header__actions">
              {canUseCart && (
                <div className="app-header__cart-summary">
                  <span className="app-header__cart-summary-label">Ukupno</span>

                  <strong className="app-header__cart-summary-value">
                    {formattedSubtotal} RSD
                  </strong>
                </div>
              )}

              {canUseCart && (
                <button
                  type="button"
                  className="app-header__cart-button"
                  disabled={count === 0}
                  onClick={handleCartOpen}
                  aria-label={
                    count === 0
                      ? "Korpa je prazna"
                      : `Otvori korpu. Broj proizvoda: ${count}`
                  }
                >
                  <svg
                    className="app-header__cart-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20.5 8H7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <circle cx="10" cy="20" r="1.25" fill="currentColor" />

                    <circle cx="18" cy="20" r="1.25" fill="currentColor" />
                  </svg>

                  <span className="app-header__cart-text">Korpa</span>

                  {count > 0 && <span className="badge-count">{count}</span>}
                </button>
              )}

              {isAuthenticated ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm app-header__auth-button"
                  onClick={handleLogout}
                >
                  Odjavi se
                </button>
              ) : (
                <div className="app-header__guest-actions">
                  <NavLink
                    to="/login"
                    className="btn btn--ghost btn--sm app-header__login-link"
                  >
                    Prijavi se
                  </NavLink>

                  <NavLink
                    to="/register"
                    className="btn btn--primary btn--sm app-header__register-link"
                  >
                    Registruj se
                  </NavLink>
                </div>
              )}

              <button
                type="button"
                className={
                  isMobileMenuOpen
                    ? "app-header__menu-toggle app-header__menu-toggle--open"
                    : "app-header__menu-toggle"
                }
                aria-label={
                  isMobileMenuOpen ? "Zatvori navigaciju" : "Otvori navigaciju"
                }
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-navigation"
                onClick={() => setIsMobileMenuOpen((current) => !current)}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>
        </div>

        {hasSecondaryNavigation && (
          <div className="app-header__secondary">
            <div className="container">
              <nav
                className="app-header__secondary-nav"
                aria-label="Administrativna navigacija"
              >
                {secondaryLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={getSecondaryNavLinkClass}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        )}

        {isMobileMenuOpen && (
          <div id="mobile-navigation" className="app-header__mobile-panel">
            <div className="container app-header__mobile-inner">
              <nav
                className="app-header__mobile-nav"
                aria-label="Mobilna navigacija"
              >
                <div className="app-header__mobile-group">
                  <span className="app-header__mobile-group-title">
                    Navigacija
                  </span>

                  {primaryLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      className={getMobileNavLinkClass}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>

                {hasSecondaryNavigation && (
                  <div className="app-header__mobile-group">
                    <span className="app-header__mobile-group-title">
                      Upravljanje
                    </span>

                    {secondaryLinks.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.end}
                        className={getMobileNavLinkClass}
                      >
                        {link.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </nav>

              {canUseCart && (
                <div className="app-header__mobile-cart">
                  <div>
                    <span className="app-header__mobile-cart-label">
                      Ukupno u korpi
                    </span>

                    <strong className="app-header__mobile-cart-value">
                      {formattedSubtotal} RSD
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={count === 0}
                    onClick={handleCartOpen}
                  >
                    Otvori korpu
                    {count > 0 && ` (${count})`}
                  </button>
                </div>
              )}

              {isAuthenticated ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--full app-header__mobile-auth"
                  onClick={handleLogout}
                >
                  Odjavi se
                </button>
              ) : (
                <div className="app-header__mobile-guest-actions">
                  <NavLink
                    to="/login"
                    className="btn btn--ghost btn--full"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Prijavi se
                  </NavLink>

                  <NavLink
                    to="/register"
                    className="btn btn--primary btn--full"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Registruj se
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="app-layout__main">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
