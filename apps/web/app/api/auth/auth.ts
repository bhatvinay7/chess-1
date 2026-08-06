import axios from "../../lib/axio";

interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  rating: number;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  requestOtp: async (email: string) => {
    const response = await axios.post("/auth/request-otp", { email });
    return response.data as { message: string };
  },

  verifyOtp: async (email: string, otp: string, username?: string) => {
    const response = await axios.post("/auth/verify-otp", { email, otp, username });
    return response.data as AuthResponse;
  },

  loginWithPassword: async (email: string, password: string) => {
    const response = await axios.post("/auth/login-password", { email, password });
    return response.data as AuthResponse;
  },

  signupVerifyOtp: async (email: string, otp: string, username: string, password: string) => {
    const response = await axios.post("/auth/signup-verify", { email, otp, username, password });
    return response.data as AuthResponse;
  },

  requestPasswordReset: async (email: string) => {
    const response = await axios.post("/auth/reset-password/request", { email });
    return response.data as { message: string };
  },

  resetPassword: async (email: string, otp: string, newPassword: string) => {
    const response = await axios.post("/auth/reset-password/confirm", { email, otp, newPassword });
    return response.data as { message: string };
  },

  loginWithGoogle: async (idToken: string) => {
    const response = await axios.post("/auth/google", { idToken });
    return response.data as AuthResponse;
  },
};
