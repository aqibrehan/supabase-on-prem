import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { productApi } from "../api/products";
import ErrorAlert from "../components/ErrorAlert";
import Pagination from "../components/Pagination";
import Spinner from "../components/Spinner";
import { useProducts } from "../hooks/useProducts";

export default function ProductListPage() {
  const navigate = useNavigate();
  const { data, loading, error, params, setParams, refetch } = useProducts({
    page: 1,
    page_size: 10,
  });
  const [search, setSearch] = useState("");
  const [deleteError, setDeleteError] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    setParams((prev) => ({ ...prev, search: search || undefined, page: 1 }));
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    setDeleteError(null);
    try {
      await productApi.delete(id);
      refetch();
    } catch (err) {
      setDeleteError(err.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Products</h2>
        <button
          onClick={() => navigate("/products/new")}
          className="rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
        >
          + Add Product
        </button>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-gray-800 px-4 py-2 text-white hover:bg-gray-900"
        >
          Search
        </button>
      </form>

      <ErrorAlert message={error || deleteError} onDismiss={() => setDeleteError(null)} />

      {loading ? (
        <Spinner />
      ) : data.items.length === 0 ? (
        <p className="py-12 text-center text-gray-500">No products found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Created</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-600">
                    {product.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">${product.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {new Date(product.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => navigate(`/products/${product.id}/edit`)}
                      className="mr-2 text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={data.page}
        totalPages={data.total_pages}
        onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
      />

      <p className="mt-2 text-center text-xs text-gray-400">
        {data.total} total product{data.total !== 1 && "s"}
      </p>
    </div>
  );
}
