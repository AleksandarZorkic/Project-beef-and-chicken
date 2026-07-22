import { useEffect } from "react";
import { createOrderHubConnection } from "./orderRealtime";
import type { OrderRealtimeNotification } from "./orderRealtime";

type UseOrderRealtimeOptions = {
  enabled: boolean;
  onOrderChanged: (message: OrderRealtimeNotification) => void;
};

export function useOrderRealtime({
  enabled,
  onOrderChanged,
}: UseOrderRealtimeOptions) {
  useEffect(() => {
    if (!enabled) return;

    const connection = createOrderHubConnection(onOrderChanged);

    connection.start().catch((error) => {
      console.error("SignalR konekcija nije uspela:", error);
    });

    return () => {
      connection.stop().catch(() => {});
    };
  }, [enabled, onOrderChanged]);
}
