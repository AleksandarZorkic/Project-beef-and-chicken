import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/authApi";
import { getApiErrorMessage } from "../utils/apiErrors";
import "../styles/AuthPage.scss";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validateEmail(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      return "Email je obavezan.";
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      return "Email nije ispravan.";
    }

    return null;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateEmail(email);

    setEmailError(validationError);
    setGeneralError(null);
    setSuccessMessage(null);

    if (validationError) {
      return;
    }

    try {
      setLoading(true);

      await forgotPassword(email.trim());

      setSuccessMessage(
        "Ako nalog sa ovom email adresom postoji, poslat je link za reset lozinke.",
      );
    } catch (error: any) {
      setGeneralError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-page__overlay" aria-hidden="true" />

      <section className="auth-card" aria-labelledby="forgot-password-title">
        <div className="auth-card__brand">
          <img
            src="/logo.png"
            alt="Beef n' Chicken Grill"
            className="auth-card__logo"
          />

          <div className="auth-card__brand-text">
            <span className="auth-card__brand-name">Beef n&apos; Chicken</span>

            <span className="auth-card__brand-description">
              Burgeri • piletina • grill
            </span>
          </div>
        </div>

        <header className="auth-card__header">
          <span className="auth-card__eyebrow">RESET LOZINKE</span>

          <h1 id="forgot-password-title" className="auth-card__title">
            Zaboravljena lozinka
          </h1>

          <p className="auth-card__description">
            Unesi email adresu svog naloga. Ako nalog postoji, poslaćemo ti link
            za postavljanje nove lozinke.
          </p>
        </header>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="forgot-email">
              Email adresa
            </label>

            <input
              id="forgot-email"
              name="email"
              className={[
                "auth-form__input",
                emailError ? "auth-form__input--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              type="email"
              placeholder="Unesi email adresu"
              value={email}
              autoComplete="email"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "forgot-email-error" : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError(null);
                setGeneralError(null);
                setSuccessMessage(null);
              }}
            />

            {emailError && (
              <p
                id="forgot-email-error"
                className="auth-form__error"
                role="alert"
              >
                {emailError}
              </p>
            )}
          </div>

          {generalError && (
            <div className="auth-form__general-error" role="alert">
              <span
                className="auth-form__general-error-icon"
                aria-hidden="true"
              >
                !
              </span>

              <p>{generalError}</p>
            </div>
          )}

          {successMessage && (
            <div className="auth-form__general-success" role="status">
              <span
                className="auth-form__general-success-icon"
                aria-hidden="true"
              >
                ✓
              </span>

              <p>{successMessage}</p>
            </div>
          )}

          <button
            className="auth-form__submit"
            type="submit"
            disabled={loading}
          >
            {loading && (
              <span className="auth-form__spinner" aria-hidden="true" />
            )}

            <span>{loading ? "Šaljem..." : "Pošalji link za reset"}</span>
          </button>
        </form>

        <footer className="auth-card__footer">
          <p className="auth-card__switch">
            Setio/la si se lozinke?
            <Link to="/login">Prijavi se</Link>
          </p>

          <Link to="/" className="auth-card__back-link">
            Nazad na početnu
          </Link>
        </footer>
      </section>
    </main>
  );
}
