import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (v: number) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({ value, duration = 800, formatter, className, prefix = "", suffix = "" }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const start = prevValue.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setDisplay(Math.round(current));

      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
        prevValue.current = value;
      }
    };

    const id = requestAnimationFrame(tick);
    animRef.current = id;
    return () => cancelAnimationFrame(id);
  }, [value, duration]);

  useEffect(() => { prevValue.current = value; }, [value]);

  const formatted = formatter ? formatter(display) : display.toLocaleString("ar-EG");

  return (
    <span className={cn("font-number tabular-nums", className)}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
