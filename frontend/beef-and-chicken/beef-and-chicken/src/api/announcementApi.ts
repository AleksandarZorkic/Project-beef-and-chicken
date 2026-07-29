import api from "./https";

export type AnnouncementType =
  | "Info"
  | "Important"
  | "Promotion"
  | "NewItem"
  | "Holiday"
  | "Delivery";

export type AnnouncementDto = {
  id: number;
  title: string;
  content: string;
  type: AnnouncementType;
  isActive: boolean;
  isPinned: boolean;
  startsAt: string;
  endsAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type CreateAnnouncementRequest = {
  title: string;
  content: string;
  type: AnnouncementType;
  isActive: boolean;
  isPinned: boolean;
  startsAt: string;
  endsAt?: string | null;
};

export type UpdateAnnouncementRequest = CreateAnnouncementRequest;

const ADMIN_ANNOUNCEMENTS_ENDPOINT = "/admin/announcements";

export async function getActiveAnnouncements() {
  const response = await api.get<AnnouncementDto[]>("/announcements/active");

  return response.data;
}

export async function getAdminAnnouncements() {
  const response = await api.get<AnnouncementDto[]>(
    ADMIN_ANNOUNCEMENTS_ENDPOINT,
  );

  return response.data;
}

export async function createAnnouncement(data: CreateAnnouncementRequest) {
  const response = await api.post<AnnouncementDto>(
    ADMIN_ANNOUNCEMENTS_ENDPOINT,
    data,
  );

  return response.data;
}

export async function updateAnnouncement(
  id: number,
  data: UpdateAnnouncementRequest,
) {
  const response = await api.put<AnnouncementDto>(
    `${ADMIN_ANNOUNCEMENTS_ENDPOINT}/${id}`,
    data,
  );

  return response.data;
}

export async function activateAnnouncement(id: number) {
  await api.patch(`${ADMIN_ANNOUNCEMENTS_ENDPOINT}/${id}/activate`);
}

export async function deactivateAnnouncement(id: number) {
  await api.patch(`${ADMIN_ANNOUNCEMENTS_ENDPOINT}/${id}/deactivate`);
}

export async function deleteAnnouncement(id: number) {
  await api.delete(`${ADMIN_ANNOUNCEMENTS_ENDPOINT}/${id}`);
}
