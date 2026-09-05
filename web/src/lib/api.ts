import axios from "axios";

export const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        const isLoginRequest = error.config?.url?.includes("/auth/login");
        const isLoginPage =
          window.location.pathname === "/sign-in" ||
          window.location.pathname === "/login";

        // Prevent redirect loop and allow login page to display bad credentials error
        if (!isLoginRequest && !isLoginPage) {
          window.location.href = "/sign-in";
        }
      }
    }
    return Promise.reject(error);
  }
);
