import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { cartReducer, initialCartState } from "./cart.reducer";
import type { CartAction, CartState, StoredCartState } from "./cart.types";
import { useAuth } from "../../auth/AuthContext";

type CartContextValue = {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_VERSION = 2;

function getCartStorageKey(userId: string) {
  return `beef-and-chicken:cart:v${CART_STORAGE_VERSION}:user-${userId}`;
}

function getUserId(user: any): string | null {
  const id = user?.id ?? user?.userId ?? user?.sub;

  return id ? String(id) : null;
}

function isCustomer(user: any) {
  if (!user) return false;

  if (user.role === "Customer") return true;

  if (Array.isArray(user.roles)) {
    return user.roles.includes("Customer");
  }

  return false;
}

function isValidStoredCart(value: any): value is StoredCartState {
  return value && Array.isArray(value.items) && typeof value.notes === "string";
}

function readStoredCart(userId: string): StoredCartState {
  try {
    const raw = localStorage.getItem(getCartStorageKey(userId));

    if (!raw) {
      return {
        items: [],
        notes: "",
      };
    }

    const parsed = JSON.parse(raw);

    if (!isValidStoredCart(parsed)) {
      return {
        items: [],
        notes: "",
      };
    }

    return parsed;
  } catch {
    return {
      items: [],
      notes: "",
    };
  }
}

function saveStoredCart(userId: string, cart: StoredCartState) {
  localStorage.setItem(getCartStorageKey(userId), JSON.stringify(cart));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const activeCartOwnerId = useMemo(() => {
    if (!isCustomer(user)) return null;

    return getUserId(user);
  }, [user]);

  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  useEffect(() => {
    if (!activeCartOwnerId) {
      dispatch({
        type: "LOAD-CART",
        payload: {
          ownerUserId: null,
          cart: {
            items: [],
            notes: "",
          },
        },
      });

      return;
    }

    const storedCart = readStoredCart(activeCartOwnerId);

    dispatch({
      type: "LOAD-CART",
      payload: {
        ownerUserId: activeCartOwnerId,
        cart: storedCart,
      },
    });
  }, [activeCartOwnerId]);

  useEffect(() => {
    if (!activeCartOwnerId) return;

    if (state.ownerUserId !== activeCartOwnerId) return;

    saveStoredCart(activeCartOwnerId, {
      items: state.items,
      notes: state.notes,
    });
  }, [activeCartOwnerId, state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);

  if (!ctx) {
    throw new Error("useCart mora biti korišćen unutar CartProvider.");
  }

  return ctx;
}
