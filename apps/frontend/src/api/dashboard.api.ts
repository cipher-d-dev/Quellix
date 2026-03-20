import { api } from "./axiosInstance";

export interface DashboardStats {
  projects: number;
  apiKeys: number;
  endUsers: number;
  authEvents: number;
}

export interface RecentProject {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  keyCount: number;
  userCount: number;
}

export interface RecentEvent {
  id: string;
  type: string;
  createdAt: string;
  ipAddress: string | null;
  projectName: string | null;
  userEmail: string | null;
  metadata: Record<string, unknown> | null;
}

interface DashboardStatsRes {
  success: boolean;
  data: {
    stats: DashboardStats;
    recentProjects: RecentProject[];
    recentEvents: RecentEvent[];
  };
}

export const dashboardService = {
  getStats: () => api.get<DashboardStatsRes>("/dashboard/stats"),
};
