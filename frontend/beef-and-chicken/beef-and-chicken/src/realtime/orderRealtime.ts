import * as signalR from "@microsoft/signalr";
import { API_ORIGIN } from "../api/https";
import type { OrderStatus } from "../api/orderApi";

export type OrderRealtimeEventType =
  | "OrderCreated"
  | "OrderUpdated"
  | "OrderReadyForPickup"
  | "OrderDeliveryStarted"
  | "OrderDelivered";

export type OrderRealtimeNotification = {
  orderId: number;
  orderNumber?: string | null;
  customerId: number;
  courierId?: number | null;
  status: OrderStatus;
  eventType: OrderRealtimeEventType;
};

function getToken() {
  try {
    const raw = localStorage.getItem("auth");

    if (!raw) return "";

    const parsed = JSON.parse(raw);

    return parsed?.token ?? "";
  } catch {
    return "";
  }
}

export function createOrderHubConnection(
  onOrderChanged: (message: OrderRealtimeNotification) => void,
) {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${API_ORIGIN}/hubs/orders`, {
      accessTokenFactory: getToken,
    })
    .withAutomaticReconnect()
    .build();

  connection.on("OrderChanged", onOrderChanged);

  return connection;
}
