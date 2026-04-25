import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/80 focus:border-brand focus:ring-2 focus:ring-brand/15",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
