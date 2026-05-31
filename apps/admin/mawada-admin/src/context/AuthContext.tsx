import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type AdminRole = "ADMIN" | "CUSTOMER";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: AdminRole;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<AdminUser | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, phone, role")
      .eq("id", userId)
      .single();

    if (error) return null;
    return data as AdminUser;
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);

    const profile = await fetchProfile(data.user.id);

    if (!profile) {
      await supabase.auth.signOut();
      throw new Error("حسابك غير موجود في النظام");
    }

    if (profile.role !== "ADMIN") {
      await supabase.auth.signOut();
      throw new Error("ليس لديك صلاحية الدخول للوحة الإدارة");
    }

    setUser(profile);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (!cancelled) {
          if (profile?.role === "ADMIN") {
            setUser(profile);
          } else {
            setUser(null);
          }
        }
      }
      if (!cancelled) setLoading(false);
    };

    checkSession();

    return () => { cancelled = true; };
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
