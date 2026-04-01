import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { productApi } from "../api/products";
import ErrorAlert from "../components/ErrorAlert";
import Spinner from "../components/Spinner";

const EMPTY_FORM = { name: "", description: "", price: "" };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required";
  if (form.name.length > 255) errors.name = "Name must be under 255 characters";
  if (!form.price || Number(form.price) <= 0) errors.price = "Price must be greater than 0";
  if (Number(form.price) > 999999.99) errors.price = "Price must be under 1,000,000";
  return errors;
}

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await productApi.getById(id);
        setForm({
          name: res.data.name,
          description: res.data.description || "",
          price: String(res.data.price),
        });
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load product");
      } finally {
        setFetching(false);
      }
    })();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price),
    };

    try {
      if (isEdit) {
        await productApi.update(id, payload);
      } else {
        await productApi.create(payload);
      }
      navigate("/products");
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <Spinner />;

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-6 text-2xl font-bold">{isEdit ? "Edit Product" : "New Product"}</h2>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className={`w-full rounded border px-3 py-2 focus:outline-none focus:ring-1 ${
              fieldErrors.name
                ? "border-red-400 focus:ring-red-400"
                : "border-gray-300 focus:ring-indigo-500"
            }`}
            placeholder="Product name"
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            rows={4}
            value={form.description}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Optional description"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Price *</label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            value={form.price}
            onChange={handleChange}
            className={`w-full rounded border px-3 py-2 focus:outline-none focus:ring-1 ${
              fieldErrors.price
                ? "border-red-400 focus:ring-red-400"
                : "border-gray-300 focus:ring-indigo-500"
            }`}
            placeholder="0.00"
          />
          {fieldErrors.price && <p className="mt-1 text-xs text-red-500">{fieldErrors.price}</p>}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="rounded border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
