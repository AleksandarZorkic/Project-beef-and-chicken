import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../state/cart/CartContext";
import { getMenu } from "../api/menuApi";
import type { DishMenuDto } from "../api/menuApi";
import { API_ORIGIN } from "../api/https";
import { getMyAllergens } from "../api/userAllergenApi";
import type { Allergen } from "../types/allergen";
import {
  getActiveDishOptions,
  type DishOptionDto,
} from "../api/dishOptionsApi";
import type { CartSelectedOption } from "../state/cart/cart.types";
import DishOptionsModal from "../components/menu/DishOptionsModal";
import { useAuth } from "../auth/AuthContext";
import { AppRoles } from "../auth/roles";
import {
  getRestaurantSettings,
  type RestaurantSettingsDto,
} from "../api/restaurantSettingsApi";
import { cartSubtotal } from "../state/cart/cart.selectors";
import "../styles/MenuPage.scss";

function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) {
    return null;
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${API_ORIGIN}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

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

function isDishOnSale(dish: DishMenuDto) {
  return (
    dish.isOnSale &&
    typeof dish.salePrice === "number" &&
    dish.salePrice > 0 &&
    dish.salePrice < dish.price
  );
}

function getDishEffectivePrice(dish: DishMenuDto) {
  if (isDishOnSale(dish)) {
    return dish.salePrice!;
  }

  return dish.effectivePrice ?? dish.price;
}

function getCategoryAnchorId(categoryId: number) {
  return `menu-category-${categoryId}`;
}

export default function MenuPage() {
  const { state, dispatch } = useCart();
  const { isAuthenticated, hasRole } = useAuth();

  const canOrder = hasRole(AppRoles.Customer);

  const [data, setData] = useState<DishMenuDto[]>([]);
  const [dishOptions, setDishOptions] = useState<DishOptionDto[]>([]);
  const [selectedDish, setSelectedDish] = useState<DishMenuDto | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myAllergens, setMyAllergens] = useState<Allergen[]>([]);

  const [restaurantSettings, setRestaurantSettings] =
    useState<RestaurantSettingsDto | null>(null);

  const [loadingSettings, setLoadingSettings] = useState(true);

  const subtotal = cartSubtotal(state);

  const totalItemQuantity = state.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const missingForMinimum =
    restaurantSettings && subtotal < restaurantSettings.minimumOrderAmount
      ? restaurantSettings.minimumOrderAmount - subtotal
      : 0;

  const missingForFreeDelivery =
    restaurantSettings?.freeDeliveryThreshold &&
    subtotal < restaurantSettings.freeDeliveryThreshold
      ? restaurantSettings.freeDeliveryThreshold - subtotal
      : 0;

  const canAddToCart =
    canOrder && !loadingSettings && Boolean(restaurantSettings);

  const minimumOrderProgress =
    restaurantSettings?.minimumOrderAmount &&
    restaurantSettings.minimumOrderAmount > 0
      ? Math.min((subtotal / restaurantSettings.minimumOrderAmount) * 100, 100)
      : 100;

  const freeDeliveryProgress =
    restaurantSettings?.freeDeliveryThreshold &&
    restaurantSettings.freeDeliveryThreshold > 0
      ? Math.min(
          (subtotal / restaurantSettings.freeDeliveryThreshold) * 100,
          100,
        )
      : 0;

  const categoryGroups = useMemo(() => {
    const groups = new Map<
      number,
      {
        categoryId: number;
        categoryName: string;
        dishes: DishMenuDto[];
      }
    >();

    data.forEach((dish) => {
      const categoryId = dish.categoryId;
      const categoryName = dish.categoryName || "Ostalo";

      if (!groups.has(categoryId)) {
        groups.set(categoryId, {
          categoryId,
          categoryName,
          dishes: [],
        });
      }

      groups.get(categoryId)?.dishes.push(dish);
    });

    return Array.from(groups.values())
      .sort((a, b) => a.categoryId - b.categoryId)
      .map((group) => ({
        ...group,
        dishes: group.dishes.sort((a, b) =>
          a.name.localeCompare(b.name, "sr-RS"),
        ),
      }));
  }, [data]);

  useEffect(() => {
    let isMounted = true;

    async function loadMenuData() {
      try {
        setLoading(true);
        setLoadingSettings(true);
        setError(null);

        const [menu, options, settings] = await Promise.all([
          getMenu(),
          getActiveDishOptions(),
          getRestaurantSettings(),
        ]);

        if (!isMounted) {
          return;
        }

        setData(menu);
        setDishOptions(options);
        setRestaurantSettings(settings);

        if (canOrder) {
          try {
            const userAllergens = await getMyAllergens();

            if (!isMounted) {
              return;
            }

            setMyAllergens(userAllergens);
          } catch {
            if (!isMounted) {
              return;
            }

            setMyAllergens([]);
          }
        } else {
          setMyAllergens([]);
        }
      } catch (e: any) {
        if (!isMounted) {
          return;
        }

        setError(
          e?.response?.data?.message ??
            e?.response?.data?.title ??
            e?.message ??
            "Došlo je do greške prilikom učitavanja menija.",
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setLoading(false);
        setLoadingSettings(false);
      }
    }

    loadMenuData();

    return () => {
      isMounted = false;
    };
  }, [canOrder]);

  const myAllergenIds = useMemo(() => {
    return new Set(myAllergens.map((allergen) => allergen.id));
  }, [myAllergens]);

  function getMatchingAllergens(dish: DishMenuDto) {
    return dish.allergens.filter((allergen) =>
      myAllergenIds.has(allergen.allergenId),
    );
  }

  function handleAddDishWithOptions(selectedOptions: CartSelectedOption[]) {
    if (!canOrder || !selectedDish) {
      return;
    }

    const optionsTotal = selectedOptions.reduce(
      (sum, option) => sum + option.unitPrice,
      0,
    );

    dispatch({
      type: "ADD-ITEM",
      payload: {
        dishId: selectedDish.id,
        name: selectedDish.name,
        imageUrl: selectedDish.imageUrl,
        unitPrice: getDishEffectivePrice(selectedDish),
        regularPrice: selectedDish.price,
        isOnSale: isDishOnSale(selectedDish),
        salePrice: selectedDish.salePrice ?? null,
        optionsTotal,
        selectedOptions,
      },
    });

    setSelectedDish(null);
  }

  function handleAddDishDirectly(dish: DishMenuDto) {
    if (!canOrder) {
      return;
    }

    dispatch({
      type: "ADD-ITEM",
      payload: {
        dishId: dish.id,
        name: dish.name,
        imageUrl: dish.imageUrl,
        unitPrice: getDishEffectivePrice(dish),
        regularPrice: dish.price,
        isOnSale: isDishOnSale(dish),
        salePrice: dish.salePrice ?? null,
        optionsTotal: 0,
        selectedOptions: [],
      },
    });
  }

  if (loading) {
    return (
      <main className="menu-page menu-page--state">
        <section className="menu-state-card" aria-live="polite" role="status">
          <span className="menu-state-card__spinner" aria-hidden="true" />

          <span className="menu-state-card__eyebrow">BEEF N&apos; CHICKEN</span>

          <h1 className="menu-state-card__title">Učitavamo meni</h1>

          <p className="menu-state-card__text">
            Pripremamo ponudu jela i dostupnih dodataka.
          </p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="menu-page menu-page--state">
        <section
          className="menu-state-card menu-state-card--error"
          role="alert"
        >
          <span className="menu-state-card__error-icon" aria-hidden="true">
            !
          </span>

          <span className="menu-state-card__eyebrow">
            GREŠKA PRI UČITAVANJU
          </span>

          <h1 className="menu-state-card__title">
            Meni trenutno nije dostupan
          </h1>

          <p className="menu-state-card__text">{error}</p>

          <button
            type="button"
            className="menu-state-card__button"
            onClick={() => window.location.reload()}
          >
            Pokušaj ponovo
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="menu-page">
      <section className="menu-hero">
        <div className="menu-hero__inner">
          <div className="menu-hero__content">
            <span className="menu-hero__eyebrow">
              PRIPREMLJENO ZA OZBILJAN APETIT
            </span>

            <h1 className="menu-hero__title">
              Izaberi svoj
              <span> savršen obrok.</span>
            </h1>

            <p className="menu-hero__description">
              Sočni burgeri, hrskava piletina, bogati obroci i dodaci koje biraš
              po svom ukusu.
            </p>

            <div className="menu-hero__meta">
              <span>
                <strong>{data.length}</strong>
                {data.length === 1 ? " jelo u ponudi" : " jela u ponudi"}
              </span>

              <span>Alergeni jasno označeni</span>

              <span>Dodaci po izboru</span>
            </div>
          </div>

          <div className="menu-hero__visual" aria-hidden="true">
            <div className="menu-hero__logo-shell">
              <img src="/logo.png" alt="" className="menu-hero__logo" />
            </div>
          </div>
        </div>
      </section>
      <div className="menu-content">
        <div className="menu-content__inner">
          {restaurantSettings && (
            <aside
              className={[
                "delivery-card",
                restaurantSettings.isDeliveryEnabled
                  ? ""
                  : "delivery-card--pickup-only",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-labelledby="delivery-card-title"
            >
              <div className="delivery-card__header">
                <div>
                  <span className="delivery-card__eyebrow">
                    INFORMACIJE O PORUČIVANJU
                  </span>

                  <h2 id="delivery-card-title" className="delivery-card__title">
                    Dostava i lično preuzimanje
                  </h2>
                </div>

                <div
                  className={[
                    "delivery-card__status",
                    restaurantSettings.isDeliveryEnabled
                      ? "delivery-card__status--open"
                      : "delivery-card__status--pickup",
                  ].join(" ")}
                >
                  <span
                    className="delivery-card__status-dot"
                    aria-hidden="true"
                  />

                  {restaurantSettings.isDeliveryEnabled
                    ? "Dostava je dostupna"
                    : "Samo lično preuzimanje"}
                </div>
              </div>

              {restaurantSettings.isDeliveryEnabled ? (
                <>
                  <div className="delivery-card__metrics">
                    <div className="delivery-card__metric">
                      <span className="delivery-card__metric-label">
                        Minimalna porudžbina
                      </span>

                      <strong className="delivery-card__metric-value">
                        {formatPrice(restaurantSettings.minimumOrderAmount)}
                      </strong>
                    </div>

                    <div className="delivery-card__metric">
                      <span className="delivery-card__metric-label">
                        Cena dostave
                      </span>

                      <strong className="delivery-card__metric-value">
                        {formatPrice(restaurantSettings.deliveryFee)}
                      </strong>
                    </div>

                    <div className="delivery-card__metric">
                      <span className="delivery-card__metric-label">
                        Besplatna dostava
                      </span>

                      <strong className="delivery-card__metric-value">
                        {restaurantSettings.freeDeliveryThreshold
                          ? `Preko ${formatPrice(
                              restaurantSettings.freeDeliveryThreshold,
                            )}`
                          : "Nije dostupna"}
                      </strong>
                    </div>
                  </div>

                  {canOrder && subtotal > 0 && (
                    <div
                      className="delivery-card__progress-section"
                      aria-live="polite"
                    >
                      {missingForMinimum > 0 ? (
                        <div className="delivery-progress">
                          <div className="delivery-progress__heading">
                            <span>
                              Još{" "}
                              <strong>{formatPrice(missingForMinimum)}</strong>{" "}
                              do minimalnog iznosa za dostavu
                            </span>

                            <span>{formatPrice(subtotal)}</span>
                          </div>

                          <div
                            className="delivery-progress__track"
                            aria-hidden="true"
                          >
                            <span
                              className="delivery-progress__value"
                              style={{
                                width: `${minimumOrderProgress}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : missingForFreeDelivery > 0 ? (
                        <div className="delivery-progress">
                          <div className="delivery-progress__heading">
                            <span>
                              Još{" "}
                              <strong>
                                {formatPrice(missingForFreeDelivery)}
                              </strong>{" "}
                              do besplatne dostave
                            </span>

                            <span>{formatPrice(subtotal)}</span>
                          </div>

                          <div
                            className="delivery-progress__track"
                            aria-hidden="true"
                          >
                            <span
                              className="delivery-progress__value delivery-progress__value--free"
                              style={{
                                width: `${freeDeliveryProgress}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="delivery-card__success">
                          <span aria-hidden="true">✓</span>
                          Tvoja porudžbina ispunjava uslove za besplatnu
                          dostavu.
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="delivery-card__pickup-message">
                  <span
                    className="delivery-card__pickup-icon"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M4 10h16v10H4V10Zm2-6h12l2 6H4l2-6Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                      />

                      <path
                        d="M8 14h8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>

                  <div>
                    <strong>Dostava je trenutno isključena</strong>

                    <p>
                      Porudžbinu i dalje možeš da napraviš i na checkout-u
                      izabereš lično preuzimanje u restoranu.
                    </p>
                  </div>
                </div>
              )}
            </aside>
          )}

          <section
            className="menu-catalog"
            aria-labelledby="menu-catalog-title"
          >
            <header className="menu-catalog__header">
              <div>
                <span className="menu-catalog__eyebrow">NAŠA PONUDA</span>

                <h2 id="menu-catalog-title" className="menu-catalog__title">
                  Šta ti se jede danas?
                </h2>

                <p className="menu-catalog__description">
                  Izaberi jelo, proveri alergene i dodaj priloge ili dodatke
                  koji ti odgovaraju.
                </p>
              </div>

              <div className="menu-catalog__header-side">
                <div className="menu-catalog__count">
                  <strong>{data.length}</strong>
                  <span>{data.length === 1 ? "jelo" : "jela"}</span>
                </div>

                {canOrder && totalItemQuantity > 0 && (
                  <Link to="/cart" className="menu-catalog__cart">
                    <span
                      className="menu-catalog__cart-icon"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M4 5h2l1.5 9.5h9.8L20 8H7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        <circle cx="10" cy="18" r="1.4" fill="currentColor" />
                        <circle cx="17" cy="18" r="1.4" fill="currentColor" />
                      </svg>
                    </span>

                    <span className="menu-catalog__cart-copy">
                      <small>Korpa</small>

                      <strong>
                        {totalItemQuantity}{" "}
                        {getItemCountLabel(totalItemQuantity)}
                        {" • "}
                        {formatPrice(subtotal)}
                      </strong>
                    </span>

                    <span
                      className="menu-catalog__cart-arrow"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </Link>
                )}
              </div>
            </header>

            {data.length === 0 ? (
              <div className="menu-empty-state">
                <img
                  src="/logo.png"
                  alt=""
                  className="menu-empty-state__logo"
                />

                <h3 className="menu-empty-state__title">
                  Trenutno nema dostupnih jela
                </h3>

                <p className="menu-empty-state__text">
                  Ponuda će se pojaviti čim restoran doda aktivna jela u meni.
                </p>
              </div>
            ) : (
              <>
                <nav className="menu-category-nav" aria-label="Kategorije jela">
                  {categoryGroups.map((category) => (
                    <a
                      key={category.categoryId}
                      href={`#${getCategoryAnchorId(category.categoryId)}`}
                      className="menu-category-nav__link"
                    >
                      <span>{category.categoryName}</span>

                      <small>
                        {category.dishes.length}{" "}
                        {category.dishes.length === 1 ? "jelo" : "jela"}
                      </small>
                    </a>
                  ))}
                </nav>

                <div className="menu-category-sections">
                  {categoryGroups.map((category) => (
                    <section
                      key={category.categoryId}
                      id={getCategoryAnchorId(category.categoryId)}
                      className="menu-category-section"
                    >
                      <header className="menu-category-section__header">
                        <div>
                          <span className="menu-category-section__eyebrow">
                            KATEGORIJA
                          </span>

                          <h3 className="menu-category-section__title">
                            {category.categoryName}
                          </h3>
                        </div>

                        <span className="menu-category-section__count">
                          {category.dishes.length}{" "}
                          {category.dishes.length === 1 ? "jelo" : "jela"}
                        </span>
                      </header>

                      <div className="menu-grid">
                        {category.dishes.map((dish) => {
                          const matchingAllergens = getMatchingAllergens(dish);

                          const directAllergens = matchingAllergens.filter(
                            (allergen) => !allergen.isTrace,
                          );

                          const traceAllergens = matchingAllergens.filter(
                            (allergen) => allergen.isTrace,
                          );

                          const hasAllergyWarning =
                            matchingAllergens.length > 0;

                          const imageUrl = resolveImageUrl(dish.imageUrl);

                          const dishOnSale = isDishOnSale(dish);
                          const effectivePrice = getDishEffectivePrice(dish);

                          const hasConfigurableOptions =
                            dish.allowsSideDishes ||
                            dish.allowsSpices ||
                            dish.allowsSweetAdditions;

                          return (
                            <article
                              key={dish.id}
                              className={[
                                "dish-card",
                                hasAllergyWarning
                                  ? "dish-card--allergy-warning"
                                  : "",
                                dishOnSale ? "dish-card--sale" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              <div className="dish-card__media">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={dish.name}
                                    className="dish-card__image"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="dish-card__image-fallback">
                                    <img src="/logo.png" alt="" />

                                    <span>Slika uskoro</span>
                                  </div>
                                )}

                                <div className="dish-card__media-overlay" />

                                <span
                                  className={[
                                    "dish-card__price",
                                    dishOnSale ? "dish-card__price--sale" : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  {dishOnSale ? (
                                    <>
                                      <span className="dish-card__old-price">
                                        {formatPrice(dish.price)}
                                      </span>

                                      <span className="dish-card__new-price">
                                        {formatPrice(effectivePrice)}
                                      </span>
                                    </>
                                  ) : (
                                    formatPrice(dish.price)
                                  )}
                                </span>

                                {dishOnSale && (
                                  <span className="dish-card__sale-badge">
                                    AKCIJA
                                  </span>
                                )}

                                {hasAllergyWarning && (
                                  <span className="dish-card__warning-badge">
                                    Upozorenje na alergene
                                  </span>
                                )}
                              </div>

                              <div className="dish-card__body">
                                <div className="dish-card__main">
                                  <h3 className="dish-card__title">
                                    {dish.name}
                                  </h3>

                                  <p className="dish-card__description">
                                    {dish.description}
                                  </p>

                                  {hasAllergyWarning && (
                                    <div
                                      className="dish-allergy-warning"
                                      role="alert"
                                    >
                                      <div className="dish-allergy-warning__header">
                                        <span
                                          className="dish-allergy-warning__icon"
                                          aria-hidden="true"
                                        >
                                          !
                                        </span>

                                        <strong>
                                          Ovo jelo sadrži alergene označene na
                                          tvom profilu
                                        </strong>
                                      </div>

                                      {directAllergens.length > 0 && (
                                        <p>
                                          <strong>Sadrži:</strong>{" "}
                                          {directAllergens
                                            .map(
                                              (allergen) =>
                                                allergen.allergenName,
                                            )
                                            .join(", ")}
                                        </p>
                                      )}

                                      {traceAllergens.length > 0 && (
                                        <p>
                                          <strong>
                                            Može sadržati tragove:
                                          </strong>{" "}
                                          {traceAllergens
                                            .map(
                                              (allergen) =>
                                                allergen.allergenName,
                                            )
                                            .join(", ")}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {dish.allergens.length > 0 && (
                                    <div className="dish-card__allergens">
                                      <span className="dish-card__allergens-label">
                                        Alergeni
                                      </span>

                                      <div className="dish-card__allergen-list">
                                        {dish.allergens.map((allergen) => (
                                          <span
                                            key={allergen.allergenId}
                                            className={[
                                              "dish-card__allergen",
                                              allergen.isTrace
                                                ? "dish-card__allergen--trace"
                                                : "",
                                            ]
                                              .filter(Boolean)
                                              .join(" ")}
                                          >
                                            {allergen.allergenName}

                                            {allergen.isTrace && (
                                              <small>tragovi</small>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="dish-card__footer">
                                  {canAddToCart ? (
                                    <button
                                      type="button"
                                      className="dish-card__button"
                                      onClick={() => {
                                        if (!hasConfigurableOptions) {
                                          handleAddDishDirectly(dish);
                                          return;
                                        }

                                        setSelectedDish(dish);
                                      }}
                                    >
                                      <span>
                                        {hasConfigurableOptions
                                          ? "Izaberi dodatke"
                                          : "Dodaj u korpu"}
                                      </span>

                                      <span
                                        className="dish-card__button-arrow"
                                        aria-hidden="true"
                                      >
                                        →
                                      </span>
                                    </button>
                                  ) : isAuthenticated ? (
                                    <div className="dish-card__notice">
                                      Samo kupci mogu da dodaju jela u korpu.
                                    </div>
                                  ) : (
                                    <div className="dish-card__login">
                                      <p>
                                        Prijavi se kao kupac da bi dodao jelo u
                                        korpu.
                                      </p>

                                      <Link
                                        to="/login"
                                        className="dish-card__login-link"
                                      >
                                        Prijavi se
                                      </Link>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      {canAddToCart && selectedDish && (
        <DishOptionsModal
          dish={selectedDish}
          options={dishOptions}
          onClose={() => setSelectedDish(null)}
          onAddToCart={handleAddDishWithOptions}
        />
      )}
    </main>
  );
}
