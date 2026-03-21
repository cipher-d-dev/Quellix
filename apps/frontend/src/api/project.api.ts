import { api } from "./axiosInstance";

export interface Project {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  keyCount: number;
  userCount: number;
}

interface ProjectListRes {
  success: boolean;
  data: { projects: Project[] };
}
interface ProjectRes {
  success: boolean;
  message: string;
  data: { project: Project };
}
interface OkRes {
  success: boolean;
  message: string;
}

export const projectService = {
  list: (workspace?: string) =>
    api.get<ProjectListRes>("/project", {
      params: workspace ? { workspace } : undefined,
    }),

  create: (data: { name: string }, workspace?: string) =>
    api.post<ProjectRes>("/project", { ...data, workspace }),

  update: (id: string, data: { name?: string }, workspace?: string) =>
    api.patch<ProjectRes>(`/project/${id}`, { ...data, workspace }),

  delete: (id: string, workspace?: string) =>
    api.delete<OkRes>(`/project/${id}`, {
      data: workspace ? { workspace } : undefined,
    }),
};
