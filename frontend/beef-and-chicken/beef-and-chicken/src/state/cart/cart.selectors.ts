import type { CartState } from "./cart.types";

export function cartSubtotal(state: CartState) {
  return state.items.reduce((sum, item) => {
    return sum + (item.unitPrice + item.optionsTotal) * item.quantity;
  }, 0);
}
