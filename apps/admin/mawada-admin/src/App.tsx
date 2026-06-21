import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Orders from "@/pages/Orders";
import Marketing from "@/pages/Marketing";
import TopProducts from "@/pages/TopProducts";
import Reports from "@/pages/Reports";
import Inventory from "@/pages/Inventory";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Layout from "@/components/Layout";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <Layout>{children}</Layout>;
}

function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) return null;

  return <Login />;
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={() => <ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/products" component={() => <ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/orders" component={() => <ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/marketing" component={() => <ProtectedRoute><Marketing /></ProtectedRoute>} />
      <Route path="/top-products" component={() => <ProtectedRoute><TopProducts /></ProtectedRoute>} />
      <Route path="/reports" component={() => <ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/inventory" component={() => <ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/notifications" component={() => <ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/settings" component={() => <ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter>
            <AppRoutes />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
