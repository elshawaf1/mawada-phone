import { useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RippleProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

interface RippleState {
  x: number;
  y: number;
  id: number;
}

export function RippleButton({ children, className, onClick }: RippleProps) {
  const [ripples, setRipples] = useState<RippleState[]>([]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { x, y, id }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
    onClick?.();
  }, [onClick]);

  return (
    <div onClick={handleClick} className={cn("relative overflow-hidden", className)}>
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute pointer-events-none rounded-full bg-white/30 animate-ripple"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
          }}
        />
      ))}
    </div>
  );
}
