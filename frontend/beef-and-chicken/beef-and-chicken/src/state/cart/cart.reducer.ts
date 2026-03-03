import { CartAction, CartState } from "./cart.types";

export const initialCartState: CartState = {
  items: [],
  notes: "",
};

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD-ITEM": {
      const existing = state.items.find(
        (i) => i.dishId === action.payload.dishId,
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.dishId === action.payload.dishId
              ? { ...i, quantity: i.quantity + 1 }
              : i,
          ),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          {
            dishId: action.payload.dishId,
            name: action.payload.name,
            unitPrice: action.payload.unitPrice,
            quantity: 1,
          },
        ],
      };
    }
    case "REMOVE-ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.dishId !== action.payload.dishId),
      };

    case "SET-QTY": {
      const q = Math.max(0, action.payload.quantity);
      if (q === 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.dishId !== action.payload.dishId),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.dishId === action.payload.dishId ? { ...i, quantity: q } : i,
        ),
      };
    }
    case "SET-NOTES":
      return { ...state, notes: action.payload.notes };

    case "CLEAR":
      return initialCartState;

    default:
      return state;
  }
}
