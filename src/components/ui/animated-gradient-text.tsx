import { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export interface AnimatedGradientTextProps extends ComponentPropsWithoutRef<"div"> {
  speed?: number;
  colorFrom?: string;
  colorTo?: string;
  darkColorFrom?: string;
  darkColorTo?: string;
}

export function AnimatedGradientText({
  children,
  className,
  speed = 1,
  colorFrom = "#3ba5f6ff",
  colorTo = "#f45cf6ff",
  darkColorFrom = "#54e3f3ff",
  darkColorTo = "#c75cf1ff",
  ...props
}: AnimatedGradientTextProps) {
  return (
    <span
      style={
        {
          "--bg-size": `${speed * 300}%`,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--color-from-dark": darkColorFrom,
          "--color-to-dark": darkColorTo,
        } as React.CSSProperties
      }
      className={cn(
        `animate-gradient inline bg-gradient-to-r from-[var(--color-from)] via-[var(--color-to)] to-[var(--color-from)] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent`,
        `dark:from-[var(--color-from-dark)] dark:via-[var(--color-to-dark)] dark:to-[var(--color-from-dark)]`,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
