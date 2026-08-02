import type { AdminUserDto } from "../../../api/adminUsersApi";

type UserStatus = {
  label: string;
  modifier: "active" | "blocked" | "anonymized";
};

function getUserStatus(user: AdminUserDto): UserStatus {
  if (user.isAnonymized) {
    return {
      label: "Anonimizovan",
      modifier: "anonymized",
    };
  }

  if (user.isBlocked) {
    return {
      label: "Blokiran",
      modifier: "blocked",
    };
  }

  return {
    label: "Aktivan",
    modifier: "active",
  };
}

export function UserStatusBadge({ user }: { user: AdminUserDto }) {
  const status = getUserStatus(user);

  return (
    <span
      className={[
        "admin-user-status",
        `admin-user-status--${status.modifier}`,
      ].join(" ")}
    >
      <span className="admin-user-status__dot" aria-hidden="true" />

      {status.label}
    </span>
  );
}
