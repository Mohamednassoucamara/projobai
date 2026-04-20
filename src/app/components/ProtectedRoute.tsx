import { Navigate, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { ReactNode } from "react";
import { motion } from "motion/react";

interface ProtectedRouteProps {
  children: ReactNode;
  type?: "candidate" | "company";
}

export function ProtectedRoute({ children, type }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Afficher un loader pendant la vérification de l'état d'authentification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-[#003087] to-[#0047b3] mb-4 shadow-2xl">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-10 w-10 border-4 border-white border-t-transparent rounded-full"
            />
          </div>
          <p className="text-lg font-semibold text-slate-600">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  // Rediriger vers login si non authentifié
  if (!isAuthenticated) {
    return <Navigate to={`/login?type=${type || "candidate"}&from=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Rediriger vers le bon dashboard si le type d'utilisateur ne correspond pas
  if (type && user?.type !== type) {
    const redirectPath = user?.type === "company" ? "/company/dashboard" : "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
