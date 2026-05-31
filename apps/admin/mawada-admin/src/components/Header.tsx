import { Bell, Menu, Search, Command } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen?: boolean;
  onCmdOpen?: () => void;
}

export default function Header({ onMenuClick, sidebarOpen, onCmdOpen }: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="h-16 bg-card/80 backdrop-blur-xl border-b border-border/60 flex items-center px-5 gap-3 shrink-0 sticky top-0 z-10 safe-area-top">
      <button
        onClick={onMenuClick}
        className={cn(
          "p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all duration-300 relative overflow-hidden group",
          "hover:bg-muted/70 active:scale-90",
          sidebarOpen
            ? "text-primary bg-primary/10 hover:bg-primary/15"
            : "text-muted-foreground hover:text-foreground"
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className={cn(
          "transition-all duration-300",
          sidebarOpen ? "rotate-90 scale-110" : "rotate-0 scale-100"
        )}>
          <Menu className="w-5 h-5" />
        </div>
      </button>

      {showSearch ? (
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <input
              autoFocus
              type="text"
              placeholder="ابحث..."
              onBlur={() => setShowSearch(false)}
              className="w-full bg-muted/60 rounded-xl px-4 py-2.5 pr-10 text-sm outline-none border border-border/60 focus:border-primary/40 focus:bg-background focus:shadow-sm transition-all"
            />
          </div>
        </div>
      ) : (
        <button
          onClick={() => onCmdOpen?.()}
          className="flex items-center gap-2 text-muted-foreground/50 hover:text-foreground bg-muted/40 hover:bg-muted/70 rounded-xl px-4 py-2 text-sm transition-all flex-1 max-w-md border border-transparent hover:border-border/40 group active:scale-[0.98]"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-right truncate">ابحث في اللوحة...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/40 bg-background/50 rounded-md border border-border/40 ring-1 ring-border/30">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
      )}

      <div className="flex items-center gap-1 mr-auto">
        <button className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-muted/70 transition-all text-muted-foreground/60 hover:text-foreground group active:scale-95">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-card/80" />
        </button>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-muted/50 transition-all cursor-default">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center text-primary-foreground font-bold text-xs shadow-sm ring-2 ring-white/40">
            م
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">مدير</span>
        </div>
      </div>
    </header>
  );
}
