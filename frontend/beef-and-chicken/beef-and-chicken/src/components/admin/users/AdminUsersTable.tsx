import type { AdminUserDto } from "../../../api/adminUsersApi";
import { UserStatusBadge } from "./UserStatusBadge";

type AdminUsersTableProps = {
  users: AdminUserDto[];
  currentUserId: number | null;
  onEdit: (user: AdminUserDto) => void;
  onBlock: (user: AdminUserDto) => void;
  onUnblock: (user: AdminUserDto) => void;
};

export function AdminUsersTable({
  users,
  currentUserId,
  onEdit,
  onBlock,
  onUnblock,
}: AdminUsersTableProps) {
  if (users.length === 0) {
    return <div>Nema korisnika za izabrane filtere.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={cellHeaderStyle}>Korisnik</th>
            <th style={cellHeaderStyle}>Email</th>
            <th style={cellHeaderStyle}>Ime i prezime</th>
            <th style={cellHeaderStyle}>Role</th>
            <th style={cellHeaderStyle}>Status</th>
            <th style={cellHeaderStyle}>Akcije</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => {
            const isCurrentUser = currentUserId === user.id;

            return (
              <tr
                key={user.id}
                style={{
                  background: user.isBlocked ? "#fff2f2" : "white",
                  opacity: user.isAnonymized ? 0.75 : 1,
                }}
              >
                <td style={cellStyle}>
                  <strong>{user.userName}</strong>

                  {isCurrentUser && (
                    <div style={{ color: "#777", fontSize: 12 }}>
                      Trenutno prijavljen
                    </div>
                  )}
                </td>

                <td style={cellStyle}>{user.email}</td>

                <td style={cellStyle}>
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    "Nije uneto"}
                </td>

                <td style={cellStyle}>
                  {user.roles.length === 0
                    ? "Nema rola"
                    : user.roles.join(", ")}
                </td>

                <td style={cellStyle}>
                  <UserStatusBadge user={user} />
                </td>

                <td style={cellStyle}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={user.isAnonymized}
                      onClick={() => onEdit(user)}
                    >
                      Izmeni
                    </button>

                    {user.isBlocked ? (
                      <button
                        type="button"
                        disabled={user.isAnonymized}
                        onClick={() => onUnblock(user)}
                      >
                        Odblokiraj
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={user.isAnonymized}
                        onClick={() => onBlock(user)}
                      >
                        Blokiraj
                      </button>
                    )}
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

const cellHeaderStyle: React.CSSProperties = {
  borderBottom: "1px solid #ddd",
  padding: 8,
  textAlign: "left",
};

const cellStyle: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: 8,
  verticalAlign: "top",
};
