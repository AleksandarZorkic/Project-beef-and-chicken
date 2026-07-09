import type { AdminUserDto } from "../../../api/adminUsersApi";

function getUserStatusLabel(user: AdminUserDto) {
  if (user.isAnonymized) return "Anonimizovan";
  if (user.isBlocked) return "Blokiran";
  return "Aktivan";
}

function getUserStatusColor(user: AdminUserDto) {
  if (user.isAnonymized) return "#777";
  if (user.isBlocked) return "crimson";
  return "green";
}

export function UserStatusBadge({ user }: { user: AdminUserDto }) {
  return (
    <strong style={{ color: getUserStatusColor(user) }}>
      {getUserStatusLabel(user)}
    </strong>
  );
}
