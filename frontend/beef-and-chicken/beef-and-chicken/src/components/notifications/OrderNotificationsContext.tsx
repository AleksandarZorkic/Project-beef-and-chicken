import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  HubConnectionBuilder,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";
import { getPendingOrders, type OrderStatus } from "../../api/orderApi";
import { API_ORIGIN } from "../../api/https";
import { useAuth } from "../../auth/AuthContext";
import { AppRoles } from "../../auth/roles";

type RawOrderRealtimeNotification = {
  orderId?: number | string;
  OrderId?: number | string;
  orderNumber?: string | null;
  OrderNumber?: string | null;
  status?: OrderStatus | number;
  Status?: OrderStatus | number;
  eventType?: string;
  EventType?: string;
};

type NormalizedOrderRealtimeNotification = {
  orderId: number;
  orderNumber?: string | null;
  status?: OrderStatus | number;
  eventType: string;
};

type OrderNotificationsContextValue = {
  canUseOrderNotifications: boolean;
  pendingOrderCount: number;
  soundEnabled: boolean;
  enableSound: () => Promise<void>;
  disableSound: () => void;
};

const OrderNotificationsContext = createContext<OrderNotificationsContextValue>(
  {
    canUseOrderNotifications: false,
    pendingOrderCount: 0,
    soundEnabled: false,
    enableSound: async () => {},
    disableSound: () => {},
  },
);

const SOUND_ENABLED_STORAGE_KEY = "bnc_order_sound_enabled_v1";

const NEW_ORDER_SOUND_URL = "/audio/notifications/new-order-alert.wav";
const REMINDER_SOUND_URL = "/audio/notifications/order-reminder.wav";

const REMINDER_INTERVAL_MS = 60_000;

const STOP_ALERT_EVENTS = new Set([
  "OrderAccepted",
  "OrderRejected",
  "OrderCancelledByCustomer",
  "OrderReadyForPickup",
  "OrderDeliveryStarted",
  "OrderDelivered",
  "OrderPickedUpByCustomer",
]);

function readSavedSoundEnabled() {
  try {
    return localStorage.getItem(SOUND_ENABLED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveSoundEnabled(value: boolean) {
  try {
    localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, String(value));
  } catch {
    // Local storage is optional for this feature.
  }
}

function normalizeNotification(
  data: RawOrderRealtimeNotification,
): NormalizedOrderRealtimeNotification | null {
  const rawOrderId = data.orderId ?? data.OrderId;
  const orderId = Number(rawOrderId);

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return null;
  }

  return {
    orderId,
    orderNumber: data.orderNumber ?? data.OrderNumber ?? null,
    status: data.status ?? data.Status,
    eventType: data.eventType ?? data.EventType ?? "",
  };
}

function isPendingStatus(status: OrderStatus | number | undefined) {
  return status === "Na_Cekanju" || status === 0;
}

async function playAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  try {
    audio.pause();
    audio.currentTime = 0;
    await audio.play();
  } catch {
    // Browser can block audio until the user enables it with a click.
  }
}

async function unlockAudio(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  try {
    const originalVolume = audio.volume;

    audio.volume = 0;
    audio.currentTime = 0;

    await audio.play();

    audio.pause();
    audio.currentTime = 0;
    audio.volume = originalVolume;
  } catch {
    // Some browsers still block this. The next direct click should unlock it.
  }
}

