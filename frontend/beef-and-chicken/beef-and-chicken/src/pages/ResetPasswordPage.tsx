import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/authApi";
import { getApiErrorMessage } from "../utils/apiErrors";
import "../styles/AuthPage.scss";

type ResetPasswordForm = {
  newPassword: string;
  confirmPassword: string;
};

type ResetPasswordErrors = Partial<Record<keyof ResetPasswordForm, string>>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [form, setForm] = useState<ResetPasswordForm>({
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasValidResetLink = Boolean(email && token);

  function validateForm(value: ResetPasswordForm) {
    const nextErrors: ResetPasswordErrors = {};

    if (!value.newPassword) {
      nextErrors.newPassword = "Nova lozinka je obavezna.";
    } else if (value.newPassword.length < 8) {
      nextErrors.newPassword = "Lozinka mora imati najmanje 8 karaktera.";
    }

    if (!value.confirmPassword) {
      nextErrors.confirmPassword = "Potvrda lozinke je obavezna.";
    } else if (value.newPassword !== value.confirmPassword) {
      nextErrors.confirmPassword =
        "Nova lozinka i potvrda lozinke se ne poklapaju.";
    }

    return nextErrors;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setGeneralError(null);
    setSuccessMessage(null);

    if (!hasValidResetLink) {
      setGeneralError("Link za reset lozinke nije ispravan.");
      return;
    }

    const validationErrors = validateForm(form);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      await resetPassword({
        email,
        token,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      setSuccessMessage("Lozinka je uspešno promenjena.");

      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (error: any) {
      setGeneralError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-page__overlay" aria-hidden="true" />

      <section className="auth-card" aria-labelledby="reset-password-title">
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
          <span className="auth-card__eyebrow">NOVA LOZINKA</span>

          <h1 id="reset-password-title" className="auth-card__title">
            Postavi novu lozinku
          </h1>

          <p className="auth-card__description">
            Unesi novu lozinku za svoj Beef n&apos; Chicken nalog.
          </p>
        </header>

        {!hasValidResetLink && (
          <div className="auth-form__general-error" role="alert">
            <span className="auth-form__general-error-icon" aria-hidden="true">
              !
            </span>

            <p>Link za reset lozinke nije ispravan ili nedostaje token.</p>
          </div>
        )}

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="reset-new-password">
              Nova lozinka
            </label>

            <input
              id="reset-new-password"
              name="newPassword"
              className={[
                "auth-form__input",
                errors.newPassword ? "auth-form__input--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              type="password"
              placeholder="Unesi novu lozinku"
              value={form.newPassword}
              autoComplete="new-password"
              disabled={!hasValidResetLink || loading}
              aria-invalid={Boolean(errors.newPassword)}
              aria-describedby={
                errors.newPassword ? "reset-new-password-error" : undefined
              }
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  newPassword: event.target.value,
                }));

                setErrors((prev) => ({
                  ...prev,
                  newPassword: undefined,
                }));

                setGeneralError(null);
                setSuccessMessage(null);
              }}
            />

            {errors.newPassword && (
              <p
                id="reset-new-password-error"
                className="auth-form__error"
                role="alert"
              >
                {errors.newPassword}
              </p>
            )}
          </div>

          <div className="auth-form__field">
            <label
              className="auth-form__label"
              htmlFor="reset-confirm-password"
            >
              Potvrdi novu lozinku
            </label>

            <input
              id="reset-confirm-password"
              name="confirmPassword"
              className={[
                "auth-form__input",
                errors.confirmPassword ? "auth-form__input--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              type="password"
              placeholder="Ponovi novu lozinku"
              value={form.confirmPassword}
              autoComplete="new-password"
              disabled={!hasValidResetLink || loading}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={
                errors.confirmPassword
                  ? "reset-confirm-password-error"
                  : undefined
              }
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  confirmPassword: event.target.value,
                }));

                setErrors((prev) => ({
                  ...prev,
                  confirmPassword: undefined,
                }));

                setGeneralError(null);
                setSuccessMessage(null);
              }}
            />

            {errors.confirmPassword && (
              <p
                id="reset-confirm-password-error"
                className="auth-form__error"
                role="alert"
              >
                {errors.confirmPassword}
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
            disabled={!hasValidResetLink || loading}
          >
            {loading && (
              <span className="auth-form__spinner" aria-hidden="true" />
            )}

            <span>{loading ? "Čuvam..." : "Promeni lozinku"}</span>
          </button>
        </form>

        <footer className="auth-card__footer">
          <p className="auth-card__switch">
            Već imaš pristup nalogu?
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
