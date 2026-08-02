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
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const roleOptions = Object.values(AppRoles) as AppRole[];

function formatRoleLabel(role: AppRole) {
  return String(role).replace(/([a-z])([A-Z])/g, "$1 $2");
}

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
    <>
      <header className="admin-user-editor__header">
        <div>
          <span className="admin-user-editor__eyebrow">
            {isEditing ? "IZMENA NALOGA" : "NOVI NALOG"}
          </span>

          <h2 className="admin-user-editor__title">
            {isEditing ? "Izmeni korisnika" : "Kreiraj korisnika"}
          </h2>
        </div>

        <span className="admin-user-editor__mode">
          {isEditing ? "Izmena" : "Kreiranje"}
        </span>
      </header>

      <form className="form admin-user-form" onSubmit={onSubmit}>
        <div className="form-field">
          <label className="form-label" htmlFor="admin-user-username">
            Korisničko ime
            <span className="form-label__required">*</span>
          </label>

          <input
            id="admin-user-username"
            className="form-control"
            type="text"
            value={form.userName}
            placeholder="Na primer: worker1"
            autoComplete="off"
            onChange={(event) =>
              onChange({
                ...form,
                userName: event.target.value,
              })
            }
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="admin-user-email">
            Email
            <span className="form-label__required">*</span>
          </label>

          <input
            id="admin-user-email"
            className="form-control"
            type="email"
            value={form.email}
            placeholder="worker@example.com"
            autoComplete="email"
            onChange={(event) =>
              onChange({
                ...form,
                email: event.target.value,
              })
            }
          />
        </div>

        {!isEditing && (
          <div className="form-field">
            <label className="form-label" htmlFor="admin-user-password">
              Lozinka
              <span className="form-label__required">*</span>
            </label>

            <input
              id="admin-user-password"
              className="form-control"
              type="password"
              value={form.password}
              placeholder="Najmanje 8 karaktera"
              autoComplete="new-password"
              onChange={(event) =>
                onChange({
                  ...form,
                  password: event.target.value,
                })
              }
            />

            <p className="form-help">
              Lozinka mora imati najmanje osam karaktera.
            </p>
          </div>
        )}

        <div className="form-grid">
          <div className="form-field">
            <label className="form-label" htmlFor="admin-user-first-name">
              Ime
              <span className="form-label__required">*</span>
            </label>

            <input
              id="admin-user-first-name"
              className="form-control"
              type="text"
              value={form.firstName}
              placeholder="Ime"
              autoComplete="given-name"
              onChange={(event) =>
                onChange({
                  ...form,
                  firstName: event.target.value,
                })
              }
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="admin-user-last-name">
              Prezime
              <span className="form-label__required">*</span>
            </label>

            <input
              id="admin-user-last-name"
              className="form-control"
              type="text"
              value={form.lastName}
              placeholder="Prezime"
              autoComplete="family-name"
              onChange={(event) =>
                onChange({
                  ...form,
                  lastName: event.target.value,
                })
              }
            />
          </div>
        </div>

        <fieldset className="admin-user-roles">
          <legend>Role korisnika</legend>

          <p className="admin-user-roles__description">
            Izaberite najmanje jednu rolu. Role određuju kojim delovima
            aplikacije korisnik može da pristupi.
          </p>

          <div className="admin-user-roles__grid">
            {roleOptions.map((role) => {
              const selected = form.roles.includes(role);

              return (
                <label
                  key={String(role)}
                  className={[
                    "admin-user-role",
                    selected ? "admin-user-role--selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleRole(role)}
                  />

                  <span className="admin-user-role__control" aria-hidden="true">
                    ✓
                  </span>

                  <span className="admin-user-role__content">
                    <strong>{formatRoleLabel(role)}</strong>

                    <small>
                      {selected ? "Rola je dodeljena" : "Rola nije dodeljena"}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="admin-user-form__actions">
          <button
            type="submit"
            className="admin-user-button admin-user-button--primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <span
                  className="admin-user-button__spinner"
                  aria-hidden="true"
                />
                Čuvam...
              </>
            ) : isEditing ? (
              "Sačuvaj izmene"
            ) : (
              "Kreiraj korisnika"
            )}
          </button>

          {isEditing && (
            <button
              type="button"
              className="admin-user-button admin-user-button--secondary"
              disabled={saving}
              onClick={onCancel}
            >
              Odustani
            </button>
          )}
        </div>
      </form>
    </>
  );
}
