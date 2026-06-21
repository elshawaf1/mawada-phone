import { Bell, Menu, Search, Command } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen?: boolean;
  onCmdOpen?: () => void;
}

export default function Header({ onMenuClick, sidebarOpen, onCmdOpen }: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [, setLocation] = useLocation();

  return (
    <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-border/40 flex items-center px-4 gap-3 shrink-0 sticky top-0 z-10 safe-area-top">
      <button
        onClick={onMenuClick}
        className={cn(
          "w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200",
          "hover:bg-muted/60 active:scale-95",
          sidebarOpen
            ? "text-[#008060]"
            : "text-muted-foreground/60 hover:text-foreground"
        )}
      >
        <Menu className="w-[18px] h-[18px]" />
      </button>

      {showSearch ? (
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
            <input
              autoFocus
              type="text"
              placeholder="ابحث..."
              onBlur={() => setShowSearch(false)}
              className="w-full bg-muted/40 rounded-lg px-3 py-2 pr-9 text-[13px] outline-none border border-border/50 focus:border-[#008060]/30 focus:bg-white transition-all"
            />
          </div>
        </div>
      ) : (
        <button
          onClick={() => onCmdOpen?.()}
          className="flex items-center gap-2 text-muted-foreground/40 hover:text-muted-foreground/60 bg-muted/30 hover:bg-muted/50 rounded-lg px-3 py-2 text-[13px] transition-all flex-1 max-w-sm border border-transparent hover:border-border/30 group active:scale-[0.99]"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-right truncate">ابحث في اللوحة...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/30 bg-white/50 rounded border border-border/30">
            <Command className="w-2 h-2" />K
          </kbd>
        </button>
      )}

      <div className="flex items-center gap-1 mr-auto">
        <button
          onClick={() => setLocation("/notifications")}
          className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-all text-muted-foreground/40 hover:text-muted-foreground/70 active:scale-95"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full ring-1.5 ring-white" />
        </button>

        <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted/40 transition-all cursor-default">
          <div className="w-7 h-7 bg-white/80 border border-border/40 rounded-full flex items-center justify-center text-muted-foreground/60 text-[10px] font-semibold">
            م
          </div>
          <span className="text-[12px] font-medium text-muted-foreground/70 hidden sm:block">مدير</span>
        </div>
      </div>
    </header>
  );
}
