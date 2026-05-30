"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiX } from "react-icons/fi";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "error" | "warning" | "success";

type Toast = {
  id:      string;
  message: string;
  type:    ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

// ─── Individual toast item ────────────────────────────────────────────────────

const TOAST_CONFIG = {
  error: {
    border:  "border-l-accent-red",
    icon:    FiAlertCircle,
    iconCls: "text-accent-red",
  },
  warning: {
    border:  "border-l-accent-amber",
    icon:    FiAlertTriangle,
    iconCls: "text-accent-amber",
  },
  success: {
    border:  "border-l-accent-green",
    icon:    FiCheckCircle,
    iconCls: "text-accent-green",
  },
} as const;

const ToastItem = ({
  toast,
  onDismiss,
}: {
  toast:     Toast;
  onDismiss: (id: string) => void;
}) => {
  const cfg  = TOAST_CONFIG[toast.type];
  const Icon = cfg.icon;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border border-border-subtle border-l-2 ${cfg.border} bg-surface-card px-4 py-3 shadow-2xl`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.iconCls}`} />
      <p className="flex-1 text-sm text-content-primary">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded p-0.5 text-content-muted transition-colors hover:text-content-primary"
        aria-label="Dismiss"
      >
        <FiX className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// ─── Container ────────────────────────────────────────────────────────────────

const ToastContainer = ({
  toasts,
  onDismiss,
}: {
  toasts:    Toast[];
  onDismiss: (id: string) => void;
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-6 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "error") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};
