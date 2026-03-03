import { createContext, useContext, useMemo, useReducer } from "react";
import { cartReducer, initialCartState } from "./cart.reducer";
import { CartAction, CartState } from "./cart.types";

type CartContextValue = {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart mora biti korišćen unutar CartProvider.");
  return ctx;
}
