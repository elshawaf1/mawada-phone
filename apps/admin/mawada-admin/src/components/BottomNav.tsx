import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ShoppingCart, BarChart3, PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/products", label: "المنتجات", icon: Package },
  { href: "/orders", label: "الطلبات", icon: ShoppingCart },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/inventory", label: "المخزون", icon: PackageSearch },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border/60 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href}>
              <a className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] px-3 rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              )}>
                <div className={cn(
                  "w-5 h-5 flex items-center justify-center transition-all duration-200",
                  isActive && "drop-shadow-[0_0_6px_rgba(59,130,246,0.4)]"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={cn(
                  "text-[9px] font-medium transition-all duration-200",
                  isActive ? "opacity-100" : "opacity-60"
                )}>
                  {label}
                </span>
                {isActive && (
                  <div className="absolute -top-0.5 w-6 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                )}
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
