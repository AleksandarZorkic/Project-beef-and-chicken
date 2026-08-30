import { Navigate, useNavigate } from "react-router-dom";
import { useCart } from "../state/cart/CartContext";
import { cartSubtotal } from "../state/cart/cart.selectors";
import { useAuth } from "../auth/AuthContext";
import { resolveImageUrl } from "../utils/resolveImageUrl";
import "../styles/CartPage.scss";

function formatPrice(value: number) {
  return `${value.toLocaleString("sr-RS")} RSD`;
}

function getItemCountLabel(count: number) {
  if (count === 1) {
    return "stavka";
  }

  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "stavki";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "stavke";
  }

  return "stavki";
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

  const totalItemQuantity = state.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  function setQuantity(cartItemId: string, quantity: number) {
    if (quantity < 1) {
      return;
    }

    dispatch({
      type: "SET-QTY",
      payload: {
        cartItemId,
        quantity,
      },
    });
  }

  function removeItem(cartItemId: string) {
    dispatch({
      type: "REMOVE-ITEM",
      payload: {
        cartItemId,
      },
    });
  }

  return (
    <main className="cart-page">
      <section className="cart-hero">
        <div className="cart-hero__content">
          <span className="cart-hero__eyebrow">
            BEEF N&apos; CHICKEN • TVOJA PORUDŽBINA
          </span>

          <h1 className="cart-hero__title">Tvoja korpa</h1>

          <p className="cart-hero__description">
            Proveri odabrana jela, prilagodi količinu i dodaj napomenu pre nego
            što nastaviš na podatke za preuzimanje ili dostavu.
          </p>
        </div>

        <aside className="cart-hero__summary">
          <div className="cart-hero__summary-top">
            <span className="cart-hero__summary-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M6 4h12l1 16H5L6 4Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />

                <path
                  d="M9 8a3 3 0 0 0 6 0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <span className="cart-hero__summary-label">Trenutna korpa</span>
          </div>

          <div className="cart-hero__summary-count">
            <strong>{totalItemQuantity}</strong>

            <span>
              {getItemCountLabel(totalItemQuantity)}
              <small>
                {" "}
                u {state.items.length} {getItemCountLabel(state.items.length)}
              </small>
            </span>
          </div>

          <div className="cart-hero__summary-footer">
            <span>Međuzbir</span>

            <strong>{formatPrice(subtotal)}</strong>
          </div>
        </aside>
      </section>

      <div className="cart-layout">
        <section className="cart-content" aria-labelledby="cart-items-title">
          <header className="cart-content__header">
            <div>
              <span className="cart-content__eyebrow">ODABRANA JELA</span>

              <h2 id="cart-items-title" className="cart-content__title">
                Sadržaj korpe
              </h2>

              <p className="cart-content__description">
                Sve što će biti uključeno u tvoju porudžbinu.
              </p>
            </div>

            {state.items.length > 0 && (
              <span className="cart-content__quantity">
                {totalItemQuantity} {getItemCountLabel(totalItemQuantity)}
              </span>
            )}
          </header>

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
                Izaberi nešto iz menija i napravi obrok baš po svom ukusu.
              </p>

              <button
                type="button"
                className="btn btn--primary"
                onClick={() => navigate("/menu")}
              >
                Pogledaj meni
              </button>
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
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = "/logo.png";
                            event.currentTarget.className = "cart-item__logo";
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

                        <strong className="cart-item__heading-total">
                          {formatPrice(itemTotal)}
                        </strong>
                      </div>

                      <div className="cart-item__base-price">
                        <span>Osnovna cena</span>

                        <strong>{formatPrice(item.unitPrice)}</strong>
                      </div>

                      {(sideDishes.length > 0 ||
                        spices.length > 0 ||
                        sweetAdditions.length > 0) && (
                        <div className="cart-item__selected">
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
                        </div>
                      )}

                      {item.optionsTotal > 0 && (
                        <div className="cart-item__surcharge">
                          <span>Doplata za dodatke</span>

                          <strong>+{formatPrice(item.optionsTotal)}</strong>
                        </div>
                      )}

                      <div className="cart-item__price-breakdown">
                        <span>Cena po komadu</span>

                        <strong>{formatPrice(itemUnitTotal)}</strong>
                      </div>
                    </div>

                    <div className="cart-item__controls">
                      <span className="cart-item__quantity-label">
                        Količina
                      </span>

                      <div
                        className="cart-item__stepper"
                        aria-label={`Količina za ${item.name}`}
                      >
                        <button
                          type="button"
                          aria-label={`Smanji količinu za ${item.name}`}
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            setQuantity(item.cartItemId, item.quantity - 1)
                          }
                        >
                          −
                        </button>

                        <input
                          id={`cart-quantity-${item.cartItemId}`}
                          className="cart-item__quantity-input"
                          type="number"
                          min={1}
                          value={item.quantity}
                          aria-label={`Količina za ${item.name}`}
                          onChange={(event) => {
                            const quantity = Number(event.target.value);

                            if (Number.isInteger(quantity) && quantity >= 1) {
                              setQuantity(item.cartItemId, quantity);
                            }
                          }}
                        />

                        <button
                          type="button"
                          aria-label={`Povećaj količinu za ${item.name}`}
                          onClick={() =>
                            setQuantity(item.cartItemId, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>

                      <strong className="cart-item__controls-total">
                        {formatPrice(itemTotal)}
                      </strong>

                      <button
                        type="button"
                        className="cart-item__remove-button"
                        onClick={() => removeItem(item.cartItemId)}
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

          {state.items.length > 0 && (
            <section className="cart-notes" aria-labelledby="cart-notes-title">
              <div className="cart-notes__header">
                <div>
                  <span className="cart-notes__eyebrow">
                    DODATNE INFORMACIJE
                  </span>

                  <h2 id="cart-notes-title" className="cart-notes__title">
                    Beleška za restoran
                  </h2>
                </div>

                <span className="cart-notes__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M5 19h4L19 9l-4-4L5 15v4Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />

                    <path
                      d="m13.5 6.5 4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>
                </span>
              </div>

              <label className="cart-notes__label" htmlFor="order-notes">
                Posebna napomena
              </label>

              <textarea
                id="order-notes"
                className="cart-notes__textarea"
                value={state.notes}
                maxLength={500}
                onChange={(event) =>
                  dispatch({
                    type: "SET-NOTES",
                    payload: {
                      notes: event.target.value,
                    },
                  })
                }
                rows={4}
                placeholder="Na primer: bez luka, dobro pečeno..."
              />

              <div className="cart-notes__footer">
                <p>Restoran će videti ovu napomenu prilikom pripreme.</p>

                <span>{state.notes.length}/500</span>
              </div>
            </section>
          )}
        </section>

        <aside className="cart-summary" aria-labelledby="cart-summary-title">
          <div className="cart-summary__header">
            <span className="cart-summary__eyebrow">PREGLED PORUDŽBINE</span>

            <h2 id="cart-summary-title" className="cart-summary__title">
              Ukupan iznos
            </h2>

            <p className="cart-summary__description">
              Konačna cena dostave zavisi od izbora na sledećem koraku.
            </p>
          </div>

          <div className="cart-summary__rows">
            <div className="cart-summary__row">
              <span>Jela i dodaci</span>

              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div className="cart-summary__row">
              <span>Dostava</span>

              <strong className="cart-summary__pending-value">
                Na checkout-u
              </strong>
            </div>
          </div>

          <div className="cart-summary__total">
            <div>
              <span>Međuzbir</span>

              <small>pre dostave</small>
            </div>

            <strong>{formatPrice(subtotal)}</strong>
          </div>

          <div className="cart-summary__delivery-note">
            <span className="cart-summary__delivery-icon" aria-hidden="true">
              i
            </span>

            <p>
              Na sledećem koraku biraš dostavu ili lično preuzimanje i tada
              dobijaš konačan iznos porudžbine.
            </p>
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

          <div className="cart-summary__trust">
            <span aria-hidden="true">✓</span>

            <p>Sve izmene možeš proveriti pre slanja porudžbine.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
