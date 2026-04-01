import { useCallback, useEffect, useState } from "react";
import { productApi } from "../api/products";

export function useProducts(initialParams = {}) {
  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productApi.list(params);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { data, loading, error, params, setParams, refetch: fetchProducts };
}
