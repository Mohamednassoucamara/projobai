import { useRouteError, isRouteErrorResponse, Link } from "react-router";

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText || error.data?.message
    : error instanceof Error
      ? error.message
      : "Une erreur inattendue est survenue.";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-lg border border-slate-200 text-center">
        <h1 className="text-2xl font-bold text-[#003087] mb-3">Erreur</h1>
        <p className="text-slate-600 mb-6 text-sm">{message}</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center w-full bg-[#003087] text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
