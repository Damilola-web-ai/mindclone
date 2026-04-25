import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[120px] w-full rounded-[1.4rem] border border-input bg-white/80 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/80 focus:border-brand focus:ring-2 focus:ring-brand/15",
        className,
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
