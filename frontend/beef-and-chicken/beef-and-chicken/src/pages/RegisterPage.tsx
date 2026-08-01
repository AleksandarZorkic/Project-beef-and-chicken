import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiErrorMessage } from "../utils/apiErrors";
import { getApiFieldErrors } from "../utils/apiValidationErrors";
import { validateRegister, getPasswordRules } from "../auth/auth.validation";
import "../styles/AuthPage.scss";

type RegisterField =
  | "firstName"
  | "lastName"
  | "email"
  | "username"
  | "phoneNumber"
  | "password"
  | "confirmPassword";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Partial<Record<RegisterField, string>>>(
    {},
  );

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordRules, setPasswordRules] = useState(getPasswordRules(""));

  function setField<K extends keyof typeof form>(field: K, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));

    setGeneralError(null);

    if (field === "password") {
      setPasswordRules(getPasswordRules(value));
    }
  }

  function getInputClass(field: RegisterField) {
    return ["auth-form__input", errors[field] ? "auth-form__input--error" : ""]
      .filter(Boolean)
      .join(" ");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validateRegister(form);

    setErrors(validationErrors);
    setGeneralError(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        userName: form.username.trim(),
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
        profilePicture: null,
      });

      navigate("/login");
    } catch (e: any) {
      const apiFieldErrors = getApiFieldErrors(e);

      if (Object.keys(apiFieldErrors).length > 0) {
        setErrors({
          firstName: apiFieldErrors.FirstName,
          lastName: apiFieldErrors.LastName,
          email: apiFieldErrors.Email,
          username: apiFieldErrors.UserName ?? apiFieldErrors.Username,
          phoneNumber: apiFieldErrors.PhoneNumber,
          password: apiFieldErrors.Password,
        });
      } else {
        setGeneralError(getApiErrorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page auth-page--register">
      <div className="auth-page__overlay" aria-hidden="true" />

      <section
        className="auth-card auth-card--register"
        aria-labelledby="register-page-title"
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
              Burgeri • piletina • grill
            </span>
          </div>
        </div>

        <header className="auth-card__header">
          <span className="auth-card__eyebrow">KREIRAJ SVOJ NALOG</span>

          <h1 id="register-page-title" className="auth-card__title">
            Registracija
          </h1>

          <p className="auth-card__description">
            Napravi nalog, sačuvaj svoje podatke i poručuj omiljena jela bez
            nepotrebnog čekanja.
          </p>
        </header>

        <form
          className="auth-form auth-form--register"
          onSubmit={onSubmit}
          noValidate
        >
          <div className="auth-form__row">
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="register-first-name">
                Ime
              </label>

              <input
                id="register-first-name"
                name="firstName"
                className={getInputClass("firstName")}
                type="text"
                placeholder="Unesi ime"
                value={form.firstName}
                autoComplete="given-name"
                aria-invalid={Boolean(errors.firstName)}
                aria-describedby={
                  errors.firstName ? "register-first-name-error" : undefined
                }
                onChange={(e) => setField("firstName", e.target.value)}
              />

              {errors.firstName && (
                <p
                  id="register-first-name-error"
                  className="auth-form__error"
                  role="alert"
                >
                  {errors.firstName}
                </p>
              )}
            </div>

            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="register-last-name">
                Prezime
              </label>

              <input
                id="register-last-name"
                name="lastName"
                className={getInputClass("lastName")}
                type="text"
                placeholder="Unesi prezime"
                value={form.lastName}
                autoComplete="family-name"
                aria-invalid={Boolean(errors.lastName)}
                aria-describedby={
                  errors.lastName ? "register-last-name-error" : undefined
                }
                onChange={(e) => setField("lastName", e.target.value)}
              />

              {errors.lastName && (
                <p
                  id="register-last-name-error"
                  className="auth-form__error"
                  role="alert"
                >
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          <div className="auth-form__row">
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="register-email">
                Email adresa
              </label>

              <input
                id="register-email"
                name="email"
                className={getInputClass("email")}
                type="email"
                placeholder="ime@email.com"
                value={form.email}
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={
                  errors.email ? "register-email-error" : undefined
                }
                onChange={(e) => setField("email", e.target.value)}
              />

              {errors.email && (
                <p
                  id="register-email-error"
                  className="auth-form__error"
                  role="alert"
                >
                  {errors.email}
                </p>
              )}
            </div>

            <div className="auth-form__field">
              <label
                className="auth-form__label"
                htmlFor="register-phone-number"
              >
                Broj telefona
              </label>

              <input
                id="register-phone-number"
                name="phoneNumber"
                className={getInputClass("phoneNumber")}
                type="tel"
                placeholder="+381 6x xxx xxxx"
                value={form.phoneNumber}
                autoComplete="tel"
                aria-invalid={Boolean(errors.phoneNumber)}
                aria-describedby={
                  errors.phoneNumber ? "register-phone-number-error" : undefined
                }
                onChange={(e) => setField("phoneNumber", e.target.value)}
              />

              {errors.phoneNumber && (
                <p
                  id="register-phone-number-error"
                  className="auth-form__error"
                  role="alert"
                >
                  {errors.phoneNumber}
                </p>
              )}
            </div>
          </div>

          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="register-username">
              Korisničko ime
            </label>

            <input
              id="register-username"
              name="username"
              className={getInputClass("username")}
              type="text"
              placeholder="Izaberi korisničko ime"
              value={form.username}
              autoComplete="username"
              aria-invalid={Boolean(errors.username)}
              aria-describedby={
                errors.username ? "register-username-error" : undefined
              }
              onChange={(e) => setField("username", e.target.value)}
            />

            {errors.username && (
              <p
                id="register-username-error"
                className="auth-form__error"
                role="alert"
              >
                {errors.username}
              </p>
            )}
          </div>

          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="register-password">
              Lozinka
            </label>

            <input
              id="register-password"
              name="password"
              className={getInputClass("password")}
              type="password"
              placeholder="Kreiraj sigurnu lozinku"
              value={form.password}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="register-password-rules register-password-error"
              onChange={(e) => setField("password", e.target.value)}
            />

            <div
              id="register-password-rules"
              className="auth-password-rules"
              aria-label="Pravila za lozinku"
            >
              <span
                className={[
                  "auth-password-rule",
                  passwordRules.minLength ? "auth-password-rule--valid" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                Minimum 8 karaktera
              </span>

              <span
                className={[
                  "auth-password-rule",
                  passwordRules.hasUppercase ? "auth-password-rule--valid" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                Bar jedno veliko slovo
              </span>

              <span
                className={[
                  "auth-password-rule",
                  passwordRules.hasLowercase ? "auth-password-rule--valid" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                Bar jedno malo slovo
              </span>

              <span
                className={[
                  "auth-password-rule",
                  passwordRules.hasDigit ? "auth-password-rule--valid" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                Bar jedan broj
              </span>

              <span
                className={[
                  "auth-password-rule",
                  passwordRules.hasSpecialChar
                    ? "auth-password-rule--valid"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                Bar jedan specijalni znak
              </span>
            </div>

            {errors.password && (
              <p
                id="register-password-error"
                className="auth-form__error"
                role="alert"
              >
                {errors.password}
              </p>
            )}
          </div>

          <div className="auth-form__field">
            <label
              className="auth-form__label"
              htmlFor="register-confirm-password"
            >
              Potvrdi lozinku
            </label>

            <input
              id="register-confirm-password"
              name="confirmPassword"
              className={getInputClass("confirmPassword")}
              type="password"
              placeholder="Ponovo unesi lozinku"
              value={form.confirmPassword}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={
                errors.confirmPassword
                  ? "register-confirm-password-error"
                  : undefined
              }
              onChange={(e) => setField("confirmPassword", e.target.value)}
            />

            {errors.confirmPassword && (
              <p
                id="register-confirm-password-error"
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

          <button
            className="auth-form__submit"
            type="submit"
            disabled={loading}
          >
            {loading && (
              <span className="auth-form__spinner" aria-hidden="true" />
            )}

            <span>{loading ? "Registrujem..." : "Registruj se"}</span>
          </button>
        </form>

        <footer className="auth-card__footer">
          <p className="auth-card__switch">
            Već imaš nalog?
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
