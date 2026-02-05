import { cn } from "@/lib/utils";
import * as React from "react";

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal";
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, orientation = "vertical", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex w-full max-w-sm gap-2",
          orientation === "horizontal" ? "flex-row items-center" : "flex-col",
          className
        )}
        {...props}
      />
    );
  }
);
Field.displayName = "Field";

export { Field };
