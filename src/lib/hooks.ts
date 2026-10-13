"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { getDemoState, getServerSnapshot, subscribe } from "./store";
import { DemoState } from "./types";

/** Hook to get the full demo state with automatic reactivity */
export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, getDemoState, getServerSnapshot);
}

/** Toast notification system */
export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const toastListeners: Set<(toasts: Toast[]) => void> = new Set();
let toasts: Toast[] = [];

export function showToast(message: string, type: ToastType = "info"): void {
  const id = Math.random().toString(36).substring(2);
  toasts = [...toasts, { id, message, type }];
  toastListeners.forEach((fn) => fn(toasts));

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    toastListeners.forEach((fn) => fn(toasts));
  }, 4000);
}

export function useToasts(): Toast[] {
  const [current, setCurrent] = useState<Toast[]>([]);
  useEffect(() => {
    toastListeners.add(setCurrent);
    return () => { toastListeners.delete(setCurrent); };
  }, []);
  return current;
}

/** Subscribe to toast changes (non-hook version for ToastContainer) */
export function useToastsSubscribe(setter: (toasts: Toast[]) => void): () => void {
  toastListeners.add(setter);
  return () => { toastListeners.delete(setter); };
}

/** Simple loading state hook */
export function useLoading() {
  const [loading, setLoading] = useState(false);

  const withLoading = useCallback(async (fn: () => Promise<void> | void) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, withLoading, setLoading };
}
