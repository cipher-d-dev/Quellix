import { api } from "./axiosInstance";

export interface Developer {
  id: string;
  fullName: string | null;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  authProvider: "email" | "github" | "both";
}

interface AuthRes {
  success: boolean;
  message: string;
  data: { accessToken: string; developer: Developer };
}
interface OkRes {
  success: boolean;
  message: string;
}
interface DevRes {
  success: boolean;
  data: { developer: Developer };
}

// Returned when register() hits an ACCOUNT_LINKABLE collision
export interface LinkableRes {
  success: false;
  code: "ACCOUNT_LINKABLE";
  message: string;
}

export const authService = {
  register: (p: {
    email: string;
    password: string;
    fullName?: string;
    username?: string;
  }) => api.post<AuthRes>("/auth/register", p),

  login: (p: { email: string; password: string }) =>
    api.post<AuthRes>("/auth/login", p),

  logout: () => api.post<OkRes>("/auth/logout"),

  refresh: () => api.post<AuthRes>("/auth/refresh"),

  linkPassword: (p: { email: string; code: string }) =>
    api.post<AuthRes>("/auth/link-password", p),

  verifyEmail: (p: {
    type: string;
    email: string;
    code: string;
    projectId?: string;
  }) => api.post<OkRes>("/auth/verify-email", p),

  resendVerification: (p: {
    type: string;
    email: string;
    projectId?: string;
  }) => api.post<OkRes>("/auth/resend-verification", p),

  forgotPassword: (p: { email: string }) =>
    api.post<OkRes>("/auth/forgot-password", p),

  resetPassword: (p: { email: string; code: string; password: string }) =>
    api.post<OkRes>("/auth/reset-password", p),
};

export const developerService = {
  getMe: () => api.get<DevRes>("/developer/me"),

  updateProfile: (p: { fullName?: string; username?: string }) =>
    api.patch<DevRes>("/developer/profile", p),

  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return api.post<DevRes>("/developer/avatar", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deleteAvatar: () => api.delete<DevRes>("/developer/avatar"),

  changePassword: (p: { currentPassword: string; newPassword: string }) =>
    api.post<OkRes>("/developer/change-password", p),

  deleteAccount: (p: { password?: string }) =>
    api.delete<OkRes>("/developer/account", { data: p }),
};
