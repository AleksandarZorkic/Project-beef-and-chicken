export type CartOptionType = "SideDish" | "Spice";

export type CartSelectedOption = {
  optionId: number;
  name: string;
  type: CartOptionType;
  unitPrice: number;
};

export type CartItem = {
  cartItemId: string;
  dishId: number;
  name: string;
  unitPrice: number;
  optionsTotal: number;
  quantity: number;
  selectedOptions: CartSelectedOption[];
};

export type CartState = {
  ownerUserId: string | null;
  items: CartItem[];
  notes: string;
};

export type StoredCartState = {
  items: CartItem[];
  notes: string;
};

export type CartAction =
  | {
      type: "LOAD-CART";
      payload: {
        ownerUserId: string | null;
        cart: StoredCartState;
      };
    }
  | {
      type: "ADD-ITEM";
      payload: {
        dishId: number;
        name: string;
        unitPrice: number;
        optionsTotal?: number;
        selectedOptions?: CartSelectedOption[];
      };
    }
  | { type: "REMOVE-ITEM"; payload: { cartItemId: string } }
  | { type: "SET-QTY"; payload: { cartItemId: string; quantity: number } }
  | { type: "SET-NOTES"; payload: { notes: string } }
  | { type: "CLEAR" };
