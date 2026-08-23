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

  const savoryPancakeAdditions = selectedOptions
    .filter((option) => option.type === "SavoryPancakeAddition")
    .sort(sortOptions);

  const pricedSweetAdditions = sweetAdditions.map((option) => ({
    optionId: option.id,
    name: option.name,
    type: option.type,
    unitPrice: option.price,
  }));

  const pricedSavoryPancakeAdditions = savoryPancakeAdditions.map((option) => ({
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
    ...pricedSavoryPancakeAdditions,
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

  const savoryPancakeAdditions = useMemo(() => {
    if (!dish.allowsSavoryPancakeAdditions) {
      return [];
    }

    return options
      .filter((option) => option.type === "SavoryPancakeAddition")
      .sort(sortOptions);
  }, [dish.allowsSavoryPancakeAdditions, options]);

  const allowedOptions = useMemo(() => {
    return [
      ...sideDishes,
      ...spices,
      ...sweetAdditions,
      ...savoryPancakeAdditions,
    ];
  }, [sideDishes, spices, sweetAdditions, savoryPancakeAdditions]);

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

  function getOptionCardClassName(isSelected: boolean) {
    return [
      "dish-options-modal-option",
      isSelected ? "dish-options-modal-option--selected" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return (
    <div
      className="dish-options-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="dish-options-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dish-options-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dish-options-modal__header">
          <div>
            <span className="dish-options-modal__eyebrow">
              DODACI I PRILOZI
            </span>

            <h3
              id="dish-options-modal-title"
              className="dish-options-modal__title"
            >
              {dish.name}
            </h3>

            <p className="dish-options-modal__base-price">
              Osnovna cena: <strong>{formatPrice(dish.price)}</strong>
            </p>
          </div>

          <button
            type="button"
            className="dish-options-modal__close"
            onClick={onClose}
            aria-label="Zatvori izbor dodataka"
          >
            ×
          </button>
        </header>

        {(dish.allowsSideDishes ||
          dish.allowsSpices ||
          dish.allowsSweetAdditions ||
          dish.allowsSavoryPancakeAdditions) && (
          <aside className="dish-options-modal-rules">
            <strong>Pravila za dodatke</strong>

            {dish.allowsSideDishes && (
              <>
                <p>
                  Prva 4 obična priloga su besplatna. Svaki sledeći običan
                  prilog se naplaćuje {formatPrice(EXTRA_SIDE_DISH_PRICE)}.
                </p>

                <p>Prilozi označeni kao naplativi se plaćaju odmah.</p>
              </>
            )}

            {dish.allowsSpices && <p>Začini su besplatni.</p>}

            {dish.allowsSweetAdditions && (
              <p>Slatki dodaci se dodatno naplaćuju.</p>
            )}

            {dish.allowsSavoryPancakeAdditions && (
              <p>Slani dodaci za palačinke se dodatno naplaćuju.</p>
            )}
          </aside>
        )}

        <div className="dish-options-modal__body">
          {dish.allowsSideDishes && (
            <section className="dish-options-modal-section">
              <header className="dish-options-modal-section__header">
                <h4>Prilozi</h4>
                <span>Prva 4 obična priloga su besplatna</span>
              </header>

              {sideDishes.length === 0 ? (
                <p className="dish-options-modal-section__empty">
                  Nema dostupnih priloga.
                </p>
              ) : (
                <div className="dish-options-modal-options">
                  {sideDishes.map((option) => {
                    const checked = selectedOptionIds.includes(option.id);
                    const selectedPrice = getSelectedOptionPrice(option);

                    return (
                      <label
                        key={option.id}
                        className={getOptionCardClassName(checked)}
                      >
                        <span className="dish-options-modal-option__main">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOption(option.id)}
                          />

                          <span className="dish-options-modal-option__name">
                            {option.name}
                          </span>
                        </span>

                        <span className="dish-options-modal-option__price">
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
            </section>
          )}

          {dish.allowsSpices && (
            <section className="dish-options-modal-section">
              <header className="dish-options-modal-section__header">
                <h4>Začini</h4>
                <span>Bez dodatne naplate</span>
              </header>

              {spices.length === 0 ? (
                <p className="dish-options-modal-section__empty">
                  Nema dostupnih začina.
                </p>
              ) : (
                <div className="dish-options-modal-options">
                  {spices.map((option) => {
                    const checked = selectedOptionIds.includes(option.id);

                    return (
                      <label
                        key={option.id}
                        className={getOptionCardClassName(checked)}
                      >
                        <span className="dish-options-modal-option__main">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOption(option.id)}
                          />

                          <span className="dish-options-modal-option__name">
                            {option.name}
                          </span>
                        </span>

                        <span className="dish-options-modal-option__price">
                          besplatno
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {dish.allowsSweetAdditions && (
            <section className="dish-options-modal-section">
              <header className="dish-options-modal-section__header">
                <h4>Slatki dodaci</h4>
                <span>Dodatno se naplaćuju</span>
              </header>

              {sweetAdditions.length === 0 ? (
                <p className="dish-options-modal-section__empty">
                  Nema dostupnih slatkih dodataka.
                </p>
              ) : (
                <div className="dish-options-modal-options">
                  {sweetAdditions.map((option) => {
                    const checked = selectedOptionIds.includes(option.id);

                    return (
                      <label
                        key={option.id}
                        className={getOptionCardClassName(checked)}
                      >
                        <span className="dish-options-modal-option__main">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOption(option.id)}
                          />

                          <span className="dish-options-modal-option__name">
                            {option.name}
                          </span>
                        </span>

                        <span className="dish-options-modal-option__price">
                          +{formatPrice(option.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {dish.allowsSavoryPancakeAdditions && (
            <section className="dish-options-modal-section">
              <header className="dish-options-modal-section__header">
                <h4>Slani dodaci za palačinke</h4>
                <span>Dodatno se naplaćuju</span>
              </header>

              {savoryPancakeAdditions.length === 0 ? (
                <p className="dish-options-modal-section__empty">
                  Nema dostupnih slanih dodataka za palačinke.
                </p>
              ) : (
                <div className="dish-options-modal-options">
                  {savoryPancakeAdditions.map((option) => {
                    const checked = selectedOptionIds.includes(option.id);

                    return (
                      <label
                        key={option.id}
                        className={getOptionCardClassName(checked)}
                      >
                        <span className="dish-options-modal-option__main">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOption(option.id)}
                          />

                          <span className="dish-options-modal-option__name">
                            {option.name}
                          </span>
                        </span>

                        <span className="dish-options-modal-option__price">
                          +{formatPrice(option.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        <section className="dish-options-modal-summary">
          {dish.allowsSideDishes && (
            <>
              <div className="dish-options-modal-summary__row">
                <span>Izabrano običnih priloga</span>
                <strong>{regularSideDishCount}</strong>
              </div>

              <div className="dish-options-modal-summary__row">
                <span>Dodatno naplaćenih običnih priloga</span>
                <strong>{paidRegularSideDishCount}</strong>
              </div>
            </>
          )}

          {dish.allowsSweetAdditions && (
            <div className="dish-options-modal-summary__row">
              <span>Slatki dodaci</span>
              <strong>Dodatno se naplaćuju</strong>
            </div>
          )}

          {dish.allowsSavoryPancakeAdditions && (
            <div className="dish-options-modal-summary__row">
              <span>Slani dodaci za palačinke</span>
              <strong>Dodatno se naplaćuju</strong>
            </div>
          )}

          <div className="dish-options-modal-summary__row">
            <span>Doplata za dodatke</span>
            <strong>{formatPrice(optionsTotal)}</strong>
          </div>

          <div className="dish-options-modal-summary__total">
            <span>Cena po komadu</span>
            <strong>{formatPrice(totalUnitPrice)}</strong>
          </div>
        </section>

        <footer className="dish-options-modal__actions">
          <button
            type="button"
            className="dish-options-modal__button dish-options-modal__button--secondary"
            onClick={onClose}
          >
            Otkaži
          </button>

          <button
            type="button"
            className="dish-options-modal__button dish-options-modal__button--primary"
            onClick={handleAddToCart}
          >
            Dodaj u korpu
          </button>
        </footer>
      </section>
    </div>
  );
}
