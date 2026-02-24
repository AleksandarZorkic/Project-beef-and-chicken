import api from "../api/http";

export type OrderStatus =
  | "Na_Cekanju"
  | "Odbijena"
  | "Prihvacena"
  | "Preuzimanje_u_toku"
  | "Dostava_u_toku"
  | "Dostavljena";

export interface OrderAddressDto {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
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
  notes?: string;
  items: CreateOrderItemDto[];
}

export interface OrderDetailsDto {
  id: number;
  customerId: number;
  courierId?: number;
  deliveryAddress: OrderAddressDto;
  notes?: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: OrderStatus;
  items: OrderItemDto[];
}

export async function getAllOrders() {
  const res = await api.get<OrderDetailsDto[]>(`/order`);
  return res.data;
}

export async function getOrderById(orderId: number) {
  const res = await api.get<OrderDetailsDto>(`/order/${orderId}`);
  return res.data;
}

export async function createOrder(newOrder: CreateOrderRequestDto) {
  const res = await api.post<OrderDetailsDto>("/order", newOrder);
  return res.data;
}

export async function acceptOrder(orderId: number) {
  await api.patch(`/order/${orderId}/accept`);
}

export async function rejectOrder(orderId: number) {
  await api.patch(`/order/${orderId}/reject`);
}

export async function getPendingOrders() {
  const res = await api.get<OrderDetailsDto[]>(`/order/pending`);
  return res.data;
}
