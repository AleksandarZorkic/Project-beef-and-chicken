import type { FormEvent } from "react";
import { AppRoles, type AppRole } from "../../../auth/roles";

export type AdminUserFormState = {
  userName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: AppRole[];
};

type AdminUserFormProps = {
  form: AdminUserFormState;
  isEditing: boolean;
  saving: boolean;
  onChange: (form: AdminUserFormState) => void;
  onToggleRole: (role: AppRole) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const roleOptions = Object.values(AppRoles);

export function AdminUserForm({
  form,
  isEditing,
  saving,
  onChange,
  onToggleRole,
  onSubmit,
  onCancel,
}: AdminUserFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        display: "grid",
        gap: 12,
      }}
    >
      <h3>{isEditing ? "Izmeni korisnika" : "Kreiraj korisnika"}</h3>

      <label>
        Korisničko ime
        <input
          value={form.userName}
          onChange={(e) => onChange({ ...form, userName: e.target.value })}
          placeholder="npr. worker1"
          style={{ display: "block", width: "100%", marginTop: 4 }}
        />
      </label>

      <label>
        Email
        <input
          value={form.email}
          onChange={(e) => onChange({ ...form, email: e.target.value })}
          placeholder="npr. worker@test.com"
          style={{ display: "block", width: "100%", marginTop: 4 }}
        />
      </label>

      {!isEditing && (
        <label>
          Lozinka
          <input
            type="password"
            value={form.password}
            onChange={(e) => onChange({ ...form, password: e.target.value })}
            placeholder="npr. Test123!"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
      )}

      <label>
        Ime
        <input
          value={form.firstName}
          onChange={(e) => onChange({ ...form, firstName: e.target.value })}
          placeholder="Ime"
          style={{ display: "block", width: "100%", marginTop: 4 }}
        />
      </label>

      <label>
        Prezime
        <input
          value={form.lastName}
          onChange={(e) => onChange({ ...form, lastName: e.target.value })}
          placeholder="Prezime"
          style={{ display: "block", width: "100%", marginTop: 4 }}
        />
      </label>

      <div>
        <strong>Role</strong>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 8,
          }}
        >
          {roleOptions.map((role) => (
            <label
              key={role}
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                border: form.roles.includes(role)
                  ? "1px solid #333"
                  : "1px solid #ddd",
                borderRadius: 999,
                padding: "6px 10px",
              }}
            >
              <input
                type="checkbox"
                checked={form.roles.includes(role)}
                onChange={() => onToggleRole(role)}
              />
              {role}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={saving}>
          {saving
            ? "Čuvam..."
            : isEditing
              ? "Sačuvaj izmene"
              : "Kreiraj korisnika"}
        </button>

        {isEditing && (
          <button type="button" onClick={onCancel} disabled={saving}>
            Odustani
          </button>
        )}
      </div>
    </form>
  );
}
