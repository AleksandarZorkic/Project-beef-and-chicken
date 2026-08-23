import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  createFeedbackMessage,
  type FeedbackMessageType,
} from "../../api/feedbackApi";
import { useAuth } from "../../auth/AuthContext";
import { getApiErrorMessage } from "../../utils/apiErrors";

type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
};

type FeedbackFormErrors = {
  message?: string;
  contactEmail?: string;
};

const VISITOR_ID_STORAGE_KEY = "bnc_visitor_id_v1";

const feedbackTypeOptions: Array<{
  value: FeedbackMessageType;
  label: string;
  description: string;
}> = [
  {
    value: "Suggestion",
    label: "Predlog",
    description: "Ideja kako možemo da unapredimo aplikaciju ili uslugu.",
  },
  {
    value: "Problem",
    label: "Problem",
    description: "Nešto ne radi kako treba ili zbunjuje korisnika.",
  },
  {
    value: "Praise",
    label: "Pohvala",
    description: "Nešto vam se dopalo.",
  },
  {
    value: "Other",
    label: "Ostalo",
    description: "Poruka koja ne spada u ostale kategorije.",
  },
];

function getVisitorId() {
  try {
    return localStorage.getItem(VISITOR_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const [type, setType] = useState<FeedbackMessageType>("Suggestion");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [errors, setErrors] = useState<FeedbackFormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedType = useMemo(() => {
    return feedbackTypeOptions.find((option) => option.value === type);
  }, [type]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function validateForm() {
    const nextErrors: FeedbackFormErrors = {};
    const trimmedMessage = message.trim();
    const trimmedContactEmail = contactEmail.trim();

    if (trimmedMessage.length < 10) {
      nextErrors.message = "Poruka mora imati najmanje 10 karaktera.";
    }

    if (trimmedMessage.length > 1000) {
      nextErrors.message = "Poruka može imati najviše 1000 karaktera.";
    }

    if (
      !isAuthenticated &&
      trimmedContactEmail &&
      !isValidEmail(trimmedContactEmail)
    ) {
      nextErrors.contactEmail = "Kontakt email nije ispravan.";
    }

    return nextErrors;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateForm();

    setErrors(validationErrors);
    setGeneralError(null);
    setSuccessMessage(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      const response = await createFeedbackMessage({
        type,
        message: message.trim(),
        pageUrl: `${location.pathname}${location.search}`,
        visitorId: getVisitorId(),
        contactEmail: isAuthenticated ? null : contactEmail.trim() || null,
      });

      setSuccessMessage(response.message || "Hvala! Vaša poruka je poslata.");
      setMessage("");
      setContactEmail("");
      setType("Suggestion");
    } catch (error: any) {
      setGeneralError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="feedback-modal" role="presentation">
      <button
        type="button"
        className="feedback-modal__backdrop"
        aria-label="Zatvori sugestije"
        onClick={onClose}
      />

      <section
        className="feedback-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
      >
        <header className="feedback-modal__header">
          <div>
            <span className="feedback-modal__eyebrow">Vaše mišljenje</span>

            <h2 id="feedback-modal-title">Pošaljite sugestiju</h2>

            <p>
              Predlog, problem ili komentar ide direktno administraciji
              restorana.
            </p>
          </div>

          <button
            type="button"
            className="feedback-modal__close"
            aria-label="Zatvori"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <form className="feedback-form" onSubmit={onSubmit} noValidate>
          <div className="feedback-form__field">
            <span className="feedback-form__label">Tip poruke</span>

            <div className="feedback-type-grid">
              {feedbackTypeOptions.map((option) => {
                const active = option.value === type;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={[
                      "feedback-type-card",
                      active ? "feedback-type-card--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      setType(option.value);
                      setGeneralError(null);
                      setSuccessMessage(null);
                    }}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                );
              })}
            </div>

            {selectedType && (
              <p className="feedback-form__hint">{selectedType.description}</p>
            )}
          </div>

          <div className="feedback-form__field">
            <label className="feedback-form__label" htmlFor="feedback-message">
              Poruka
            </label>

            <textarea
              id="feedback-message"
              className={[
                "feedback-form__textarea",
                errors.message ? "feedback-form__textarea--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              placeholder="Napišite šta biste voleli da unapredimo..."
              value={message}
              maxLength={1000}
              disabled={loading}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={
                errors.message
                  ? "feedback-message-error"
                  : "feedback-message-help"
              }
              onChange={(event) => {
                setMessage(event.target.value);
                setErrors((current) => ({ ...current, message: undefined }));
                setGeneralError(null);
                setSuccessMessage(null);
              }}
            />

            <div className="feedback-form__meta-row">
              <span id="feedback-message-help">
                Minimum 10, maksimum 1000 karaktera.
              </span>

              <span>{message.trim().length}/1000</span>
            </div>

            {errors.message && (
              <p
                id="feedback-message-error"
                className="feedback-form__error"
                role="alert"
              >
                {errors.message}
              </p>
            )}
          </div>

          {!isAuthenticated && (
            <div className="feedback-form__field">
              <label
                className="feedback-form__label"
                htmlFor="feedback-contact-email"
              >
                Kontakt email <span>opciono</span>
              </label>

              <input
                id="feedback-contact-email"
                className={[
                  "feedback-form__input",
                  errors.contactEmail ? "feedback-form__input--error" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                type="email"
                placeholder="email@example.com"
                value={contactEmail}
                disabled={loading}
                aria-invalid={Boolean(errors.contactEmail)}
                aria-describedby={
                  errors.contactEmail
                    ? "feedback-contact-email-error"
                    : "feedback-contact-email-help"
                }
                onChange={(event) => {
                  setContactEmail(event.target.value);
                  setErrors((current) => ({
                    ...current,
                    contactEmail: undefined,
                  }));
                  setGeneralError(null);
                  setSuccessMessage(null);
                }}
              />

              <p
                id="feedback-contact-email-help"
                className="feedback-form__hint"
              >
                Ako želite da vas restoran kontaktira, ostavite email.
              </p>

              {errors.contactEmail && (
                <p
                  id="feedback-contact-email-error"
                  className="feedback-form__error"
                  role="alert"
                >
                  {errors.contactEmail}
                </p>
              )}
            </div>
          )}

          {isAuthenticated && user && (
            <p className="feedback-form__user-note">
              Šaljete kao <strong>{user.email}</strong>.
            </p>
          )}

          {generalError && (
            <div className="feedback-form__alert feedback-form__alert--error">
              <span aria-hidden="true">!</span>
              <p>{generalError}</p>
            </div>
          )}

          {successMessage && (
            <div className="feedback-form__alert feedback-form__alert--success">
              <span aria-hidden="true">✓</span>
              <p>{successMessage}</p>
            </div>
          )}

          <div className="feedback-form__actions">
            <button
              type="button"
              className="feedback-form__secondary"
              onClick={onClose}
              disabled={loading}
            >
              Zatvori
            </button>

            <button
              type="submit"
              className="feedback-form__submit"
              disabled={loading}
            >
              {loading ? "Šaljem..." : "Pošalji poruku"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
