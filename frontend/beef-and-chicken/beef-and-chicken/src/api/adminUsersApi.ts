import api from "./https";
import type { AppRole } from "../auth/roles";

export type AdminUserDto = {
  id: number;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;

  isBlocked: boolean;
  blockedAt?: string | null;
  blockReason?: string | null;

  isAnonymized: boolean;
  anonymizedAt?: string | null;

  roles: AppRole[];
};

export type PagedResultDto<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type AdminUsersGroup = "all" | "staff" | "customers";
export type AdminUsersStatus = "all" | "active" | "blocked" | "anonymized";

export type AdminUsersQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  group?: AdminUsersGroup;
  status?: AdminUsersStatus;
};

export type CreateUserByAdminRequest = {
  email: string;
  userName: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: AppRole[];
};

export type UpdateUserByAdminRequest = {
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
};

export type UpdateUserRolesRequest = {
  roles: AppRole[];
};

const ADMIN_USERS_ENDPOINT = "/admin/users";

export async function getAdminUsers(query: AdminUsersQuery) {
  const response = await api.get<PagedResultDto<AdminUserDto>>(
    ADMIN_USERS_ENDPOINT,
    {
      params: query,
    },
  );

  return response.data;
}

export async function getAdminUserById(id: number) {
  const response = await api.get<AdminUserDto>(`${ADMIN_USERS_ENDPOINT}/${id}`);
  return response.data;
}

export async function createUserByAdmin(data: CreateUserByAdminRequest) {
  const response = await api.post<AdminUserDto>(ADMIN_USERS_ENDPOINT, data);
  return response.data;
}

export async function updateUserByAdmin(
  id: number,
  data: UpdateUserByAdminRequest,
) {
  const response = await api.put<AdminUserDto>(
    `${ADMIN_USERS_ENDPOINT}/${id}`,
    data,
  );

  return response.data;
}

export async function updateUserRoles(
  id: number,
  data: UpdateUserRolesRequest,
) {
  const response = await api.patch<AdminUserDto>(
    `${ADMIN_USERS_ENDPOINT}/${id}/roles`,
    data,
  );

  return response.data;
}

export async function blockUser(id: number) {
  await api.patch(`${ADMIN_USERS_ENDPOINT}/${id}/block`);
}

export async function unblockUser(id: number) {
  await api.patch(`${ADMIN_USERS_ENDPOINT}/${id}/unblock`);
}

export async function anonymizeUser(id: number) {
  const response = await api.patch<AdminUserDto>(
    `${ADMIN_USERS_ENDPOINT}/${id}/anonymize`,
  );

  return response.data;
}
