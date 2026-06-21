import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Palette,
  TrendingUp,
  BarChart3,
  PackageSearch,
  Bell,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/products", label: "المنتجات", icon: Package },
  { href: "/orders", label: "الطلبات", icon: ShoppingCart },
  { href: "/top-products", label: "الأكثر مبيعاً", icon: TrendingUp },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/inventory", label: "المخزون", icon: PackageSearch },
  { href: "/marketing", label: "التسويق", icon: Palette },
  { href: "/notifications", label: "الإشعارات", icon: Bell },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024
  );

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!open) return;
    const touch = e.touches[0];
    (e.currentTarget as HTMLElement).dataset.touchStartX = String(touch.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!open) return;
    const touch = e.touches[0];
    const startX = Number((e.currentTarget as HTMLElement).dataset.touchStartX || touch.clientX);
    const diff = touch.clientX - startX;
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -150));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!open) return;
    if (swipeOffset < -50) {
      onClose();
    }
    setSwipeOffset(0);
  };

  useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const showSidebar = isDesktop || mounted;

  if (!showSidebar) return null;

  return (
    <>
      {/* Backdrop overlay - only on mobile */}
      {!isDesktop && (
        <div
          className={cn(
            "fixed inset-0 z-20 transition-all duration-500",
            open
              ? "bg-black/60 backdrop-blur-sm opacity-100"
              : "bg-black/0 backdrop-blur-none opacity-0 pointer-events-none"
          )}
          style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          isDesktop
            ? "lg:static inset-y-0 right-0 z-30 w-[260px]"
            : "fixed inset-y-0 right-0 z-30 w-[280px]",
          "bg-[#0a0f1a] text-white flex flex-col",
          "will-change-transform",
          !open && !isDesktop && "pointer-events-none"
        )}
        style={
          isDesktop
            ? undefined
            : {
                transition: "transform 500ms cubic-bezier(0.16, 1, 0.3, 1), opacity 500ms cubic-bezier(0.16, 1, 0.3, 1)",
                transform: open
                  ? "translateX(0)"
                  : swipeOffset
                    ? `translateX(${swipeOffset}px)`
                    : "translateX(-110%)",
                opacity: open ? 1 : 0,
              }
        }
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Logo */}
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-gradient-to-br from-[#008060] to-[#006f52] shadow-lg shadow-[#008060]/20">
                <span className="text-white font-bold text-sm">م</span>
              </div>
              <div>
                <h1 className="text-[13px] font-semibold text-white/90 tracking-wide">مودة فون</h1>
                <p className="text-[10px] text-white/25 font-medium tracking-wide">لوحة الإدارة</p>
              </div>
            </div>
            {!isDesktop && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-white/[0.06]" />

        {/* Admin Profile */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08] text-white/60 text-xs font-semibold">
                م
              </div>
              <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-[#008060] border-2 border-[#0a0f1a]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-white/70 truncate">مدير النظام</p>
              <p className="text-[10px] text-white/20 truncate">elshawaf@mawadaphone.com</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-white/[0.04]" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          <p className="px-3 pb-2.5 pt-2 text-[9px] font-medium text-white/15 uppercase tracking-[0.2em]">
            القائمة
          </p>
          {navItems.map(({ href, label, icon: Icon }, idx) => {
            const isActive = location === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12.5px] font-medium transition-all duration-200 group relative min-h-[40px]",
                  isActive
                    ? "text-white/90"
                    : "text-white/30 hover:text-white/60"
                )}
                style={{
                  animation: open && mounted && !isDesktop
                    ? `navSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.03}s both`
                    : "none",
                }}
              >
                {/* Active background */}
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-white/[0.06]" />
                )}

                {/* Icon */}
                <Icon className={cn(
                  "w-4 h-4 relative shrink-0 transition-colors duration-200",
                  isActive ? "text-[#008060]" : "text-white/20 group-hover:text-white/40"
                )} />

                {/* Label */}
                <span className="relative">{label}</span>

                {/* Hover background */}
                <div className="absolute inset-0 rounded-lg bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#008060]" />
              <span className="text-[10px] text-white/20">النظام نشط</span>
            </div>
            <span className="text-[10px] text-white/10">v2.0</span>
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes navSlideIn {
          from {
            opacity: 0;
            transform: translateX(0.5rem);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
