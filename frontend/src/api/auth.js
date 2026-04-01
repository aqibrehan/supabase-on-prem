import client from "./client";

export const authApi = {
  register(email, password) {
    return client.post("/auth/register", { email, password });
  },

  login(email, password) {
    return client.post("/auth/login", { email, password });
  },
};
