import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
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
  signUp: (email: string, password: string, fullName: string, type: "candidate" | "company") => Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }>;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSigningUp: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const isSigningUpRef = useRef(false);

  const applySession = (session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
    if (session?.user) {
      setUser({
        name: (session.user.user_metadata?.full_name as string) || session.user.email || "",
        email: session.user.email || "",
        type: (session.user.user_metadata?.user_type as "candidate" | "company") || "candidate",
      });
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isSigningUpRef.current) {
        applySession(data.session);
      }
      setIsLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isSigningUpRef.current) return;
      applySession(session);
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
      // Remove legacy localStorage CV data if any
      localStorage.removeItem("cvData");
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
  ): Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }> => {
    isSigningUpRef.current = true;
    setIsSigningUp(true);
    setUser(null);
    try {
      const result = await authService.signUp(email, password, fullName, type);
      if (!result.success) {
        return {
          success: false,
          error: result.error || "Erreur lors de la création du compte",
        };
      }
      setUser(null);
      return {
        success: true,
        needsEmailConfirmation: result.needsEmailConfirmation,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      return { success: false, error: message };
    } finally {
      isSigningUpRef.current = false;
      setIsSigningUp(false);
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
    <AuthContext.Provider value={{ user, login, logout, signUp, isAuthenticated: !!user, isLoading, isSigningUp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
