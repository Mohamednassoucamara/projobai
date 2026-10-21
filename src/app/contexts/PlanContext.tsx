import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { fetchEntitlements, type Entitlements, type Feature } from "../../lib/billing";

interface PlanContextType {
  entitlements: Entitlements | null;
  loading: boolean;
  /** Vrai si la fonctionnalité est incluse (ou si les abonnements ne sont pas encore activés). */
  can: (f: Feature) => boolean;
  isPremium: boolean;
  /** La formule de l'utilisateur connecté a été chargée. */
  ready: boolean;
  refresh: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType>({
  entitlements: null, loading: false, can: () => true, isPremium: false, ready: true, refresh: async () => undefined,
});

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setEntitlements(null); return; }
    setLoading(true);
    setEntitlements(await fetchEntitlements().catch(() => null));
    setLoadedFor(user.email);
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh, user?.email, user?.type]);

  const can = (f: Feature) => (entitlements ? entitlements.features.includes(f) : true);
  const isPremium = Boolean(entitlements && entitlements.features.length > 0);

  const ready = !user || loadedFor === user.email;

  return <PlanContext.Provider value={{ entitlements, loading, can, isPremium, ready, refresh }}>{children}</PlanContext.Provider>;
}

export const usePlan = () => useContext(PlanContext);
