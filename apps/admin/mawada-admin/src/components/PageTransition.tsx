import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState("enter");

  useEffect(() => {
    setTransitionStage("exit");
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setTransitionStage("enter");
    }, 200);
    return () => clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    if (transitionStage === "enter") {
      const timer = setTimeout(() => {}, 50);
      return () => clearTimeout(timer);
    }
  }, [transitionStage]);

  return (
    <div
      className={cn(
        "transition-all duration-300",
        transitionStage === "enter"
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2"
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      {displayChildren}
    </div>
  );
}
