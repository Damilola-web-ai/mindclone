"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

type SubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
};

export function SubmitButton({
  idleLabel,
  pendingLabel,
  className,
  disabled = false,
  size = "default",
  variant = "default",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      type="submit"
      disabled={disabled || pending}
    >
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
