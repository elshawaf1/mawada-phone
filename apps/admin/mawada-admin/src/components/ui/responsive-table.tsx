import { type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface ResponsiveTableProps {
  desktop: ReactNode;
  mobile: ReactNode;
  breakpoint?: string;
}

export function ResponsiveTable({ desktop, mobile, breakpoint = "(max-width: 767px)" }: ResponsiveTableProps) {
  const isMobile = useMediaQuery(breakpoint);
  return <>{isMobile ? mobile : desktop}</>;
}
