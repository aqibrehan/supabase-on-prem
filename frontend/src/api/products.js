import client from "./client";

export const productApi = {
  list(params = {}) {
    return client.get("/products", { params });
  },

  getById(id) {
    return client.get(`/products/${id}`);
  },

  create(data) {
    return client.post("/products", data);
  },

  update(id, data) {
    return client.patch(`/products/${id}`, data);
  },

  delete(id) {
    return client.delete(`/products/${id}`);
  },
};
