import api from "./https";

export type FeedbackMessageType = "Suggestion" | "Problem" | "Praise" | "Other";

export type FeedbackMessageStatus = "New" | "Read" | "Archived";

export interface CreateFeedbackMessageRequest {
  type: FeedbackMessageType;
  message: string;
  pageUrl?: string | null;
  visitorId?: string | null;
  contactEmail?: string | null;
}

export interface CreateFeedbackMessageResponse {
  message: string;
  feedbackId: number;
}

export interface FeedbackMessageDto {
  id: number;
  userId?: number | null;
  visitorId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  contactEmail?: string | null;
  type: FeedbackMessageType;
  message: string;
  pageUrl?: string | null;
  status: FeedbackMessageStatus;
  createdAtUtc: string;
  readAtUtc?: string | null;
  archivedAtUtc?: string | null;
}

export interface FeedbackMessageQueryParams {
  status?: FeedbackMessageStatus;
  type?: FeedbackMessageType;
  includeArchived?: boolean;
  take?: number;
}

export async function createFeedbackMessage(
  data: CreateFeedbackMessageRequest,
) {
  const res = await api.post<CreateFeedbackMessageResponse>("/feedback", data);
  return res.data;
}

export async function getAdminFeedback(params?: FeedbackMessageQueryParams) {
  const res = await api.get<FeedbackMessageDto[]>("/admin/feedback", {
    params,
  });

  return res.data;
}

export async function markFeedbackAsRead(id: number) {
  const res = await api.patch<FeedbackMessageDto>(`/admin/feedback/${id}/read`);

  return res.data;
}

export async function archiveFeedback(id: number) {
  const res = await api.patch<FeedbackMessageDto>(
    `/admin/feedback/${id}/archive`,
  );

  return res.data;
}
