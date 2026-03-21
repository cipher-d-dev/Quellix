import { api } from "./axiosInstance";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  type: "PUBLISHABLE" | "SECRET";
  lastUsedAt: string | null;
  createdAt: string;
  projectId: string;
  projectName: string;
}

interface ApiKeyListRes {
  success: boolean;
  data: { apiKeys: ApiKey[] };
}
interface ApiKeyCreateRes {
  success: boolean;
  message: string;
  data: { key: string; apiKey: ApiKey };
}
interface OkRes {
  success: boolean;
  message: string;
}

export const apiKeyService = {
  list: (projectId?: string, workspace?: string) =>
    api.get<ApiKeyListRes>("/api-key", {
      params: {
        ...(projectId ? { projectId } : {}),
        ...(workspace ? { workspace } : {}),
      },
    }),

  create: (
    data: { projectId: string; name: string; type: "PUBLISHABLE" | "SECRET" },
    workspace?: string,
  ) => api.post<ApiKeyCreateRes>("/api-key", { ...data, workspace }),

  revoke: (id: string, workspace?: string) =>
    api.delete<OkRes>(`/api-key/${id}`, {
      data: workspace ? { workspace } : undefined,
    }),
};
