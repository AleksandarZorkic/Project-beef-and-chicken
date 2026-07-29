import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiErrorMessage } from "../utils/apiErrors";
import { getApiFieldErrors } from "../utils/apiValidationErrors";
import { validateRegister, getPasswordRules } from "../auth/auth.validation";

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
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setGeneralError(null);

    if (field === "password") {
      setPasswordRules(getPasswordRules(value));
    }
  }

  async function onSubmit(e: React.FormEvent) {
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
    <div style={{ maxWidth: 420 }}>
      <h2>Registracija</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div>
          <input
            type="text"
            placeholder="Ime"
            value={form.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
          />
          {errors.firstName && (
            <div style={{ color: "crimson", marginTop: 4 }}>
              {errors.firstName}
            </div>
          )}
        </div>

        <div>
          <input
            type="text"
            placeholder="Prezime"
            value={form.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
          />
          {errors.lastName && (
            <div style={{ color: "crimson", marginTop: 4 }}>
              {errors.lastName}
            </div>
          )}
        </div>

        <div>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
          />
          {errors.email && (
            <div style={{ color: "crimson", marginTop: 4 }}>{errors.email}</div>
          )}
        </div>

        <div>
          <input
            type="tel"
            placeholder="Broj telefona"
            value={form.phoneNumber}
            onChange={(e) => setField("phoneNumber", e.target.value)}
          />
          {errors.phoneNumber && (
            <div style={{ color: "crimson", marginTop: 4 }}>
              {errors.phoneNumber}
            </div>
          )}
        </div>

        <div>
          <input
            type="text"
            placeholder="Korisničko ime"
            value={form.username}
            onChange={(e) => setField("username", e.target.value)}
          />
          {errors.username && (
            <div style={{ color: "crimson", marginTop: 4 }}>
              {errors.username}
            </div>
          )}
        </div>

        <div>
          <input
            type="password"
            placeholder="Lozinka"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
          />
          <div style={{ fontSize: 14, marginTop: 4 }}>
            <div
              style={{ color: passwordRules.minLength ? "green" : "crimson" }}
            >
              {passwordRules.minLength ? "✓" : "✗"} Minimum 8 karaktera
            </div>
            <div
              style={{
                color: passwordRules.hasUppercase ? "green" : "crimson",
              }}
            >
              {passwordRules.hasUppercase ? "✓" : "✗"} Bar jedno veliko slovo
            </div>
            <div
              style={{
                color: passwordRules.hasLowercase ? "green" : "crimson",
              }}
            >
              {passwordRules.hasLowercase ? "✓" : "✗"} Bar jedno malo slovo
            </div>
            <div
              style={{ color: passwordRules.hasDigit ? "green" : "crimson" }}
            >
              {passwordRules.hasDigit ? "✓" : "✗"} Bar jedan broj
            </div>
            <div
              style={{
                color: passwordRules.hasSpecialChar ? "green" : "crimson",
              }}
            >
              {passwordRules.hasSpecialChar ? "✓" : "✗"} Bar jedan specijalni
              znak
            </div>
          </div>
          {errors.password && (
            <div style={{ color: "crimson", marginTop: 4 }}>
              {errors.password}
            </div>
          )}
        </div>

        <div>
          <input
            type="password"
            placeholder="Potvrdi lozinku"
            value={form.confirmPassword}
            onChange={(e) => setField("confirmPassword", e.target.value)}
          />
          {errors.confirmPassword && (
            <div style={{ color: "crimson", marginTop: 4 }}>
              {errors.confirmPassword}
            </div>
          )}
        </div>

        <div style={{ fontSize: 14, color: "#555" }}>
          Lozinka mora imati najmanje 8 karaktera, veliko slovo, malo slovo,
          broj i specijalni znak.
        </div>

        {generalError && <div style={{ color: "crimson" }}>{generalError}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Registrujem..." : "Registruj se"}
        </button>
      </form>
    </div>
  );
}
