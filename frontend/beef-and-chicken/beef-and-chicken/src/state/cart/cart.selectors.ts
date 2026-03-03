import { CartState } from "./cart.types";

export function cartSubtotal(state: CartState) {
  return state.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}
