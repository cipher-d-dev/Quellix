import { api } from "./axiosInstance";

export interface TeamMember {
  id: string;
  role: string;
  joinedAt: string;
  developer: {
    id: string;
    fullName: string | null;
    email: string;
    username: string | null;
    avatarUrl: string | null;
  };
}

export interface TeamInvite {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

export interface Membership {
  id: string;
  role: string;
  joinedAt: string;
  workspace: {
    id: string;
    fullName: string | null;
    email: string;
    username: string | null;
    avatarUrl: string | null;
  };
}

export interface InviteInfo {
  email: string;
  role: string;
  expiresAt: string;
  owner: {
    fullName: string | null;
    email: string;
    username: string | null;
    avatarUrl: string | null;
  };
}

interface MembersRes {
  success: boolean;
  data: { members: TeamMember[] };
}

interface InvitesRes {
  success: boolean;
  data: { invites: TeamInvite[] };
}

interface InviteRes {
  success: boolean;
  message: string;
  data: { invite: TeamInvite };
}

interface InviteInfoRes {
  success: boolean;
  data: { invite: InviteInfo };
}

interface OkRes {
  success: boolean;
  message: string;
}

export const teamService = {
  listMembers: (workspace?: string) =>
    api.get<MembersRes>("/team/members", {
      params: workspace ? { workspace } : undefined,
    }),

  listInvites: (workspace?: string) =>
    api.get<InvitesRes>("/team/invites", {
      params: workspace ? { workspace } : undefined,
    }),

  sendInvite: (data: { email: string; role: "member" | "admin" }) =>
    api.post<InviteRes>("/team/invites", data),

  listMemberships: () =>
    api.get<{ success: boolean; data: { memberships: Membership[] } }>(
      "/team/memberships",
    ),

  cancelInvite: (id: string) => api.delete<OkRes>(`/team/invites/${id}`),

  removeMember: (id: string) => api.delete<OkRes>(`/team/members/${id}`),

  getInviteInfo: (token: string) =>
    api.get<InviteInfoRes>("/team/invites/info", { params: { token } }),

  acceptInvite: (token: string) =>
    api.post<OkRes>("/team/invites/accept", { token }),
};
