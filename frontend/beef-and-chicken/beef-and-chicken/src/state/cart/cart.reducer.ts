import type { CartAction, CartSelectedOption, CartState } from "./cart.types";

export const initialCartState: CartState = {
  ownerUserId: null,
  items: [],
  notes: "",
};

function createCartItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeSelectedOptions(options?: CartSelectedOption[]) {
  return [...(options ?? [])].sort((a, b) => a.optionId - b.optionId);
}

function areSameOptions(
  first: CartSelectedOption[],
  second: CartSelectedOption[],
) {
  if (first.length !== second.length) return false;

  return first.every((option, index) => {
    return option.optionId === second[index].optionId;
  });
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "LOAD-CART":
      return {
        ownerUserId: action.payload.ownerUserId,
        items: action.payload.cart.items.map((item) => {
          const selectedOptions = normalizeSelectedOptions(
            item.selectedOptions ?? [],
          );

          return {
            ...item,
            imageUrl: item.imageUrl ?? null,
            regularPrice: item.regularPrice ?? item.unitPrice,
            isOnSale: item.isOnSale ?? false,
            salePrice: item.salePrice ?? null,
            selectedOptions,
            optionsTotal:
              item.optionsTotal ??
              selectedOptions.reduce(
                (sum, option) => sum + option.unitPrice,
                0,
              ),
          };
        }),
        notes: action.payload.cart.notes,
      };

    case "ADD-ITEM": {
      // Admin, Employee i guest ne smeju da imaju customer korpu.
      if (!state.ownerUserId) {
        return state;
      }

      const selectedOptions = normalizeSelectedOptions(
        action.payload.selectedOptions,
      );

      const optionsTotal =
        action.payload.optionsTotal ??
        selectedOptions.reduce((sum, option) => sum + option.unitPrice, 0);

      const existing = state.items.find((item) => {
        return (
          item.dishId === action.payload.dishId &&
          areSameOptions(item.selectedOptions, selectedOptions)
        );
      });

      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.cartItemId === existing.cartItemId
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  imageUrl: item.imageUrl ?? action.payload.imageUrl ?? null,
                  unitPrice: action.payload.unitPrice,
                  regularPrice:
                    action.payload.regularPrice ?? action.payload.unitPrice,
                  isOnSale: action.payload.isOnSale ?? false,
                  salePrice: action.payload.salePrice ?? null,
                  optionsTotal,
                  selectedOptions,
                }
              : item,
          ),
        };
      }

      return {
        ...state,
        items: [
          ...state.items,
          {
            cartItemId: createCartItemId(),
            dishId: action.payload.dishId,
            name: action.payload.name,
            imageUrl: action.payload.imageUrl ?? null,
            unitPrice: action.payload.unitPrice,
            regularPrice:
              action.payload.regularPrice ?? action.payload.unitPrice,
            isOnSale: action.payload.isOnSale ?? false,
            salePrice: action.payload.salePrice ?? null,
            optionsTotal,
            quantity: 1,
            selectedOptions,
          },
        ],
      };
    }

    case "REMOVE-ITEM":
      return {
        ...state,
        items: state.items.filter(
          (item) => item.cartItemId !== action.payload.cartItemId,
        ),
      };

    case "SET-QTY": {
      const quantity = Math.max(0, action.payload.quantity);

      if (quantity === 0) {
        return {
          ...state,
          items: state.items.filter(
            (item) => item.cartItemId !== action.payload.cartItemId,
          ),
        };
      }

      return {
        ...state,
        items: state.items.map((item) =>
          item.cartItemId === action.payload.cartItemId
            ? { ...item, quantity }
            : item,
        ),
      };
    }

    case "SET-NOTES":
      return {
        ...state,
        notes: action.payload.notes,
      };

    case "CLEAR":
      return {
        ownerUserId: state.ownerUserId,
        items: [],
        notes: "",
      };

    default:
      return state;
  }
}
