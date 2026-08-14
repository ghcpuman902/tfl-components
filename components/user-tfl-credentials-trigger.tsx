"use client";

import { KeyRoundIcon } from "lucide-react";
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider";
import { cn } from "@/lib/utils";

type UserTflCredentialsTriggerProps = {
  className?: string;
};

/**
 * Docs/explore sidebar control that opens the credentials dialog.
 * The dialog itself mounts once at app layout so Board can open it too.
 */
export const UserTflCredentialsTrigger = ({
  className,
}: UserTflCredentialsTriggerProps) => {
  const { status, hydrated, appKeyMasked, openDialog } =
    useUserTflCredentials();

  const ready = hydrated && status === "ready";
  const label = !hydrated
    ? "Add TfL API key"
    : ready
      ? `Key ${appKeyMasked}`
      : "Add TfL API key";

  return (
    <button
      type="button"
      onClick={openDialog}
      className={cn(
        "inline-flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className,
      )}
      aria-label={
        ready
          ? `Manage TfL API key ending ${appKeyMasked?.slice(-4) ?? ""}`
          : "Add TfL API key"
      }
    >
      <KeyRoundIcon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
};
