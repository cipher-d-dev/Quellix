import { api } from "./axiosInstance";

export interface Developer {
  id: string;
  fullName: string | null;
  email: string;
  username: string | null;
  emailVerified: boolean;
}

interface AuthRes {
  success: boolean;
  message: string;
  data: { developer: Developer; accessToken: string };
}
interface RefreshRes {
  success: boolean;
  message: string;
  data: { developer: Developer; accessToken: string };
}
interface OkRes {
  success: boolean;
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
  refresh: () => api.post<RefreshRes>("/auth/refresh"),
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