export function OrderNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { token, isAuthenticated, hasAnyRole } = useAuth();

  const canUseOrderNotifications =
    isAuthenticated && hasAnyRole([AppRoles.Admin, AppRoles.Employee]);

  const [soundEnabled, setSoundEnabled] = useState(readSavedSoundEnabled);
  const [pendingOrderIds, setPendingOrderIds] = useState<number[]>([]);

  const soundEnabledRef = useRef(soundEnabled);
  const pendingOrderIdsRef = useRef<Set<number>>(new Set());

  const connectionRef = useRef<HubConnection | null>(null);

  const newOrderAudioRef = useRef<HTMLAudioElement | null>(null);
  const reminderAudioRef = useRef<HTMLAudioElement | null>(null);

  const pendingOrderCount = pendingOrderIds.length;

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    saveSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const newOrderAudio = new Audio(NEW_ORDER_SOUND_URL);
    newOrderAudio.preload = "auto";
    newOrderAudio.volume = 0.9;

    const reminderAudio = new Audio(REMINDER_SOUND_URL);
    reminderAudio.preload = "auto";
    reminderAudio.volume = 0.85;

    newOrderAudioRef.current = newOrderAudio;
    reminderAudioRef.current = reminderAudio;

    return () => {
      newOrderAudio.pause();
      reminderAudio.pause();

      newOrderAudioRef.current = null;
      reminderAudioRef.current = null;
    };
  }, []);

  const syncPendingOrders = useCallback(() => {
    setPendingOrderIds(
      [...pendingOrderIdsRef.current].sort((first, second) => first - second),
    );
  }, []);

  const playNewOrderSound = useCallback(async () => {
    if (!soundEnabledRef.current) {
      return;
    }

    await playAudio(newOrderAudioRef.current);
  }, []);

  const playReminderSound = useCallback(async () => {
    if (!soundEnabledRef.current) {
      return;
    }

    await playAudio(reminderAudioRef.current);
  }, []);

  const addPendingOrder = useCallback(
    (orderId: number, shouldPlayNewOrderSound: boolean) => {
      const pendingOrders = pendingOrderIdsRef.current;
      const alreadyExists = pendingOrders.has(orderId);

      pendingOrders.add(orderId);
      syncPendingOrders();

      if (!alreadyExists && shouldPlayNewOrderSound) {
        void playNewOrderSound();
      }
    },
    [playNewOrderSound, syncPendingOrders],
  );

  const removePendingOrder = useCallback(
    (orderId: number) => {
      const pendingOrders = pendingOrderIdsRef.current;

      if (!pendingOrders.delete(orderId)) {
        return;
      }

      syncPendingOrders();
    },
    [syncPendingOrders],
  );

  const loadPendingOrders = useCallback(async () => {
    try {
      const orders = await getPendingOrders();

      pendingOrderIdsRef.current = new Set(
        orders
          .filter((order) => order.status === "Na_Cekanju")
          .map((order) => order.id),
      );

      syncPendingOrders();
    } catch {
      // Notification loading must not break the admin panel.
    }
  }, [syncPendingOrders]);

  useEffect(() => {
    if (!canUseOrderNotifications) {
      pendingOrderIdsRef.current.clear();
      syncPendingOrders();
      return;
    }

    void loadPendingOrders();
  }, [canUseOrderNotifications, loadPendingOrders, syncPendingOrders]);

  useEffect(() => {
    if (!canUseOrderNotifications || !token) {
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_ORIGIN}/hubs/orders`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on("OrderChanged", (data: RawOrderRealtimeNotification) => {
      const notification = normalizeNotification(data);

      if (!notification) {
        return;
      }

      const shouldStartAlert =
        notification.eventType === "OrderCreated" ||
        isPendingStatus(notification.status);

      const shouldStopAlert =
        STOP_ALERT_EVENTS.has(notification.eventType) ||
        (notification.status !== undefined &&
          !isPendingStatus(notification.status));

      if (shouldStartAlert) {
        addPendingOrder(
          notification.orderId,
          notification.eventType === "OrderCreated",
        );

        return;
      }

      if (shouldStopAlert) {
        removePendingOrder(notification.orderId);
      }
    });

    connection.onreconnected(() => {
      void loadPendingOrders();
    });

    void connection.start().catch(() => {
      // Realtime notifications are helpful, but the page must still work without them.
    });

    return () => {
      connection.off("OrderChanged");

      void connection.stop().catch(() => {
        // Ignore stop errors during cleanup.
      });

      if (connectionRef.current === connection) {
        connectionRef.current = null;
      }
    };
  }, [
    canUseOrderNotifications,
    token,
    addPendingOrder,
    removePendingOrder,
    loadPendingOrders,
  ]);

  useEffect(() => {
    if (
      !canUseOrderNotifications ||
      !soundEnabled ||
      pendingOrderIds.length === 0
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (pendingOrderIdsRef.current.size > 0) {
        void playReminderSound();
      }
    }, REMINDER_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    canUseOrderNotifications,
    soundEnabled,
    pendingOrderIds.length,
    playReminderSound,
  ]);

  const enableSound = useCallback(async () => {
    setSoundEnabled(true);
    soundEnabledRef.current = true;
    saveSoundEnabled(true);

    await unlockAudio(newOrderAudioRef.current);
    await unlockAudio(reminderAudioRef.current);

    if (pendingOrderIdsRef.current.size > 0) {
      await playAudio(reminderAudioRef.current);
    }
  }, []);

  const disableSound = useCallback(() => {
    setSoundEnabled(false);
    soundEnabledRef.current = false;
    saveSoundEnabled(false);

    newOrderAudioRef.current?.pause();
    reminderAudioRef.current?.pause();
  }, []);

  return (
    <OrderNotificationsContext.Provider
      value={{
        canUseOrderNotifications,
        pendingOrderCount,
        soundEnabled,
        enableSound,
        disableSound,
      }}
    >
      {children}
    </OrderNotificationsContext.Provider>
  );
}

export function useOrderNotifications() {
  return useContext(OrderNotificationsContext);
}
