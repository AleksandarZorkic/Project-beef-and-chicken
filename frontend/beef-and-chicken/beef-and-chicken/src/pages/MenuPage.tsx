import { useEffect, useMemo, useState } from "react";
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
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AppRoles } from "../auth/roles";
import {
  getRestaurantSettings,
  type RestaurantSettingsDto,
} from "../api/restaurantSettingsApi";
import { cartSubtotal } from "../state/cart/cart.selectors";

function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${API_ORIGIN}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

function formatPrice(value: number) {
  return `${value.toLocaleString("sr-RS")} RSD`;
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
    canOrder && !!restaurantSettings?.isDeliveryEnabled && !loadingSettings;

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

        if (!isMounted) return;

        setData(menu);
        setDishOptions(options);
        setRestaurantSettings(settings);

        if (canOrder) {
          try {
            const userAllergens = await getMyAllergens();

            if (!isMounted) return;

            setMyAllergens(userAllergens);
          } catch {
            if (!isMounted) return;

            setMyAllergens([]);
          }
        } else {
          setMyAllergens([]);
        }
      } catch (e: any) {
        if (!isMounted) return;

        setError(
          e?.response?.data?.message ??
            e?.response?.data?.title ??
            e?.message ??
            "Došlo je do greške prilikom učitavanja menija.",
        );
      } finally {
        if (!isMounted) return;

        setLoading(false);
        setLoadingSettings(false);
      }
    }

    loadMenuData();

    return () => {
      isMounted = false;
    };
  }, [canOrder]);

  const myAllergenId = useMemo(() => {
    return new Set(myAllergens.map((allergen) => allergen.id));
  }, [myAllergens]);

  function getMatchingAllergens(dish: DishMenuDto) {
    return dish.allergens.filter((allergen) =>
      myAllergenId.has(allergen.allergenId),
    );
  }

  function handleAddDishWithOptions(selectedOptions: CartSelectedOption[]) {
    if (!canOrder) return;
    if (!selectedDish) return;

    const optionsTotal = selectedOptions.reduce(
      (sum, option) => sum + option.unitPrice,
      0,
    );

    dispatch({
      type: "ADD-ITEM",
      payload: {
        dishId: selectedDish.id,
        name: selectedDish.name,
        unitPrice: selectedDish.price,
        optionsTotal,
        selectedOptions,
      },
    });

    setSelectedDish(null);
  }

  function handleAddDishDirectly(dish: DishMenuDto) {
    if (!canOrder) return;

    dispatch({
      type: "ADD-ITEM",
      payload: {
        dishId: dish.id,
        name: dish.name,
        unitPrice: dish.price,
        optionsTotal: 0,
        selectedOptions: [],
      },
    });
  }

  if (loading) return <div>Učitavam meni...</div>;
  if (error) return <div style={{ color: "crimson" }}>{error}</div>;

  return (
    <div>
      <h2>Meni</h2>

      {restaurantSettings && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            background: restaurantSettings.isDeliveryEnabled
              ? "white"
              : "#fff2f2",
            display: "grid",
            gap: 6,
          }}
        >
          <strong>Pravila dostave</strong>

          {!restaurantSettings.isDeliveryEnabled ? (
            <div style={{ color: "crimson", fontWeight: 700 }}>
              Dostava trenutno nije dostupna.
            </div>
          ) : (
            <>
              <div>
                Minimalna porudžbina:{" "}
                <strong>
                  {restaurantSettings.minimumOrderAmount.toLocaleString(
                    "sr-RS",
                  )}{" "}
                  RSD
                </strong>
              </div>

              <div>
                Cena dostave:{" "}
                <strong>
                  {restaurantSettings.deliveryFee.toLocaleString("sr-RS")} RSD
                </strong>
              </div>

              {restaurantSettings.freeDeliveryThreshold && (
                <div>
                  Besplatna dostava preko:{" "}
                  <strong>
                    {restaurantSettings.freeDeliveryThreshold.toLocaleString(
                      "sr-RS",
                    )}{" "}
                    RSD
                  </strong>
                </div>
              )}

              {canOrder && missingForMinimum > 0 && subtotal > 0 && (
                <div style={{ color: "crimson", fontWeight: 700 }}>
                  U korpi trenutno imaš {subtotal.toLocaleString("sr-RS")} RSD.
                  Dodaj još {missingForMinimum.toLocaleString("sr-RS")} RSD za
                  poručivanje.
                </div>
              )}

              {canOrder &&
                missingForMinimum === 0 &&
                missingForFreeDelivery > 0 && (
                  <div style={{ color: "#8a5a00" }}>
                    Dodaj još {missingForFreeDelivery.toLocaleString("sr-RS")}{" "}
                    RSD za besplatnu dostavu.
                  </div>
                )}
            </>
          )}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
        }}
      >
        {data.map((d) => {
          const matchingAllergens = getMatchingAllergens(d);
          const directAllergens = matchingAllergens.filter((a) => !a.isTrace);
          const traceAllergens = matchingAllergens.filter((a) => a.isTrace);
          const hasAllergyWarning = matchingAllergens.length > 0;
          const imageUrl = resolveImageUrl(d.imageUrl);

          return (
            <div
              key={d.id}
              style={{
                border: hasAllergyWarning
                  ? "2px solid #d9534f"
                  : "1px solid #ddd",
                background: hasAllergyWarning ? "#fff2f2" : "white",
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={d.name}
                  style={{
                    width: "100%",
                    height: 180,
                    objectFit: "cover",
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                />
              )}

              <h3>{d.name}</h3>

              <p>{d.description}</p>

              <strong>{formatPrice(d.price)}</strong>

              {hasAllergyWarning && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 6,
                    background: "#ffe1e1",
                    color: "#9f1d1d",
                    fontWeight: 600,
                  }}
                >
                  ⚠ Ovo jelo sadrži alergene koje ste označili na profilu.
                  {directAllergens.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      Sadrži:{" "}
                      {directAllergens
                        .map((allergen) => allergen.allergenName)
                        .join(", ")}
                    </div>
                  )}
                  {traceAllergens.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      Može sadržati tragove:{" "}
                      {traceAllergens
                        .map((allergen) => allergen.allergenName)
                        .join(", ")}
                    </div>
                  )}
                </div>
              )}

              {d.allergens.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <strong>Alergeni: </strong>

                  {d.allergens.map((allergen) => (
                    <span
                      key={allergen.allergenId}
                      style={{
                        display: "inline-block",
                        border: "1px solid #ddd",
                        borderRadius: 999,
                        padding: "2px 8px",
                        marginRight: 6,
                        marginTop: 4,
                        fontSize: 13,
                      }}
                    >
                      {allergen.allergenName}
                      {allergen.isTrace ? " — tragovi" : ""}
                    </span>
                  ))}
                </div>
              )}

              {canAddToCart ? (
                <button
                  type="button"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    if (
                      !d.allowsSideDishes &&
                      !d.allowsSpices &&
                      !d.allowsSweetAdditions
                    ) {
                      handleAddDishDirectly(d);
                      return;
                    }

                    setSelectedDish(d);
                  }}
                >
                  Dodaj u korpu
                </button>
              ) : canOrder &&
                restaurantSettings &&
                !restaurantSettings.isDeliveryEnabled ? (
                <div style={{ marginTop: 10, color: "crimson", fontSize: 13 }}>
                  Dostava trenutno nije dostupna.
                </div>
              ) : isAuthenticated ? (
                <div style={{ marginTop: 10, color: "#777", fontSize: 13 }}>
                  Samo kupci mogu da dodaju jela u korpu.
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  <div style={{ color: "#777", fontSize: 13 }}>
                    Prijavi se kao kupac da bi dodao jelo u korpu.
                  </div>

                  <Link to="/login" style={{ fontWeight: 700 }}>
                    Prijavi se
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canAddToCart && selectedDish && (
        <DishOptionsModal
          dish={selectedDish}
          options={dishOptions}
          onClose={() => setSelectedDish(null)}
          onAddToCart={handleAddDishWithOptions}
        />
      )}
    </div>
  );
}
