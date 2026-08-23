import { useOrderNotifications } from "./OrderNotificationsContext";
import "./OperationsOrderNotifier.scss";

function getPendingText(count: number) {
  if (count === 1) {
    return "1 porudžbina čeka prihvatanje.";
  }

  return `${count} porudžbine čekaju prihvatanje.`;
}

export default function OperationsOrderNotifier() {
  const {
    canUseOrderNotifications,
    pendingOrderCount,
    soundEnabled,
    enableSound,
    disableSound,
  } = useOrderNotifications();

  if (!canUseOrderNotifications) {
    return null;
  }

  return (
    <section
      className={[
        "operations-order-notifier",
        pendingOrderCount > 0 ? "operations-order-notifier--active" : "",
        soundEnabled ? "operations-order-notifier--sound-enabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
    >
      <div className="operations-order-notifier__content">
        <span className="operations-order-notifier__icon" aria-hidden="true">
          🔔
        </span>

        <div>
          <strong className="operations-order-notifier__title">
            {pendingOrderCount > 0
              ? getPendingText(pendingOrderCount)
              : "Zvuk za nove porudžbine"}
          </strong>

          <p className="operations-order-notifier__description">
            {soundEnabled
              ? "Zvuk je uključen. Nova porudžbina se čuje odmah, a podsetnik ide na svakih 60 sekundi."
              : "Uključite zvuk da bi browser dozvolio obaveštenja za nove porudžbine."}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="operations-order-notifier__button"
        onClick={soundEnabled ? disableSound : enableSound}
      >
        {soundEnabled ? "Isključi zvuk" : "Uključi zvuk"}
      </button>
    </section>
  );
}
