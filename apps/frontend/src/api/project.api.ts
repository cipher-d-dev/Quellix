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
  list: () => api.get<ProjectListRes>("/project"),

  create: (data: { name: string }) => api.post<ProjectRes>("/project", data),

  update: (id: string, data: { name?: string }) =>
    api.patch<ProjectRes>(`/project/${id}`, data),

  delete: (id: string) => api.delete<OkRes>(`/project/${id}`),
};
