import type { FormEvent } from "react";
import type { AdminUsersStatus } from "../../../api/adminUsersApi";

type AdminUsersFiltersProps = {
  search: string;
  status: AdminUsersStatus;
  placeholder: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AdminUsersStatus) => void;
  onSubmit: () => void;
};

export function AdminUsersFilters({
  search,
  status,
  placeholder,
  onSearchChange,
  onStatusChange,
  onSubmit,
}: AdminUsersFiltersProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSubmit();
  }

  return (
    <form className="admin-users-filters" onSubmit={handleSubmit}>
      <div className="admin-users-filters__search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle
            cx="11"
            cy="11"
            r="7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />

          <path
            d="m16.2 16.2 4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>

        <input
          className="form-control"
          type="search"
          value={search}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <select
        className="form-select admin-users-filters__status"
        value={status}
        aria-label="Status korisnika"
        onChange={(event) =>
          onStatusChange(event.target.value as AdminUsersStatus)
        }
      >
        <option value="all">Svi statusi</option>
        <option value="active">Aktivni</option>
        <option value="blocked">Blokirani</option>
        <option value="anonymized">Anonimizovani</option>
      </select>

      <button type="submit" className="admin-users-filters__submit">
        Pretraži
      </button>
    </form>
  );
}
