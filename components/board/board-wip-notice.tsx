"use client";

import { openFeedbackDialog } from "@/lib/feedback/open";

export const BoardWipNotice = () => {
  const handleOpenFeedback = () => {
    openFeedbackDialog();
  };

  return (
    <p className="mt-3 max-w-prose text-sm text-muted-foreground">
      Still in progress.{" "}
      <button
        type="button"
        onClick={handleOpenFeedback}
        className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
        aria-haspopup="dialog"
      >
        Send feedback
      </button>{" "}
      if something is off.
    </p>
  );
};
