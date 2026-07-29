import { useMemo, useState } from "react";
import type { DishMenuDto } from "../../api/menuApi";
import type { DishOptionDto } from "../../api/dishOptionsApi";
import type { CartSelectedOption } from "../../state/cart/cart.types";

const FREE_SIDE_DISH_COUNT = 4;
const EXTRA_SIDE_DISH_PRICE = 50;

type DishOptionsModalProps = {
  dish: DishMenuDto;
  options: DishOptionDto[];
  onClose: () => void;
  onAddToCart: (selectedOptions: CartSelectedOption[]) => void;
};

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

  const sweetAdditions = selectedOptions
    .filter((option) => option.type === "SweetAddition")
    .sort(sortOptions);

  const pricedSweetAdditions = sweetAdditions.map((option) => ({
    optionId: option.id,
    name: option.name,
    type: option.type,
    unitPrice: option.price,
  }));

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
    ...pricedSweetAdditions,
  ];
}

export default function DishOptionsModal({
  dish,
  options,
  onClose,
  onAddToCart,
}: DishOptionsModalProps) {
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);

  const sideDishes = useMemo(() => {
    if (!dish.allowsSideDishes) {
      return [];
    }

    return options
      .filter((option) => option.type === "SideDish")
      .sort(sortOptions);
  }, [dish.allowsSideDishes, options]);

  const spices = useMemo(() => {
    if (!dish.allowsSpices) {
      return [];
    }

    return options
      .filter((option) => option.type === "Spice")
      .sort(sortOptions);
  }, [dish.allowsSpices, options]);

  const sweetAdditions = useMemo(() => {
    if (!dish.allowsSweetAdditions) {
      return [];
    }

    return options
      .filter((option) => option.type === "SweetAddition")
      .sort(sortOptions);
  }, [dish.allowsSweetAdditions, options]);

  const allowedOptions = useMemo(() => {
    return [...sideDishes, ...spices, ...sweetAdditions];
  }, [sideDishes, spices, sweetAdditions]);

  const selectedOptions = useMemo(() => {
    return allowedOptions.filter((option) =>
      selectedOptionIds.includes(option.id),
    );
  }, [allowedOptions, selectedOptionIds]);

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

        {(dish.allowsSideDishes ||
          dish.allowsSpices ||
          dish.allowsSweetAdditions) && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fafafa",
            }}
          >
            <strong>Pravila za dodatke</strong>

            {dish.allowsSideDishes && (
              <>
                <div style={{ marginTop: 6 }}>
                  Prva 4 obična priloga su besplatna. Svaki sledeći običan
                  prilog se naplaćuje {formatPrice(EXTRA_SIDE_DISH_PRICE)}.
                </div>

                <div>Prilozi označeni kao naplativi se plaćaju odmah.</div>
              </>
            )}

            {dish.allowsSpices && <div>Začini su besplatni.</div>}
            {dish.allowsSweetAdditions && (
              <div>Slatki dodaci se dodatno naplaćuju.</div>
            )}
          </div>
        )}

        {dish.allowsSideDishes && (
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
        )}

        {dish.allowsSpices && (
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
        )}

        {dish.allowsSweetAdditions && (
          <div style={{ marginTop: 18 }}>
            <h4>Slatki dodaci</h4>

            {sweetAdditions.length === 0 ? (
              <div>Nema dostupnih slatkih dodataka.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {sweetAdditions.map((option) => {
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

                      <span>+{formatPrice(option.price)}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
          {dish.allowsSideDishes && (
            <>
              <div>Izabrano običnih priloga: {regularSideDishCount}</div>

              <div>
                Dodatno naplaćenih običnih priloga: {paidRegularSideDishCount}
              </div>
            </>
          )}

          {dish.allowsSweetAdditions && (
            <div>Slatki dodaci se dodatno naplaćuju.</div>
          )}

          <div>Doplata za dodatke: {formatPrice(optionsTotal)}</div>

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
