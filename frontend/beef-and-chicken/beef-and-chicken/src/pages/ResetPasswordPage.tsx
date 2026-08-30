import { useEffect, useMemo, useState, type FormEvent } from "react";
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

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasValidResetLink = Boolean(email && token);

  const hasMinimumLength = form.newPassword.length >= 8;
  const passwordsMatch =
    form.confirmPassword.length > 0 &&
    form.newPassword === form.confirmPassword;

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      navigate("/login", { replace: true });
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [successMessage, navigate]);

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
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

      setSuccessMessage(
        "Lozinka je uspešno promenjena. Preusmeravamo te na prijavu...",
      );
    } catch (error: any) {
      setGeneralError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page auth-page--recovery">
      <div className="auth-page__overlay" aria-hidden="true" />

      <section
        className="auth-card auth-card--recovery"
        aria-labelledby="reset-password-title"
      >
        <div className="auth-card__brand">
          <img
            src="/logo.png"
            alt="Beef n' Chicken Grill"
            className="auth-card__logo"
          />

          <div className="auth-card__brand-text">
            <span className="auth-card__brand-name">Beef n&apos; Chicken</span>

            <span className="auth-card__brand-description">
              Burgeri • piletina • roštilj
            </span>
          </div>
        </div>

        <div
          className={[
            "auth-recovery-icon",
            successMessage ? "auth-recovery-icon--success" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        >
          {successMessage ? (
            <svg viewBox="0 0 24 24">
              <path
                d="m6 12.5 4 4L18.5 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24">
              <path
                d="M7 10V8a5 5 0 0 1 10 0v2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />

              <rect
                x="5"
                y="10"
                width="14"
                height="10"
                rx="2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />

              <path
                d="M12 14v2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        <header className="auth-card__header auth-card__header--recovery">
          <span className="auth-card__eyebrow">NOVA LOZINKA</span>

          <h1 id="reset-password-title" className="auth-card__title">
            Postavi novu lozinku
          </h1>

          <p className="auth-card__description">
            Izaberi novu lozinku za svoj Beef n&apos; Chicken nalog i potvrdi je
            još jednom.
          </p>
        </header>

        {!hasValidResetLink ? (
          <>
            <div className="auth-recovery-invalid" role="alert">
              <span className="auth-recovery-invalid__icon" aria-hidden="true">
                !
              </span>

              <div>
                <strong>Link nije ispravan</strong>

                <p>
                  Link za reset lozinke je nevažeći, nepotpun ili više nije
                  dostupan.
                </p>
              </div>
            </div>

            <div className="auth-recovery-invalid__actions">
              <Link
                to="/forgot-password"
                className="auth-form__submit auth-form__submit--link"
              >
                Zatraži novi link
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="auth-recovery-account">
              <span>Menjaš lozinku za</span>
              <strong>{email}</strong>
            </div>

            <form className="auth-form" onSubmit={onSubmit} noValidate>
              <div className="auth-form__field">
                <label
                  className="auth-form__label"
                  htmlFor="reset-new-password"
                >
                  Nova lozinka
                </label>

                <div className="auth-form__password-wrapper">
                  <input
                    id="reset-new-password"
                    name="newPassword"
                    className={[
                      "auth-form__input",
                      "auth-form__input--password",
                      errors.newPassword ? "auth-form__input--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Najmanje 8 karaktera"
                    value={form.newPassword}
                    autoComplete="new-password"
                    disabled={loading || Boolean(successMessage)}
                    aria-invalid={Boolean(errors.newPassword)}
                    aria-describedby={
                      errors.newPassword
                        ? "reset-new-password-error"
                        : "reset-password-rules"
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
                    }}
                  />

                  <button
                    type="button"
                    className="auth-form__password-toggle"
                    aria-label={
                      showNewPassword ? "Sakrij lozinku" : "Prikaži lozinku"
                    }
                    disabled={loading || Boolean(successMessage)}
                    onClick={() => setShowNewPassword((current) => !current)}
                  >
                    {showNewPassword ? "Sakrij" : "Prikaži"}
                  </button>
                </div>

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

                <div className="auth-form__password-wrapper">
                  <input
                    id="reset-confirm-password"
                    name="confirmPassword"
                    className={[
                      "auth-form__input",
                      "auth-form__input--password",
                      errors.confirmPassword ? "auth-form__input--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ponovi novu lozinku"
                    value={form.confirmPassword}
                    autoComplete="new-password"
                    disabled={loading || Boolean(successMessage)}
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
                    }}
                  />

                  <button
                    type="button"
                    className="auth-form__password-toggle"
                    aria-label={
                      showConfirmPassword ? "Sakrij lozinku" : "Prikaži lozinku"
                    }
                    disabled={loading || Boolean(successMessage)}
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                  >
                    {showConfirmPassword ? "Sakrij" : "Prikaži"}
                  </button>
                </div>

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

              <div
                id="reset-password-rules"
                className="auth-password-rules auth-password-rules--recovery"
              >
                <span
                  className={[
                    "auth-password-rule",
                    hasMinimumLength ? "auth-password-rule--valid" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  Najmanje 8 karaktera
                </span>

                <span
                  className={[
                    "auth-password-rule",
                    passwordsMatch ? "auth-password-rule--valid" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  Lozinke se poklapaju
                </span>
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
                <div
                  className="auth-form__general-success auth-form__general-success--recovery"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    className="auth-form__general-success-icon"
                    aria-hidden="true"
                  >
                    ✓
                  </span>

                  <div>
                    <strong>Lozinka je promenjena</strong>
                    <p>{successMessage}</p>
                  </div>
                </div>
              )}

              <button
                className="auth-form__submit"
                type="submit"
                disabled={loading || Boolean(successMessage)}
              >
                {loading && (
                  <span className="auth-form__spinner" aria-hidden="true" />
                )}

                <span>{loading ? "Čuvam..." : "Promeni lozinku"}</span>

                {!loading && !successMessage && (
                  <span aria-hidden="true">→</span>
                )}
              </button>
            </form>
          </>
        )}

        <footer className="auth-card__footer">
          <p className="auth-card__switch">
            Već imaš pristup nalogu?
            <Link to="/login">Prijavi se</Link>
          </p>

          <Link to="/" className="auth-card__back-link">
            ← Nazad na početnu
          </Link>
        </footer>
      </section>
    </main>
  );
}
