export default function ErrorAlert({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-center justify-between rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700">
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-4 font-bold">
          &times;
        </button>
      )}
    </div>
  );
}
