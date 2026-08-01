import { Navigate, useNavigate } from "react-router-dom";
import { useCart } from "../state/cart/CartContext";
import { cartSubtotal } from "../state/cart/cart.selectors";
import { useAuth } from "../auth/AuthContext";
import { resolveImageUrl } from "../utils/resolveImageUrl";
import "../styles/CartPage.scss";

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
  const total = state.items.length > 0 ? subtotal + deliveryFee : 0;

  return (
    <main className="cart-page">
      <header className="cart-page__header">
        <div>
          <span className="cart-page__eyebrow">TVOJA PORUDŽBINA</span>

          <h1 className="cart-page__title">Korpa</h1>

          <p className="cart-page__description">
            Pregledaj odabrana jela, promeni količinu i dodaj posebnu napomenu
            za restoran.
          </p>
        </div>

        <div className="cart-page__item-count">
          <strong>{state.items.length}</strong>

          <span>{state.items.length === 1 ? "stavka" : "stavke"}</span>
        </div>
      </header>

      <div className="cart-layout">
        <section className="cart-content" aria-labelledby="cart-items-title">
          <div className="cart-content__header">
            <div>
              <span className="cart-content__eyebrow">ODABRANA JELA</span>

              <h2 id="cart-items-title" className="cart-content__title">
                Sadržaj korpe
              </h2>
            </div>

            {state.items.length > 0 && (
              <span className="cart-content__quantity">
                {state.items.length}{" "}
                {state.items.length === 1 ? "stavka" : "stavke"}
              </span>
            )}
          </div>

          {state.items.length === 0 ? (
            <div className="cart-empty-state">
              <div className="cart-empty-state__logo-shell" aria-hidden="true">
                <img
                  src="/logo.png"
                  alt=""
                  className="cart-empty-state__logo"
                />
              </div>

              <span className="cart-empty-state__eyebrow">JOŠ NEMA JELA</span>

              <h3 className="cart-empty-state__title">Korpa je prazna</h3>

              <p className="cart-empty-state__description">
                Dodaj omiljeni burger, hrskavu piletinu ili neki od naših obroka
                iz menija.
              </p>
            </div>
          ) : (
            <div className="cart-items">
              {state.items.map((item) => {
                const sideDishes = item.selectedOptions.filter(
                  (option) => option.type === "SideDish",
                );

                const spices = item.selectedOptions.filter(
                  (option) => option.type === "Spice",
                );

                const sweetAdditions = item.selectedOptions.filter(
                  (option) => option.type === "SweetAddition",
                );

                const imageUrl = resolveImageUrl(item.imageUrl);

                const itemUnitTotal = item.unitPrice + item.optionsTotal;

                const itemTotal = itemUnitTotal * item.quantity;

                return (
                  <article key={item.cartItemId} className="cart-item">
                    <div className="cart-item__visual">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          className="cart-item__image"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/logo.png";
                            e.currentTarget.className = "cart-item__logo";
                          }}
                        />
                      ) : (
                        <img
                          src="/logo.png"
                          alt=""
                          className="cart-item__logo"
                        />
                      )}
                    </div>

                    <div className="cart-item__content">
                      <div className="cart-item__heading">
                        <div>
                          <span className="cart-item__eyebrow">
                            BEEF N&apos; CHICKEN
                          </span>

                          <h3 className="cart-item__name">{item.name}</h3>
                        </div>

                        <strong className="cart-item__total-mobile">
                          {formatPrice(itemTotal)}
                        </strong>
                      </div>

                      <div className="cart-item__base-price">
                        <span>Osnovna cena</span>

                        <strong>{formatPrice(item.unitPrice)}</strong>
                      </div>

                      {sideDishes.length > 0 && (
                        <div className="cart-item__options">
                          <span className="cart-item__options-label">
                            Prilozi
                          </span>

                          <div className="cart-item__option-list">
                            {sideDishes.map((option) => (
                              <span
                                key={option.optionId}
                                className="cart-item__option"
                              >
                                {option.name}

                                {option.unitPrice > 0 && (
                                  <small>
                                    +{formatPrice(option.unitPrice)}
                                  </small>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {spices.length > 0 && (
                        <div className="cart-item__options">
                          <span className="cart-item__options-label">
                            Začini
                          </span>

                          <div className="cart-item__option-list">
                            {spices.map((option) => (
                              <span
                                key={option.optionId}
                                className="cart-item__option cart-item__option--spice"
                              >
                                {option.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {sweetAdditions.length > 0 && (
                        <div className="cart-item__options">
                          <span className="cart-item__options-label">
                            Slatki dodaci
                          </span>

                          <div className="cart-item__option-list">
                            {sweetAdditions.map((option) => (
                              <span
                                key={option.optionId}
                                className="cart-item__option cart-item__option--sweet"
                              >
                                {option.name}

                                {option.unitPrice > 0 && (
                                  <small>
                                    +{formatPrice(option.unitPrice)}
                                  </small>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.optionsTotal > 0 && (
                        <div className="cart-item__surcharge">
                          <span>Doplata za dodatke</span>

                          <strong>+{formatPrice(item.optionsTotal)}</strong>
                        </div>
                      )}

                      <div className="cart-item__prices">
                        <div>
                          <span>Cena po komadu</span>

                          <strong>{formatPrice(itemUnitTotal)}</strong>
                        </div>

                        <div>
                          <span>Ukupno za stavku</span>

                          <strong>{formatPrice(itemTotal)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="cart-item__controls">
                      <label
                        className="cart-item__quantity-label"
                        htmlFor={`cart-quantity-${item.cartItemId}`}
                      >
                        Količina
                      </label>

                      <input
                        id={`cart-quantity-${item.cartItemId}`}
                        className="cart-item__quantity-input"
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const quantity = Number(e.target.value);

                          if (quantity < 1) {
                            return;
                          }

                          dispatch({
                            type: "SET-QTY",
                            payload: {
                              cartItemId: item.cartItemId,
                              quantity,
                            },
                          });
                        }}
                      />

                      <button
                        type="button"
                        className="cart-item__remove-button"
                        onClick={() =>
                          dispatch({
                            type: "REMOVE-ITEM",
                            payload: {
                              cartItemId: item.cartItemId,
                            },
                          })
                        }
                      >
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="cart-item__remove-icon"
                        >
                          <path
                            d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>

                        <span>Ukloni</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <section className="cart-notes" aria-labelledby="cart-notes-title">
            <div className="cart-notes__header">
              <div>
                <span className="cart-notes__eyebrow">DODATNE INFORMACIJE</span>

                <h2 id="cart-notes-title" className="cart-notes__title">
                  Beleška za porudžbinu
                </h2>
              </div>

              <span className="cart-notes__icon" aria-hidden="true">
                ✎
              </span>
            </div>

            <label className="cart-notes__label" htmlFor="order-notes">
              Posebna napomena
            </label>

            <textarea
              id="order-notes"
              className="cart-notes__textarea"
              value={state.notes}
              onChange={(e) =>
                dispatch({
                  type: "SET-NOTES",
                  payload: {
                    notes: e.target.value,
                  },
                })
              }
              rows={4}
              placeholder="Na primer: bez luka, dobro pečeno, pozvati pre dostave..."
            />

            <p className="cart-notes__hint">
              Restoran će videti ovu napomenu prilikom pripreme porudžbine.
            </p>
          </section>
        </section>

        <aside className="cart-summary" aria-labelledby="cart-summary-title">
          <div className="cart-summary__header">
            <span className="cart-summary__eyebrow">PREGLED PORUDŽBINE</span>

            <h2 id="cart-summary-title" className="cart-summary__title">
              Ukupan iznos
            </h2>

            <p className="cart-summary__description">
              Proveri konačan iznos pre nastavka na unos podataka za dostavu.
            </p>
          </div>

          <div className="cart-summary__rows">
            <div className="cart-summary__row">
              <span>Međuzbir</span>

              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div className="cart-summary__row">
              <span>Dostava</span>

              <strong>{formatPrice(deliveryFee)}</strong>
            </div>
          </div>

          <div className="cart-summary__total">
            <span>Ukupno</span>

            <strong>{formatPrice(total)}</strong>
          </div>

          <div className="cart-summary__delivery-note">
            <span className="cart-summary__delivery-icon" aria-hidden="true">
              ✓
            </span>

            <p>Cena dostave je uključena u prikazani ukupan iznos.</p>
          </div>

          <button
            type="button"
            className="cart-summary__checkout-button"
            disabled={state.items.length === 0}
            onClick={() => navigate("/checkout")}
          >
            <span>Nastavi na checkout</span>

            <span className="cart-summary__checkout-arrow" aria-hidden="true">
              →
            </span>
          </button>

          <button
            type="button"
            className="cart-summary__menu-button"
            onClick={() => navigate("/menu")}
          >
            Nastavi kupovinu
          </button>

          <p className="cart-summary__security">
            Sigurna obrada podataka porudžbine
          </p>
        </aside>
      </div>
    </main>
  );
}
