import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
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

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

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

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

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
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/" /> : <Login />}
      </Route>
      <Route path="/">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/products">
        <ProtectedRoute><Products /></ProtectedRoute>
      </Route>
      <Route path="/orders">
        <ProtectedRoute><Orders /></ProtectedRoute>
      </Route>
      <Route path="/marketing">
        <ProtectedRoute><Marketing /></ProtectedRoute>
      </Route>
      <Route path="/top-products">
        <ProtectedRoute><TopProducts /></ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute><Reports /></ProtectedRoute>
      </Route>
      <Route path="/inventory">
        <ProtectedRoute><Inventory /></ProtectedRoute>
      </Route>
      <Route path="/notifications">
        <ProtectedRoute><Notifications /></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute><Settings /></ProtectedRoute>
      </Route>
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
