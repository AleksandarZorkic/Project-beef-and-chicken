import api from "./https";

export type OrderStatus =
  | "Na_Cekanju"
  | "Odbijena"
  | "Prihvacena"
  | "Spremna_za_preuzimanje"
  | "Dostava_u_toku"
  | "Dostavljena";

export type OrderOptionType = "SideDish" | "Spice";

export interface OrderAddressSnapshotDto {
  street: string;
  houseNumber: string;
  postalCode?: string | null;
  city: string;
  label?: string | null;
  note?: string | null;
}

export interface OrderItemOptionDto {
  id: number;
  dishOptionId?: number | null;
  optionName: string;
  optionType: OrderOptionType;
  unitPrice: number;
}

export interface OrderItemDto {
  id: number;
  dishId: number;
  dishName: string;
  quantity: number;
  unitPrice: number;
  optionsTotal: number;
  options: OrderItemOptionDto[];
}

export interface CreateOrderItemDto {
  dishId: number;
  quantity: number;
  selectedOptionIds: number[];
}

export interface CreateOrderRequestDto {
  customerAddressId: number;
  notes?: string | null;
  items: CreateOrderItemDto[];
}

export interface OrderDetailsDto {
  id: number;
  orderNumber?: string | null;
  createdAt: string;
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

export interface PagedResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export type OrderHistoryStatusFilter = "Dostavljena" | "Odbijena";

export interface OrderHistoryQueryParams {
  from?: string;
  to?: string;
  status?: OrderHistoryStatusFilter;
  orderNumber?: string;
  courierId?: number;
  page?: number;
  pageSize?: number;
}

export interface DashboardTopDishDto {
  dishName: string;
  quantity: number;
  revenue: number;
}

export interface OrderDashboardDto {
  from: string;
  to: string;
  periodTotalOrders: number;
  periodDeliveredOrders: number;
  periodRejectedOrders: number;
  revenue: number;
  averageDeliveredOrderValue: number;
  activeOrders: number;
  pendingOrders: number;
  acceptedOrders: number;
  readyForPickupOrders: number;
  deliveryInProgressOrders: number;
  topDishes: DashboardTopDishDto[];
}

export interface OrderDashboardQueryParams {
  from?: string;
  to?: string;
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

export async function getReadyForPickupOrders() {
  const res = await api.get<OrderDetailsDto[]>(
    `${ORDERS_ENDPOINT}/ready-for-pickup`,
  );

  return res.data;
}

export async function getCourierOrders() {
  const res = await api.get<OrderDetailsDto[]>(`${ORDERS_ENDPOINT}/courier`);
  return res.data;
}

export async function startDelivery(orderId: number) {
  const res = await api.patch<OrderDetailsDto>(
    `${ORDERS_ENDPOINT}/${orderId}/start-delivery`,
  );

  return res.data;
}

export async function markOrderDelivered(orderId: number) {
  const res = await api.patch<OrderDetailsDto>(
    `${ORDERS_ENDPOINT}/${orderId}/delivered`,
  );

  return res.data;
}

export async function getActiveOrders() {
  const res = await api.get<OrderDetailsDto[]>(`${ORDERS_ENDPOINT}/active`);
  return res.data;
}

export async function markReadyForPickup(orderId: number) {
  const res = await api.patch<OrderDetailsDto>(
    `${ORDERS_ENDPOINT}/${orderId}/ready-for-pickup`,
  );

  return res.data;
}

export async function getOrderHistory(params: OrderHistoryQueryParams) {
  const res = await api.get<PagedResultDto<OrderDetailsDto>>(
    `${ORDERS_ENDPOINT}/history`,
    { params },
  );

  return res.data;
}

export async function startDeliveryBatch(orderIds: number[]) {
  const res = await api.patch<OrderDetailsDto[]>(
    `${ORDERS_ENDPOINT}/start-delivery-batch`,
    { orderIds },
  );

  return res.data;
}

export async function getOrderDashboard(params: OrderDashboardQueryParams) {
  const res = await api.get<OrderDashboardDto>(`${ORDERS_ENDPOINT}/dashboard`, {
    params,
  });

  return res.data;
}
