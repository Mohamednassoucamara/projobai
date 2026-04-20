
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../../lib/supabase";

interface User {
  name: string;
  email: string;
  type: "candidate" | "company";
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, type: "candidate" | "company") => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (data.session && data.session.user) {
        // Récupérer le profil utilisateur depuis Supabase si besoin
        setUser({
          name: data.session.user.user_metadata?.full_name || data.session.user.email,
          email: data.session.user.email,
          type: data.session.user.user_metadata?.user_type || "candidate",
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };
    getSession();
    // Écouter les changements de session
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user) {
        setUser({
          name: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          type: session.user.user_metadata?.user_type || "candidate",
        });
      } else {
        setUser(null);
      }
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, type: "candidate" | "company"): Promise<boolean> => {
    try {
      if (!email || !password) return false;
      // Authentification via Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.session) {
        return false;
      }
      // Mettre à jour le profil utilisateur local
      setUser({
        name: data.user.user_metadata?.full_name || data.user.email,
        email: data.user.email,
        type: data.user.user_metadata?.user_type || type,
      });
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem("cvData");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
