"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TflApiKeyFieldHint,
  TflApiKeyObtainLinks,
} from "@/components/user-tfl-api-key-copy";
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider";
import { buildBoardHref } from "@/lib/tfl/board-url-state";
import { HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops";

export const BoardBuilder = () => {
  const {
    status,
    hydrated,
    appKeyMasked,
    persistMode,
    error,
    getAppKey,
    openDialog,
  } = useUserTflCredentials();

  const [stop, setStop] = useState<string>(HOME_RAIL_STOP.id);
  const [stopName, setStopName] = useState<string>(HOME_RAIL_STOP.name);
  const [origin, setOrigin] = useState("");

  const appKey = hydrated ? (getAppKey() ?? "") : "";
  const hasKey = Boolean(appKey);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const href = useMemo(
    () =>
      buildBoardHref({
        stop: stop.trim() || undefined,
        stopName: stopName.trim() || undefined,
        key: appKey.trim() || undefined,
      }),
    [stop, stopName, appKey],
  );

  const absoluteUrl = origin ? `${origin}${href}` : href;

  const handleStopChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStop(event.target.value);
  };

  const handleStopNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStopName(event.target.value);
  };

  const handleManageKey = () => {
    openDialog();
  };

  return (
    <div className="space-y-10">
      <form className="grid max-w-xl gap-5" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-2">
          <Label htmlFor="board-stop">Stop id</Label>
          <Input
            id="board-stop"
            name="stop"
            value={stop}
            onChange={handleStopChange}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="board-stop-hint"
          />
          <p id="board-stop-hint" className="text-sm text-muted-foreground">
            NaPTAN id for one Tube or rail station. Find it in{" "}
            <Link
              href="/docs/explorer"
              className="text-foreground underline underline-offset-4"
            >
              Explorer
            </Link>
            . Defaults to Oxford Circus.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="board-stop-name">Stop name (optional)</Label>
          <Input
            id="board-stop-name"
            name="stopName"
            value={stopName}
            onChange={handleStopNameChange}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2" role="group" aria-labelledby="board-key-label">
          <p id="board-key-label" className="text-sm font-medium leading-none">
            TfL API key
          </p>
          <p id="board-key-copy" className="text-sm text-muted-foreground">
            This site uses a shared backend key, which can hit rate limits.{" "}
            <TflApiKeyObtainLinks />. The generated URL keeps it in the hash
            fragment, so it never reaches our servers.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {hasKey && appKeyMasked ? (
              <>
                <span className="text-sm">Active key</span>
                <Button
                  type="button"
                  variant="outline"
                  className="font-mono"
                  onClick={handleManageKey}
                  aria-label={`Manage TfL API key ending ${appKeyMasked.slice(-4)}`}
                  aria-describedby="board-key-copy board-key-hint"
                >
                  {appKeyMasked}
                </Button>
                {persistMode === "session" ? (
                  <span className="text-sm text-muted-foreground">
                    · forgets when this tab closes
                  </span>
                ) : null}
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleManageKey}
                aria-describedby="board-key-copy board-key-hint"
              >
                Add TfL API key
              </Button>
            )}
          </div>
          <TflApiKeyFieldHint id="board-key-hint" />
          {error && status === "invalid" ? (
            <p className="text-sm text-destructive" role="alert">
              {error.message}
            </p>
          ) : null}
        </div>

        <fieldset className="space-y-3" disabled>
          <legend className="text-sm font-medium text-foreground">
            Coming soon
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="board-mode">Interactivity</Label>
              <select
                id="board-mode"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm opacity-60"
                defaultValue="static"
                aria-describedby="board-mode-hint"
              >
                <option value="static">Non-interactive</option>
                <option value="mouse">Mouse</option>
                <option value="touch">Touch</option>
              </select>
              <p id="board-mode-hint" className="text-xs text-muted-foreground">
                Self-loop for now. Mouse and touch later.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-fit">Fit</Label>
              <select
                id="board-fit"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm opacity-60"
                defaultValue="static"
                aria-describedby="board-fit-hint"
              >
                <option value="static">Natural size (scroll)</option>
                <option value="fill">Fill the screen</option>
              </select>
              <p id="board-fit-hint" className="text-xs text-muted-foreground">
                Components keep their default size. Fill comes later.
              </p>
            </div>
          </div>
        </fieldset>
      </form>

      <section className="space-y-3" aria-labelledby="board-url-heading">
        <h2 id="board-url-heading" className="text-lg font-semibold">
          Your URL
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Open it in a new tab for a chromeless board that polls TfL. The
          preview below is the same page in an iframe.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs break-all text-foreground">
            {absoluteUrl}
          </code>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              data-copy-text={absoluteUrl}
              aria-label="Copy board URL"
            >
              Copy
            </Button>
            <Button
              nativeButton={false}
              render={<a href={href} target="_blank" rel="noreferrer" />}
            >
              Open in new tab
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="board-preview-heading">
        <h2 id="board-preview-heading" className="text-lg font-semibold">
          Preview
        </h2>
        {hydrated ? (
          <iframe
            key={href}
            title="Board preview"
            src={href}
            className="h-[min(40rem,70svh)] w-full rounded-md border border-border bg-background"
          />
        ) : (
          <div
            className="h-[min(40rem,70svh)] w-full rounded-md border border-border bg-muted"
            aria-busy="true"
            aria-label="Loading board preview"
          />
        )}
      </section>
    </div>
  );
};
