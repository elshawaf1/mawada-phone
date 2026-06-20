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
    // In RTL, swiping left (negative diff) means dragging sidebar to close
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

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-20 lg:hidden transition-all duration-400",
          open
            ? "bg-black/70 backdrop-blur-md opacity-100"
            : "bg-black/0 backdrop-blur-none opacity-0 pointer-events-none"
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed lg:static inset-y-0 right-0 z-30 w-64",
          "bg-gradient-to-b from-[#0B1120] via-[#0F1A2E] to-[#0B1120]",
          "text-white flex flex-col",
          "shadow-2xl shadow-black/30 lg:shadow-none lg:border-l lg:border-white/[0.04]",
          "will-change-transform",
          !open && "pointer-events-none"
        )}
        style={{
          transition: "all 400ms cubic-bezier(0.16, 1, 0.3, 1)",
          transform: isDesktop
            ? undefined
            : open
              ? "translateX(0)"
              : swipeOffset
                ? `translateX(${swipeOffset}px)`
                : "translateX(-110%)",
          opacity: isDesktop ? 1 : open ? 1 : 0,
          scale: isDesktop ? undefined : open ? "1" : "0.95",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Logo */}
        <div className="relative p-5 pb-4">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400 ring-1 ring-white/15">
                  <span className="text-white font-black text-lg drop-shadow-sm">م</span>
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-[2px] border-[#0B1120] shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
              </div>
              <div>
                <h1 className="font-bold text-base text-white leading-tight tracking-wide">مودة فون</h1>
                <p className="text-[10px] text-white/30 font-medium tracking-wider uppercase">لوحة الإدارة</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "lg:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all duration-300",
                "text-white/30 hover:text-white hover:bg-white/[0.08]",
                "hover:rotate-90 active:scale-90"
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Admin Profile */}
        <div className="mx-3 mt-3 group">
          <div className="relative p-3 rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-l from-blue-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-sky-400 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20 ring-2 ring-white/10">
                  م
                </div>
                <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 bg-emerald-500 rounded-full border-[2.5px] border-[#0B1120] shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/90 truncate">مدير النظام</p>
                <p className="text-[10px] text-white/30 truncate font-mono tracking-tight">elshawaf@mawadaphone.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-5 pb-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          <p className="px-3 pb-2 text-[10px] font-semibold text-white/15 uppercase tracking-[0.15em]">
            القائمة الرئيسية
          </p>
          {navItems.map(({ href, label, icon: Icon }, idx) => {
            const isActive = location === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden min-h-[44px]",
                  isActive
                    ? "text-white"
                    : "text-white/35 hover:text-white/70"
                )}
                style={{
                  animation: open && mounted
                    ? `navSlideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.035}s both`
                    : "none",
                }}
              >
                {/* Active glow background */}
                <div className={cn(
                  "absolute inset-0 rounded-xl transition-all duration-300",
                  isActive
                    ? "bg-gradient-to-l from-blue-500/[0.12] via-blue-500/[0.04] to-transparent opacity-100 shadow-[inset_0_1px_0_rgba(59,130,246,0.1)]"
                    : "bg-gradient-to-l from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100"
                )} />

                {/* Active accent line */}
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-blue-400 to-sky-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                )}

                {/* Icon */}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                  isActive
                    ? "bg-blue-500/20 shadow-sm shadow-blue-500/10"
                    : "bg-white/[0.04] group-hover:bg-white/[0.08]"
                )}>
                  <Icon className={cn(
                    "w-4 h-4 transition-all duration-200",
                    isActive ? "text-blue-300 drop-shadow-[0_0_6px_rgba(96,165,250,0.4)]" : "text-white/30 group-hover:text-white/60"
                  )} />
                </div>

                {/* Label */}
                <span className="relative">{label}</span>

                {/* Shine overlay */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-l from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="relative p-4">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
                <span className="relative rounded-full bg-emerald-400 w-2 h-2 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              </span>
              <span className="text-[10px] text-white/20 font-medium">النظام نشط</span>
            </div>
            <span className="text-[10px] text-white/12 font-mono tracking-tight">مودة فون v2.0</span>
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes navSlideIn {
          from {
            opacity: 0;
            transform: translateX(0.75rem) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
