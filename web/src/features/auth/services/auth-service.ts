import { api } from "@/lib/api";
import type { LoginPayload, TokenResponse, User } from "../types";

export const authService = {
  async login(payload: LoginPayload): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>("/auth/login", payload);
    return data;
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<User>("/auth/me");
    if (data && !data.$id) {
      data.$id = String(data.id);
    }
    return data;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },
};
