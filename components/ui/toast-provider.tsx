"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ToastTone = "error" | "info" | "success" | "warning";

type ToastInput = {
  description?: string;
  durationMs?: number;
  title: string;
  tone?: ToastTone;
};

type ToastRecord = Required<Pick<ToastInput, "title">> &
  Omit<ToastInput, "durationMs" | "title"> & {
    id: string;
    tone: ToastTone;
  };

const toneClasses: Record<ToastTone, string> = {
  error:
    "border-rose-500/30 bg-[rgba(77,18,30,0.96)] text-rose-50 shadow-[0_20px_60px_-38px_rgba(244,63,94,0.65)]",
  info:
    "border-sky-400/30 bg-[rgba(10,28,46,0.96)] text-sky-50 shadow-[0_20px_60px_-38px_rgba(56,189,248,0.55)]",
  success:
    "border-emerald-400/30 bg-[rgba(9,36,31,0.96)] text-emerald-50 shadow-[0_20px_60px_-38px_rgba(16,185,129,0.6)]",
  warning:
    "border-amber-400/30 bg-[rgba(58,35,6,0.96)] text-amber-50 shadow-[0_20px_60px_-38px_rgba(245,158,11,0.55)]",
};

const ToastContext = createContext<((input: ToastInput) => void) | null>(null);

function buildToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timeoutMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismissToast = useCallback((toastId: string) => {
    const timeoutHandle = timeoutMapRef.current.get(toastId);

    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutMapRef.current.delete(toastId);
    }

    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== toastId),
    );
  }, []);

  const toast = useCallback(
    ({ description, durationMs = 4200, title, tone = "info" }: ToastInput) => {
      const nextToast: ToastRecord = {
        description,
        id: buildToastId(),
        title,
        tone,
      };

      setToasts((currentToasts) => [...currentToasts, nextToast].slice(-4));

      const timeoutHandle = setTimeout(() => {
        dismissToast(nextToast.id);
      }, durationMs);

      timeoutMapRef.current.set(nextToast.id, timeoutHandle);
    },
    [dismissToast],
  );

  useEffect(() => {
    const timeoutMap = timeoutMapRef.current;

    return () => {
      timeoutMap.forEach((timeoutHandle) => {
        clearTimeout(timeoutHandle);
      });

      timeoutMap.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex justify-end sm:inset-x-6">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toastRecord) => (
            <div
              key={toastRecord.id}
              className={cn(
                "pointer-events-auto overflow-hidden rounded-[1.45rem] border px-4 py-4 backdrop-blur-xl",
                toneClasses[toastRecord.tone],
              )}
              role={toastRecord.tone === "error" ? "alert" : "status"}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{toastRecord.title}</p>
                  {toastRecord.description ? (
                    <p className="mt-2 text-sm leading-6 text-current/85">
                      {toastRecord.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-2 py-1 text-xs text-current/80 transition-colors hover:bg-white/10 hover:text-current"
                  onClick={() => dismissToast(toastRecord.id)}
                  aria-label="Dismiss notification"
                >
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
