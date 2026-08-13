"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useRequireUserTflKey } from "@/hooks/use-require-user-tfl-key";

type UserTflKeyRequiredProps = {
  children: ReactNode;
  /** Short purpose line shown in the gate (what needs a key). */
  purpose?: string;
};

/**
 * Renders children only when a visitor TfL API key is ready.
 * Otherwise shows a prompt that opens the shared credentials dialog.
 * For future extensive Explorer ops — do not wrap cached list/route pages.
 */
export const UserTflKeyRequired = ({
  children,
  purpose = "This operation needs fresh TfL API access against your own quota.",
}: UserTflKeyRequiredProps) => {
  const { ready, hydrated, openDialog } = useRequireUserTflKey();

  if (!hydrated) {
    return (
      <div
        className="rounded-lg border border-border p-4 text-sm text-muted-foreground"
        aria-busy="true"
      >
        Checking for a TfL API key…
      </div>
    );
  }

  if (!ready) {
    return (
      <div
        className="space-y-3 rounded-lg border border-border p-4"
        role="region"
        aria-label="TfL API key required"
      >
        <p className="text-sm text-foreground">{purpose}</p>
        <p className="text-sm text-muted-foreground">
          Add a free TfL API key in the sidebar. It stays in this browser and is
          never sent to our server. Introductory Explorer pages keep working
          without a key.
        </p>
        <Button type="button" onClick={openDialog}>
          Add TfL API key
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};
