import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiErrorMessage } from "../utils/apiErrors";
import { validateLogin } from "../auth/auth.validation";
import "../styles/AuthPage.scss";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname || "/menu";

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<"username" | "password", string>>
  >({});

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validateLogin(form);

    setErrors(validationErrors);
    setGeneralError(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      await login({
        userName: form.username.trim(),
        password: form.password,
      });

      navigate(redirectTo, { replace: true });
    } catch (e: any) {
      setGeneralError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-page__overlay" aria-hidden="true" />

      <section className="auth-card" aria-labelledby="login-page-title">
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
          <span className="auth-card__eyebrow">DOBRODOŠLI NAZAD</span>

          <h1 id="login-page-title" className="auth-card__title">
            Prijavi se
          </h1>

          <p className="auth-card__description">
            Prijavi se na svoj nalog i nastavi sa poručivanjem omiljenih jela.
          </p>
        </header>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="login-username">
              Korisničko ime
            </label>

            <input
              id="login-username"
              name="username"
              className={[
                "auth-form__input",
                errors.username ? "auth-form__input--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              type="text"
              placeholder="Unesi korisničko ime"
              value={form.username}
              autoComplete="username"
              aria-invalid={Boolean(errors.username)}
              aria-describedby={
                errors.username ? "login-username-error" : undefined
              }
              onChange={(e) => {
                const value = e.target.value;

                setForm((prev) => ({
                  ...prev,
                  username: value,
                }));

                setErrors((prev) => ({
                  ...prev,
                  username: undefined,
                }));

                setGeneralError(null);
              }}
            />

            {errors.username && (
              <p
                id="login-username-error"
                className="auth-form__error"
                role="alert"
              >
                {errors.username}
              </p>
            )}
          </div>

          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="login-password">
              Lozinka
            </label>

            <input
              id="login-password"
              name="password"
              className={[
                "auth-form__input",
                errors.password ? "auth-form__input--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              type="password"
              placeholder="Unesi lozinku"
              value={form.password}
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
              onChange={(e) => {
                const value = e.target.value;

                setForm((prev) => ({
                  ...prev,
                  password: value,
                }));

                setErrors((prev) => ({
                  ...prev,
                  password: undefined,
                }));

                setGeneralError(null);
              }}
            />

            {errors.password && (
              <p
                id="login-password-error"
                className="auth-form__error"
                role="alert"
              >
                {errors.password}
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

          <button
            className="auth-form__submit"
            type="submit"
            disabled={loading}
          >
            {loading && (
              <span className="auth-form__spinner" aria-hidden="true" />
            )}

            <span>{loading ? "Prijavljujem..." : "Prijavi se"}</span>
          </button>
        </form>

        <p className="auth-card__security-note">
          Sigurna prijava i zaštićeni podaci naloga
        </p>
        <footer className="auth-card__footer">
          <p className="auth-card__switch">
            Nemaš nalog?
            <Link to="/register">Registruj se</Link>
          </p>

          <Link to="/" className="auth-card__back-link">
            Nazad na početnu
          </Link>
        </footer>
      </section>
    </main>
  );
}
