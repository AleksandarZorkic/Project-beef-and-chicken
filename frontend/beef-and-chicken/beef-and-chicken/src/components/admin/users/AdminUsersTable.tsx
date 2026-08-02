import type { AdminUserDto } from "../../../api/adminUsersApi";
import { UserStatusBadge } from "./UserStatusBadge";

type AdminUsersTableProps = {
  users: AdminUserDto[];
  currentUserId: number | null;
  actionLoadingId: number | null;
  onEdit: (user: AdminUserDto) => void;
  onBlock: (user: AdminUserDto) => void;
  onUnblock: (user: AdminUserDto) => void;
  onAnonymize: (user: AdminUserDto) => void;
};

function getInitials(user: AdminUserDto) {
  const firstInitial = user.firstName?.trim().charAt(0) ?? "";

  const lastInitial = user.lastName?.trim().charAt(0) ?? "";

  const initials = `${firstInitial}${lastInitial}`;

  if (initials) {
    return initials.toUpperCase();
  }

  return user.userName.slice(0, 2).toUpperCase();
}

function getFullName(user: AdminUserDto) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") || "Nije uneto"
  );
}

export function AdminUsersTable({
  users,
  currentUserId,
  actionLoadingId,
  onEdit,
  onBlock,
  onUnblock,
  onAnonymize,
}: AdminUsersTableProps) {
  if (users.length === 0) {
    return (
      <div className="admin-users-empty">
        <div className="admin-users-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <span className="admin-users-empty__eyebrow">NEMA REZULTATA</span>

        <h3 className="admin-users-empty__title">
          Nema korisnika za izabrane filtere
        </h3>

        <p className="admin-users-empty__description">
          Promenite pretragu ili izabrani status.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-users-table-wrapper">
      <table className="admin-users-table">
        <thead>
          <tr>
            <th>Korisnik</th>
            <th>Email</th>
            <th>Ime i prezime</th>
            <th>Role</th>
            <th>Status</th>
            <th className="admin-users-table__actions-heading">Akcije</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => {
            const isCurrentUser = currentUserId === user.id;

            const isActionLoading = actionLoadingId === user.id;

            return (
              <tr
                key={user.id}
                className={[
                  user.isBlocked ? "admin-users-table__row--blocked" : "",
                  user.isAnonymized ? "admin-users-table__row--anonymized" : "",
                  isCurrentUser ? "admin-users-table__row--current" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <td>
                  <div className="admin-user-identity">
                    <span className="admin-user-identity__avatar">
                      {getInitials(user)}
                    </span>

                    <div className="admin-user-identity__content">
                      <strong>{user.userName}</strong>

                      {isCurrentUser && (
                        <span className="admin-user-identity__current">
                          Trenutno prijavljen
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                <td>
                  <span className="admin-users-table__email">{user.email}</span>
                </td>

                <td>{getFullName(user)}</td>

                <td>
                  {user.roles.length === 0 ? (
                    <span className="admin-user-no-roles">Nema rola</span>
                  ) : (
                    <div className="admin-user-role-badges">
                      {user.roles.map((role) => (
                        <span
                          key={String(role)}
                          className="admin-user-role-badge"
                        >
                          {String(role)}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                <td>
                  <UserStatusBadge user={user} />
                </td>

                <td>
                  <div className="admin-user-actions">
                    <button
                      type="button"
                      className="admin-user-action admin-user-action--edit"
                      disabled={user.isAnonymized || isActionLoading}
                      onClick={() => onEdit(user)}
                    >
                      Izmeni
                    </button>

                    {user.isBlocked ? (
                      <button
                        type="button"
                        className="admin-user-action admin-user-action--unblock"
                        disabled={user.isAnonymized || isActionLoading}
                        onClick={() => onUnblock(user)}
                      >
                        {isActionLoading ? "Radim..." : "Odblokiraj"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-user-action admin-user-action--block"
                        disabled={
                          user.isAnonymized || isCurrentUser || isActionLoading
                        }
                        title={
                          user.isAnonymized
                            ? "Anonimizovan korisnik ne može biti blokiran."
                            : isCurrentUser
                              ? "Ne možeš blokirati sopstveni nalog."
                              : "Blokiraj korisnika."
                        }
                        onClick={() => onBlock(user)}
                      >
                        {isActionLoading ? "Radim..." : "Blokiraj"}
                      </button>
                    )}

                    <button
                      type="button"
                      className="admin-user-action admin-user-action--anonymize"
                      disabled={
                        user.isAnonymized ||
                        !user.isBlocked ||
                        isCurrentUser ||
                        isActionLoading
                      }
                      title={
                        user.isAnonymized
                          ? "Korisnik je već anonimizovan."
                          : isCurrentUser
                            ? "Ne možeš anonimizovati sopstveni nalog."
                            : !user.isBlocked
                              ? "Korisnik mora prvo biti blokiran."
                              : "Anonimizuj korisnika."
                      }
                      onClick={() => onAnonymize(user)}
                    >
                      Anonimizuj
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
