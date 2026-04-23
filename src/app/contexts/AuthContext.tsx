
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { authService } from "../../services/supabase.service";

interface User {
  name: string;
  email: string;
  type: "candidate" | "company";
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, type: "candidate" | "company") => Promise<boolean>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, type: "candidate" | "company") => Promise<{ success: boolean; error?: string }>;
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, type: "candidate" | "company"): Promise<boolean> => {
    try {
      if (!email || !password) return false;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) return false;
      setUser({
        name: data.user.user_metadata?.full_name || data.user.email,
        email: data.user.email,
        type: data.user.user_metadata?.user_type || type,
      });
      return true;
    } catch {
      return false;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    type: "candidate" | "company"
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authService.signUp(email, password, fullName, type);
      if (!result.success) {
        const err = result.error as any;
        return { success: false, error: err?.message || "Erreur lors de la création du compte" };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Une erreur est survenue" };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem("cvData");
    } catch {
      // silent
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signUp, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
