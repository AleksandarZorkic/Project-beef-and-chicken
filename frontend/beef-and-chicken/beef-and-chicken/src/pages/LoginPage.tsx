import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiErrorMessage } from "../utils/apiErrors";
import { validateLogin } from "../auth/auth.validation";

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validateLogin(form);
    setErrors(validationErrors);
    setGeneralError(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (e: any) {
      setGeneralError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Prijava</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div>
          <input
            type="text"
            placeholder="Korisničko ime"
            value={form.username}
            onChange={(e) => {
              const value = e.target.value;
              setForm((prev) => ({ ...prev, username: value }));
              setErrors((prev) => ({ ...prev, username: undefined }));
              setGeneralError(null);
            }}
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
            onChange={(e) => {
              const value = e.target.value;
              setForm((prev) => ({ ...prev, password: value }));
              setErrors((prev) => ({ ...prev, password: undefined }));
              setGeneralError(null);
            }}
          />
          {errors.password && (
            <div style={{ color: "crimson", marginTop: 4 }}>
              {errors.password}
            </div>
          )}
        </div>

        {generalError && <div style={{ color: "crimson" }}>{generalError}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Prijavljujem..." : "Prijavi se"}
        </button>
      </form>
    </div>
  );
}
