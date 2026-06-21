import { useState, useEffect, useCallback, ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import CommandPalette from "./CommandPalette";
import PageTransition from "./PageTransition";
import BottomNav from "./BottomNav";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex h-dvh bg-background overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.03),transparent_50%)]" />
      <Sidebar open={isDesktop || sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0 relative">
        <Header onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} onCmdOpen={() => setCmdOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 scrollbar-thin overscroll-contain">
          <PageTransition>{children}</PageTransition>
        </main>
        <BottomNav />
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
