import api from "./https";

export type OrderStatus =
  | "Na_Cekanju"
  | "Odbijena"
  | "Prihvacena"
  | "Preuzimanje_u_toku"
  | "Dostava_u_toku"
  | "Dostavljena";

export interface OrderAddressSnapshotDto {
  street: string;
  houseNumber: string;
  postalCode?: string | null;
  city: string;
  label?: string | null;
  note?: string | null;
}

export interface OrderItemDto {
  id: number;
  dishId: number;
  dishName: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderItemDto {
  dishId: number;
  quantity: number;
}

export interface CreateOrderRequestDto {
  customerAddressId: number;
  notes?: string | null;
  items: CreateOrderItemDto[];
}

export interface OrderDetailsDto {
  id: number;
  customerId: number;
  courierId?: number | null;
  deliveryAddress: OrderAddressSnapshotDto;
  notes?: string | null;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: OrderStatus;
  items: OrderItemDto[];
}

const ORDERS_ENDPOINT = "/orders";

export async function getMyOrders() {
  const res = await api.get<OrderDetailsDto[]>(ORDERS_ENDPOINT);
  return res.data;
}

export async function getOrderById(orderId: number) {
  const res = await api.get<OrderDetailsDto>(`${ORDERS_ENDPOINT}/${orderId}`);

  return res.data;
}

export async function createOrder(newOrder: CreateOrderRequestDto) {
  const res = await api.post<OrderDetailsDto>(ORDERS_ENDPOINT, newOrder);
  return res.data;
}

export async function acceptOrder(orderId: number) {
  await api.patch(`${ORDERS_ENDPOINT}/${orderId}/accept`);
}

export async function rejectOrder(orderId: number) {
  await api.patch(`${ORDERS_ENDPOINT}/${orderId}/reject`);
}

export async function getPendingOrders() {
  const res = await api.get<OrderDetailsDto[]>(`${ORDERS_ENDPOINT}/pending`);

  return res.data;
}
