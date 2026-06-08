import type {
  QuelixClientConfig,
  ApiResponse,
  SignUpInput,
  SignInInput,
  UpdateUserInput,
  RegisterResponse,
  SignInResponse,
  GetSessionResponse,
  RefreshResponse,
  GetMeResponse,
  UpdateUserResponse,
  ListUsersResponse,
} from "@quellix/types";

// ============================================================================
// SDK HTTP Client
// ============================================================================

export class QuelixClient {
  private publishableKey: string;
  private apiUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private debug: boolean = false;

  constructor(config: QuelixClientConfig) {
    this.publishableKey = config.publishableKey;
    this.apiUrl = config.apiUrl || "http://localhost:8080";
    this.debug = config.debug ?? false;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (this.debug) console.log("[Quellix] Tokens set");
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (this.debug) console.log("[Quellix] Tokens cleared");
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  private getHeaders(useAccessToken: boolean = true): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (useAccessToken && this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    } else if (!useAccessToken) {
      headers["Authorization"] = `Bearer ${this.publishableKey}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json() as ApiResponse<T>;

    if (!response.ok) {
      if (this.debug) {
        console.error("[Quellix] API Error:", data);
      }
      throw new Error(data.error || "Request failed");
    }

    return data;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    useAccessToken: boolean = true
  ): Promise<ApiResponse<T>> {
    const url = `${this.apiUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.getHeaders(useAccessToken),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    if (this.debug) {
      console.log(`[Quellix] ${method} ${path}`);
    }

    try {
      const response = await fetch(url, options);
      return this.handleResponse<T>(response);
    } catch (error) {
      if (this.debug) {
        console.error("[Quellix] Request error:", error);
      }
      throw error;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Public Methods
  // ────────────────────────────────────────────────────────────────────────

  async register(
    input: SignUpInput
  ): Promise<ApiResponse<RegisterResponse>> {
    return this.request(
      "POST",
      "/sdk/auth/register",
      input,
      false
    );
  }

  async signIn(
    input: SignInInput
  ): Promise<ApiResponse<SignInResponse>> {
    return this.request(
      "POST",
      "/sdk/auth/signin",
      input,
      false
    );
  }

  async signOut(refreshToken?: string): Promise<ApiResponse<{}>> {
    return this.request(
      "POST",
      "/sdk/auth/signout",
      { refreshToken },
      true
    );
  }

  async refresh(
    refreshToken: string
  ): Promise<ApiResponse<RefreshResponse>> {
    return this.request(
      "POST",
      "/sdk/auth/refresh",
      { refreshToken },
      false
    );
  }

  async getSession(): Promise<ApiResponse<GetSessionResponse>> {
    return this.request(
      "GET",
      "/sdk/auth/session",
      undefined,
      true
    );
  }

  async verifyToken(token: string): Promise<ApiResponse<{ valid: boolean }>> {
    return this.request(
      "POST",
      "/sdk/auth/token/verify",
      { token },
      false
    );
  }

  // User endpoints
  async getMe(): Promise<ApiResponse<GetMeResponse>> {
    return this.request(
      "GET",
      "/sdk/user/me",
      undefined,
      true
    );
  }

  async updateMe(
    input: UpdateUserInput
  ): Promise<ApiResponse<UpdateUserResponse>> {
    return this.request(
      "PATCH",
      "/sdk/user/me",
      input,
      true
    );
  }

  async deleteMe(password: string): Promise<ApiResponse<{}>> {
    return this.request(
      "DELETE",
      "/sdk/user/me",
      { password },
      true
    );
  }

  async listUsers(
    limit: number = 20,
    cursor?: string
  ): Promise<ApiResponse<ListUsersResponse>> {
    const params = new URLSearchParams();
    params.append("limit", String(Math.min(limit, 100)));
    if (cursor) params.append("cursor", cursor);

    return this.request(
      "GET",
      `/sdk/users?${params.toString()}`,
      undefined,
      true
    );
  }

  async getUser(id: string): Promise<ApiResponse<GetMeResponse>> {
    return this.request(
      "GET",
      `/sdk/users/${id}`,
      undefined,
      true
    );
  }

  async updateUser(
    id: string,
    input: UpdateUserInput
  ): Promise<ApiResponse<UpdateUserResponse>> {
    return this.request(
      "PATCH",
      `/sdk/users/${id}`,
      input,
      true
    );
  }

  async deleteUser(id: string): Promise<ApiResponse<{}>> {
    return this.request(
      "DELETE",
      `/sdk/users/${id}`,
      undefined,
      true
    );
  }

  async revokeUserSessions(id: string): Promise<ApiResponse<{}>> {
    return this.request(
      "DELETE",
      `/sdk/users/${id}/sessions`,
      undefined,
      true
    );
  }

  // Email verification
  async sendEmailVerification(): Promise<ApiResponse<{}>> {
    return this.request(
      "POST",
      "/sdk/auth/email/verify/send",
      {},
      true
    );
  }

  async confirmEmailVerification(code: string): Promise<ApiResponse<{}>> {
    return this.request(
      "POST",
      "/sdk/auth/email/verify/confirm",
      { code },
      true
    );
  }

  // Email change
  async requestEmailChange(newEmail: string): Promise<ApiResponse<{}>> {
    return this.request(
      "POST",
      "/sdk/auth/email/change",
      { newEmail },
      true
    );
  }

  async confirmEmailChange(code: string): Promise<ApiResponse<{}>> {
    return this.request(
      "POST",
      "/sdk/auth/email/change/confirm",
      { code },
      true
    );
  }

  // Password management
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<{}>> {
    return this.request(
      "POST",
      "/sdk/auth/password/change",
      { currentPassword, newPassword },
      true
    );
  }

  async requestPasswordReset(email: string): Promise<ApiResponse<{}>> {
    return this.request(
      "POST",
      "/sdk/auth/password/reset",
      { email },
      false
    );
  }

  async confirmPasswordReset(
    code: string,
    newPassword: string
  ): Promise<ApiResponse<{}>> {
    return this.request(
      "POST",
      "/sdk/auth/password/reset/confirm",
      { code, newPassword },
      false
    );
  }
}
