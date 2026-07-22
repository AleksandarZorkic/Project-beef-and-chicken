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

const FREE_SIDE_DISH_COUNT = 4;
const EXTRA_SIDE_DISH_PRICE = 50;

function resolveImageUrl(imageUrl?: string) {
  if (!imageUrl) return null;

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${API_ORIGIN}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

function formatPrice(value: number) {
  return `${value.toLocaleString("sr-RS")} RSD`;
}

function sortOptions(a: DishOptionDto, b: DishOptionDto) {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  return a.name.localeCompare(b.name, "sr");
}

function buildCartSelectedOptions(
  selectedOptions: DishOptionDto[],
): CartSelectedOption[] {
  const regularSideDishes = selectedOptions
    .filter((option) => option.type === "SideDish" && !option.isAlwaysPaid)
    .sort(sortOptions);

  const alwaysPaidSideDishes = selectedOptions
    .filter((option) => option.type === "SideDish" && option.isAlwaysPaid)
    .sort(sortOptions);

  const spices = selectedOptions
    .filter((option) => option.type === "Spice")
    .sort(sortOptions);

  const pricedRegularSideDishes = regularSideDishes.map((option, index) => ({
    optionId: option.id,
    name: option.name,
    type: option.type,
    unitPrice: index < FREE_SIDE_DISH_COUNT ? 0 : EXTRA_SIDE_DISH_PRICE,
  }));

  const pricedAlwaysPaidSideDishes = alwaysPaidSideDishes.map((option) => ({
    optionId: option.id,
    name: option.name,
    type: option.type,
    unitPrice: option.price,
  }));

  const pricedSpices = spices.map((option) => ({
    optionId: option.id,
    name: option.name,
    type: option.type,
    unitPrice: 0,
  }));

  return [
    ...pricedRegularSideDishes,
    ...pricedAlwaysPaidSideDishes,
    ...pricedSpices,
  ];
}

type DishOptionsModalProps = {
  dish: DishMenuDto;
  options: DishOptionDto[];
  onClose: () => void;
  onAddToCart: (selectedOptions: CartSelectedOption[]) => void;
};

function DishOptionsModal({
  dish,
  options,
  onClose,
  onAddToCart,
}: DishOptionsModalProps) {
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);

  const sideDishes = useMemo(() => {
    return options
      .filter((option) => option.type === "SideDish")
      .sort(sortOptions);
  }, [options]);

  const spices = useMemo(() => {
    return options
      .filter((option) => option.type === "Spice")
      .sort(sortOptions);
  }, [options]);

  const selectedOptions = useMemo(() => {
    return options.filter((option) => selectedOptionIds.includes(option.id));
  }, [options, selectedOptionIds]);

  const cartSelectedOptions = useMemo(() => {
    return buildCartSelectedOptions(selectedOptions);
  }, [selectedOptions]);

  const optionsTotal = useMemo(() => {
    return cartSelectedOptions.reduce(
      (sum, option) => sum + option.unitPrice,
      0,
    );
  }, [cartSelectedOptions]);

  const regularSideDishCount = selectedOptions.filter(
    (option) => option.type === "SideDish" && !option.isAlwaysPaid,
  ).length;

  const paidRegularSideDishCount = Math.max(
    0,
    regularSideDishCount - FREE_SIDE_DISH_COUNT,
  );

  const totalUnitPrice = dish.price + optionsTotal;

  function toggleOption(optionId: number) {
    setSelectedOptionIds((prev) => {
      if (prev.includes(optionId)) {
        return prev.filter((id) => id !== optionId);
      }

      return [...prev, optionId];
    });
  }

  function getSelectedOptionPrice(option: DishOptionDto) {
    const pricedOption = cartSelectedOptions.find(
      (selected) => selected.optionId === option.id,
    );

    return pricedOption?.unitPrice ?? 0;
  }

  function handleAddToCart() {
    onAddToCart(cartSelectedOptions);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 10,
          padding: 20,
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div>
            <h3 style={{ marginTop: 0 }}>{dish.name}</h3>
            <div>Osnovna cena: {formatPrice(dish.price)}</div>
          </div>

          <button type="button" onClick={onClose}>
            Zatvori
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fafafa",
          }}
        >
          <strong>Pravila za priloge</strong>
          <div style={{ marginTop: 6 }}>
            Prva 4 obična priloga su besplatna. Svaki sledeći običan prilog se
            naplaćuje {formatPrice(EXTRA_SIDE_DISH_PRICE)}.
          </div>
          <div>
            Začini su besplatni. Prilozi označeni kao naplativi se plaćaju
            odmah.
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <h4>Prilozi</h4>

          {sideDishes.length === 0 ? (
            <div>Nema dostupnih priloga.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {sideDishes.map((option) => {
                const checked = selectedOptionIds.includes(option.id);
                const selectedPrice = getSelectedOptionPrice(option);

                return (
                  <label
                    key={option.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      border: checked ? "2px solid black" : "1px solid #ddd",
                      borderRadius: 8,
                      padding: 10,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ display: "flex", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOption(option.id)}
                      />
                      <span>{option.name}</span>
                    </span>

                    <span>
                      {option.isAlwaysPaid
                        ? `+${formatPrice(option.price)}`
                        : checked && selectedPrice > 0
                          ? `+${formatPrice(selectedPrice)}`
                          : "besplatno"}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          <h4>Začini</h4>

          {spices.length === 0 ? (
            <div>Nema dostupnih začina.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {spices.map((option) => {
                const checked = selectedOptionIds.includes(option.id);

                return (
                  <label
                    key={option.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      border: checked ? "2px solid black" : "1px solid #ddd",
                      borderRadius: 8,
                      padding: 10,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ display: "flex", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOption(option.id)}
                      />
                      <span>{option.name}</span>
                    </span>

                    <span>besplatno</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 14,
            border: "1px solid #ccc",
            borderRadius: 8,
            background: "#f7f7f7",
            display: "grid",
            gap: 6,
          }}
        >
          <div>Izabrano običnih priloga: {regularSideDishCount}</div>
          <div>
            Dodatno naplaćenih običnih priloga: {paidRegularSideDishCount}
          </div>
          <div>Doplata za priloge/začine: {formatPrice(optionsTotal)}</div>
          <div style={{ fontWeight: 800 }}>
            Cena po komadu: {formatPrice(totalUnitPrice)}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 18,
          }}
        >
          <button type="button" onClick={onClose}>
            Otkaži
          </button>

          <button type="button" onClick={handleAddToCart}>
            Dodaj u korpu
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenuPage() {
  const { dispatch } = useCart();

  const [data, setData] = useState<DishMenuDto[]>([]);
  const [dishOptions, setDishOptions] = useState<DishOptionDto[]>([]);
  const [selectedDish, setSelectedDish] = useState<DishMenuDto | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myAllergens, setMyAllergens] = useState<Allergen[]>([]);

  useEffect(() => {
    async function loadMenuData() {
      try {
        setLoading(true);
        setError(null);

        const [menu, options] = await Promise.all([
          getMenu(),
          getActiveDishOptions(),
        ]);

        setData(menu);
        setDishOptions(options);

        try {
          const userAllergens = await getMyAllergens();
          setMyAllergens(userAllergens);
        } catch {
          setMyAllergens([]);
        }
      } catch (e: any) {
        setError(
          e?.response?.data?.message ??
            e?.response?.data?.title ??
            e?.message ??
            "Došlo je do greške prilikom učitavanja menija.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadMenuData();
  }, []);

  const myAllergenId = useMemo(() => {
    return new Set(myAllergens.map((allergen) => allergen.id));
  }, [myAllergens]);

  function getMatchingAllergens(dish: DishMenuDto) {
    return dish.allergens.filter((allergen) =>
      myAllergenId.has(allergen.allergenId),
    );
  }

  function handleAddDishWithOptions(selectedOptions: CartSelectedOption[]) {
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

  if (loading) return <div>Učitavam meni...</div>;
  if (error) return <div style={{ color: "crimson" }}>{error}</div>;

  return (
    <div>
      <h2>Meni</h2>

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

              <button
                type="button"
                style={{ marginTop: 8 }}
                onClick={() => setSelectedDish(d)}
              >
                Dodaj u korpu
              </button>
            </div>
          );
        })}
      </div>

      {selectedDish && (
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
