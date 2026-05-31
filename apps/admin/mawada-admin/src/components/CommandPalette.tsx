import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Bell,
  Palette,
  TrendingUp,
  BarChart3,
  PackageSearch,
  Search,
  Command,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const pages = [
  { href: "/", label: "لوحة التحكم", labelEn: "Dashboard", icon: LayoutDashboard, keywords: "main home overview stats" },
  { href: "/products", label: "المنتجات", labelEn: "Products", icon: Package, keywords: "items goods catalog" },
  { href: "/orders", label: "الطلبات", labelEn: "Orders", icon: ShoppingCart, keywords: "sales purchases transactions" },
  { href: "/notifications", label: "الإشعارات", labelEn: "Notifications", icon: Bell, keywords: "alerts messages" },
  { href: "/top-products", label: "الأكثر مبيعاً", labelEn: "Top Products", icon: TrendingUp, keywords: "bestsellers popular ranking" },
  { href: "/reports", label: "التقارير", labelEn: "Reports", icon: BarChart3, keywords: "analytics statistics sales" },
  { href: "/inventory", label: "المخزون", labelEn: "Inventory", icon: PackageSearch, keywords: "stock warehouse supply" },
  { href: "/marketing", label: "التسويق", labelEn: "Marketing", icon: Palette, keywords: "promotions campaigns ads" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = query.trim()
    ? pages.filter(p =>
        p.label.includes(query) ||
        p.labelEn.toLowerCase().includes(query.toLowerCase()) ||
        p.keywords.includes(query.toLowerCase())
      )
    : pages;

  const handleSelect = useCallback((href: string) => {
    navigate(href);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && filtered[selectedIdx]) { handleSelect(filtered[selectedIdx].href); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, filtered, selectedIdx, handleSelect]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 transition-all duration-300",
          open ? "bg-black/60 backdrop-blur-sm opacity-100" : "bg-black/0 backdrop-blur-none opacity-0 pointer-events-none"
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed inset-x-0 top-[12%] z-50 mx-auto w-full max-w-lg transition-all duration-300",
          open ? "translate-y-0 opacity-100 scale-100" : "-translate-y-4 opacity-0 scale-95 pointer-events-none"
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="bg-white dark:bg-[#0F1729] rounded-2xl shadow-2xl shadow-black/20 border border-border/50 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
            <Search className="w-5 h-5 text-muted-foreground/40 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في لوحة التحكم..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 text-foreground"
              dir="rtl"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-muted-foreground/40 bg-muted/60 rounded-lg border border-border/40">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground/50">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد نتائج</p>
              </div>
            ) : (
              filtered.map((page, idx) => {
                const isSelected = idx === selectedIdx;
                return (
                  <button
                    key={page.href}
                    onClick={() => handleSelect(page.href)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-all duration-150 group",
                      isSelected
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                      isSelected ? "bg-primary/15" : "bg-muted/60 group-hover:bg-muted/80"
                    )}>
                      <page.icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground/50")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{page.label}</p>
                      <p className="text-[11px] text-muted-foreground/50 truncate">{page.labelEn}</p>
                    </div>
                    <ArrowLeft className={cn(
                      "w-3.5 h-3.5 transition-all",
                      isSelected ? "text-primary/60 opacity-100 translate-x-0" : "opacity-0 translate-x-2"
                    )} />
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-t border-border/30">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40">
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted/60 rounded text-[9px] font-mono font-medium">↑↓</kbd> تنقل</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted/60 rounded text-[9px] font-mono font-medium">↵</kbd> اختيار</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
              <kbd className="px-1 py-0.5 bg-muted/60 rounded text-[9px] font-mono font-medium">ESC</kbd> إغلاق
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
