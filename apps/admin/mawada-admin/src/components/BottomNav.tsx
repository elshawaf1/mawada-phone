import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ShoppingCart, BarChart3, PackageSearch, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/products", label: "المنتجات", icon: Package },
  { href: "/orders", label: "الطلبات", icon: ShoppingCart },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/inventory", label: "المخزون", icon: PackageSearch },
  { href: "/notifications", label: "الإشعارات", icon: Bell },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-border/30 safe-area-bottom">
      <div className="flex items-center justify-around h-[52px]">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = location === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-[3px] min-w-[48px] min-h-[44px] px-2 rounded-lg transition-all duration-200",
                isActive
                  ? "text-[#008060]"
                  : "text-muted-foreground/40"
              )}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className={cn(
                "text-[9px] font-medium transition-all duration-200",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
