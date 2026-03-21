import { api } from "./axiosInstance";

export type NotificationType =
  | "TEAM_INVITE"
  | "TEAM_ACCEPTED"
  | "ANNOUNCEMENT"
  | "SYSTEM";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface NotificationListRes {
  success: boolean;
  data: { notifications: Notification[]; unreadCount: number };
}

interface NotificationPageRes {
  success: boolean;
  data: {
    notifications: Notification[];
    pagination: NotificationPagination;
    unreadCount: number;
  };
}

interface OkRes {
  success: boolean;
}

export const notificationService = {
  list: () => api.get<NotificationListRes>("/notifications"),

  listPaginated: (page = 1) =>
    api.get<NotificationPageRes>(`/notifications/paginated?page=${page}`),

  markRead: (id: string) => api.patch<OkRes>(`/notifications/${id}/read`),

  markAllRead: () => api.patch<OkRes>("/notifications/read-all"),

  delete: (id: string) => api.delete<OkRes>(`/notifications/${id}`),

  deleteAll: () => api.delete<OkRes>("/notifications"),
};
