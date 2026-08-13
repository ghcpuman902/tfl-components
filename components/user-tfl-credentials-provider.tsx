"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { validateUserTflAppKey } from "@/lib/tfl/browser-tfl-client";
import type { TranslatedTflError } from "@/lib/tfl/tfl-error-translation";
import {
  USER_TFL_CREDENTIALS_STORAGE_KEY,
  clearStoredUserTflCredentials,
  isPlausibleTflAppKey,
  maskUserTflAppKey,
  readStoredUserTflCredentials,
  writeStoredUserTflCredentials,
  type UserTflPersistMode,
} from "@/lib/tfl/user-credentials-storage";

export type UserTflCredentialsStatus =
  | "empty"
  | "validating"
  | "ready"
  | "invalid";

type UserTflCredentialsContextValue = {
  status: UserTflCredentialsStatus;
  hydrated: boolean;
  appKeyMasked: string | null;
  persistMode: UserTflPersistMode;
  error: TranslatedTflError | null;
  /** Soft shape warning shown before / alongside Save (does not block hard). */
  shapeWarning: string | null;
  save: (
    appKey: string,
    persist: UserTflPersistMode,
  ) => Promise<{ ok: true } | { ok: false; error: TranslatedTflError }>;
  clear: () => void;
  /** Browser-only; never log or put in URLs we control. */
  getAppKey: () => string | null;
  markInvalid: (error: TranslatedTflError) => void;
  openDialog: () => void;
  closeDialog: () => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
};

const UserTflCredentialsContext =
  createContext<UserTflCredentialsContextValue | null>(null);

export const UserTflCredentialsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<UserTflCredentialsStatus>("empty");
  const [appKey, setAppKey] = useState<string | null>(null);
  const [persistMode, setPersistMode] =
    useState<UserTflPersistMode>("local");
  const [error, setError] = useState<TranslatedTflError | null>(null);
  const [shapeWarning, setShapeWarning] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const appKeyRef = useRef<string | null>(null);

  const applyStored = useCallback(() => {
    const stored = readStoredUserTflCredentials();
    if (!stored) {
      appKeyRef.current = null;
      setAppKey(null);
      setStatus("empty");
      setError(null);
      setPersistMode("local");
      return;
    }
    appKeyRef.current = stored.appKey;
    setAppKey(stored.appKey);
    setPersistMode(stored.persist);
    setStatus("ready");
    setError(null);
  }, []);

  useEffect(() => {
    startTransition(() => {
      applyStored();
      setHydrated(true);
    });
  }, [applyStored]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key !== null &&
        event.key !== USER_TFL_CREDENTIALS_STORAGE_KEY
      ) {
        return;
      }
      applyStored();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [applyStored]);

  const save = useCallback(
    async (nextKey: string, persist: UserTflPersistMode) => {
      const trimmed = nextKey.trim();
      const shape = isPlausibleTflAppKey(trimmed);
      setShapeWarning(shape.ok ? null : shape.warning);
      if (!trimmed) {
        const err: TranslatedTflError = {
          kind: "invalid-key",
          message: "Enter a TfL API key.",
        };
        setError(err);
        setStatus("invalid");
        return { ok: false as const, error: err };
      }

      setStatus("validating");
      setError(null);
      const result = await validateUserTflAppKey(trimmed);
      if (!result.ok) {
        setStatus("invalid");
        setError(result.error);
        return { ok: false as const, error: result.error };
      }

      const saved = writeStoredUserTflCredentials(
        trimmed,
        persist,
        Date.now(),
      );
      appKeyRef.current = saved.appKey;
      setAppKey(saved.appKey);
      setPersistMode(saved.persist);
      setStatus("ready");
      setError(null);
      setShapeWarning(null);
      return { ok: true as const };
    },
    [],
  );

  const clear = useCallback(() => {
    clearStoredUserTflCredentials();
    appKeyRef.current = null;
    setAppKey(null);
    setStatus("empty");
    setError(null);
    setShapeWarning(null);
    setPersistMode("local");
  }, []);

  const getAppKey = useCallback(() => appKeyRef.current, []);

  const markInvalid = useCallback((next: TranslatedTflError) => {
    setStatus("invalid");
    setError(next);
  }, []);

  const openDialog = useCallback(() => setDialogOpen(true), []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  const appKeyMasked = useMemo(
    () => (appKey ? maskUserTflAppKey(appKey) : null),
    [appKey],
  );

  const value = useMemo<UserTflCredentialsContextValue>(
    () => ({
      status,
      hydrated,
      appKeyMasked,
      persistMode,
      error,
      shapeWarning,
      save,
      clear,
      getAppKey,
      markInvalid,
      openDialog,
      closeDialog,
      dialogOpen,
      setDialogOpen,
    }),
    [
      status,
      hydrated,
      appKeyMasked,
      persistMode,
      error,
      shapeWarning,
      save,
      clear,
      getAppKey,
      markInvalid,
      openDialog,
      closeDialog,
      dialogOpen,
    ],
  );

  return (
    <UserTflCredentialsContext.Provider value={value}>
      {children}
    </UserTflCredentialsContext.Provider>
  );
};

export const useUserTflCredentials = (): UserTflCredentialsContextValue => {
  const context = useContext(UserTflCredentialsContext);
  if (!context) {
    throw new Error(
      "useUserTflCredentials must be used within UserTflCredentialsProvider",
    );
  }
  return context;
};
