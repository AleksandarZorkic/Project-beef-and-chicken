import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import FeedbackModal from "./FeedbackModal";
import "../../styles/Feedback.scss";

const hiddenRoutePrefixes = [
  "/admin",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export default function FeedbackBubble() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const shouldHide = useMemo(() => {
    return hiddenRoutePrefixes.some((prefix) =>
      location.pathname.startsWith(prefix),
    );
  }, [location.pathname]);

  if (shouldHide) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="feedback-bubble"
        aria-label="Pošaljite sugestiju"
        onClick={() => setOpen(true)}
      >
        <span className="feedback-bubble__icon" aria-hidden="true">
          💬
        </span>

        <span className="feedback-bubble__text">Sugestija</span>
      </button>

      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
