export type CartItem = {
  dishId: number;
  name: string;
  unitPrice: number;
  quantity: number;
};

export type CartState = {
  items: CartItem[];
  notes: string;
};

export type CartAction =
  | {
      type: "ADD-ITEM";
      payload: { dishId: number; name: string; unitPrice: number };
    }
  | { type: "REMOVE-ITEM"; payload: { dishId: number } }
  | { type: "SET-QTY"; payload: { dishId: number; quantity: number } }
  | { type: "SET-NOTES"; payload: { notes: string } }
  | { type: "CLEAR" };
