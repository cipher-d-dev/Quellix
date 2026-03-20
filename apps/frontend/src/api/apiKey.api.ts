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
  data: {
    key: string; // plaintext — returned once only
    apiKey: ApiKey;
  };
}

interface OkRes {
  success: boolean;
  message: string;
}

export const apiKeyService = {
  list: (projectId?: string) =>
    api.get<ApiKeyListRes>("/api-key", {
      params: projectId ? { projectId } : undefined,
    }),

  create: (data: {
    projectId: string;
    name: string;
    type: "PUBLISHABLE" | "SECRET";
  }) => api.post<ApiKeyCreateRes>("/api-key", data),

  revoke: (id: string) => api.delete<OkRes>(`/api-key/${id}`),
};
