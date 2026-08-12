"use client";

import { useId, useState, type FormEvent } from "react";
import { AppWindowIcon, HardDriveIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider";
import type { UserTflPersistMode } from "@/lib/tfl/user-credentials-storage";

const PORTAL_URL = "https://api-portal.tfl.gov.uk/";
const PORTAL_PRODUCTS_URL = `${PORTAL_URL}products`;
const PORTAL_PROFILE_URL = `${PORTAL_URL}profile`;

/**
 * Dialog to paste / replace / clear a visitor TfL API key.
 * Keys are validated with a browser request to api.tfl.gov.uk — never posted here.
 */
export const UserTflCredentialsDialog = () => {
  const {
    status,
    appKeyMasked,
    persistMode,
    error,
    shapeWarning,
    save,
    clear,
    dialogOpen,
    setDialogOpen,
  } = useUserTflCredentials();

  const fieldId = useId();
  const [draftKey, setDraftKey] = useState("");
  const [draftPersist, setDraftPersist] =
    useState<UserTflPersistMode>("local");
  const [replacing, setReplacing] = useState(false);
  const [saving, setSaving] = useState(false);

  const isReady = status === "ready";
  const showForm = !isReady || replacing;

  const resetDraft = () => {
    setReplacing(false);
    setDraftKey("");
    setDraftPersist(persistMode);
  };

  const handleOpenChange = (open: boolean) => {
    if (saving) return;
    if (open) {
      setDraftPersist(persistMode);
      setDraftKey("");
      setReplacing(false);
    } else {
      resetDraft();
    }
    setDialogOpen(open);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await save(draftKey, draftPersist);
    setSaving(false);
    if (!result.ok) return;
    toast.success("Live demos will use your key.");
    resetDraft();
    setDialogOpen(false);
  };

  const handleClear = () => {
    clear();
    toast.message("TfL API key cleared.");
    resetDraft();
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        data-user-tfl-credentials-dialog=""
        className="gap-4 sm:max-w-md"
      >
        <DialogHeader className="gap-1.5 pr-8">
          <DialogTitle>
            {isReady && !replacing
              ? "Your TfL API key"
              : "Add your own TfL API key"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            This site runs off a shared API key in the backend, which can hit
            rate limits. You can keep exploring until that happens. If you need
            live data for specific tube stations, bus stops, or bike docks, paste
            your own key here and use{" "}
            <Link
              href="/docs/explorer"
              className="text-foreground underline underline-offset-2"
              onClick={() => setDialogOpen(false)}
            >
              Explorer
            </Link>
            .{" "}
            <a
              href={PORTAL_PRODUCTS_URL}
              className="text-foreground underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Obtain a free key
            </a>{" "}
            (subscribe to 500 Requests per min), then copy it from{" "}
            <a
              href={PORTAL_PROFILE_URL}
              className="text-foreground underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Profile → Show
            </a>
            . Stored only in this browser.
          </DialogDescription>
        </DialogHeader>

        {isReady && !replacing ? (
          <div className="space-y-3">
            <p className="text-sm">
              Active key{" "}
              <span className="font-mono text-muted-foreground">
                {appKeyMasked}
              </span>
              {persistMode === "session" ? (
                <span className="text-muted-foreground">
                  {" "}
                  · forgets when this tab closes
                </span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              On the portal you’ll see two keys (Primary and Secondary); either
              works. <code className="text-[0.7rem]">app_id</code> has been
              unused since Jan 2021.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReplacing(true);
                  setDraftKey("");
                  setDraftPersist(persistMode);
                }}
              >
                Replace
              </Button>
              <Button type="button" variant="destructive" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        {showForm ? (
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Label htmlFor={fieldId} className="shrink-0 whitespace-nowrap">
                  TfL API key
                </Label>
                <Input
                  id={fieldId}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={draftKey}
                  disabled={saving}
                  onChange={(event) => setDraftKey(event.target.value)}
                  placeholder="Paste key"
                  aria-describedby={`${fieldId}-hint`}
                  className="min-w-0 flex-1"
                />
              </div>
              <p
                id={`${fieldId}-hint`}
                className="text-xs text-muted-foreground"
              >
                Copy from{" "}
                <a
                  href={PORTAL_PROFILE_URL}
                  className="underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  Profile → Show
                </a>
                . Primary or Secondary both work.{" "}
                <code className="text-[0.7rem]">app_id</code> has been unused
                since Jan 2021.
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Storage</legend>
              <RadioGroup
                value={draftPersist}
                onValueChange={(value) => {
                  if (value === "local" || value === "session") {
                    setDraftPersist(value);
                  }
                }}
                disabled={saving}
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="local" />
                  <HardDriveIcon
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  Keep in this browser
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="session" />
                  <AppWindowIcon
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  Forget when I close this tab
                </label>
              </RadioGroup>
            </fieldset>

            {shapeWarning ? (
              <p
                className="text-sm text-amber-700 dark:text-amber-400"
                role="status"
              >
                {shapeWarning}
              </p>
            ) : null}
            {error && status === "invalid" ? (
              <p className="text-sm text-destructive" role="alert">
                {error.message}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  if (replacing) {
                    setReplacing(false);
                    setDraftKey("");
                    return;
                  }
                  handleOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !draftKey.trim()}>
                {saving || status === "validating" ? "Checking…" : "Save"}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
