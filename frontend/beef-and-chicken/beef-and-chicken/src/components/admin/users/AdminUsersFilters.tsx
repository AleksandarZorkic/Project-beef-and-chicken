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
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}
    >
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
      />

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as AdminUsersStatus)}
      >
        <option value="all">Svi statusi</option>
        <option value="active">Aktivni</option>
        <option value="blocked">Blokirani</option>
        <option value="anonymized">Anonimizovani</option>
      </select>

      <button type="submit">Pretraži</button>
    </form>
  );
}
