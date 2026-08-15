"use client";

import { useEffect, useState } from "react";
import {
  withSharedTrackIdentity,
  type RealtimePrediction,
} from "tfl-ts";
import {
  selectArrivalsDataPath,
  shouldPausePollingForVisibility,
  type DualPathSource,
} from "@/lib/tfl/dual-path-arrivals";
import { createBrowserTflClient } from "@/lib/tfl/browser-tfl-client";
import { translateTflClientError } from "@/lib/tfl/tfl-error-translation";
import {
  getLineArrivalsAction,
  getStopArrivalsAction,
} from "@/lib/tfl/live-arrivals-action";
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider";

const DEFAULT_POLL_MS = 20_000;

const INVALID_KEY_FALLBACK =
  "Your TfL API key was rejected. Replace or clear it in the sidebar.";

type UseDualPathArrivalsOptions = {
  stopPointId: string;
  /**
   * Extra StopPoint ids to poll with the user key (hub siblings).
   * The site-key path still uses `stopPointId` alone (demo allowlist).
   */
  stopPointIds?: readonly string[];
  pollMs?: number;
  /**
   * When set, ignore stored credentials and use this key for the user path.
   * Empty/null stays on the site path. Omit to use the credentials provider.
   */
  appKeyOverride?: string | null;
  /**
   * Curated shared-track line ids. When set, poll network-wide arrivals for
   * those lines and tag stop rows with `sharedTrackIdentity`.
   */
  sharedTrackLineIds?: readonly string[];
};

type UseDualPathArrivalsResult = {
  data: RealtimePrediction[];
  loading: boolean;
  fetchError: string | null;
  tick: number;
  source: DualPathSource;
};

/**
 * Poll arrivals via site Server Action when no user key is ready,
 * or via browser tfl-ts when a user key is ready.
 * Pauses while the tab is hidden; refreshes immediately on visible.
 * Never falls back to the site key after a user-key failure.
 */
export const useDualPathArrivals = ({
  stopPointId,
  stopPointIds,
  pollMs = DEFAULT_POLL_MS,
  appKeyOverride,
  sharedTrackLineIds,
}: UseDualPathArrivalsOptions): UseDualPathArrivalsResult => {
  const { status, getAppKey, markInvalid, error: credentialError } =
    useUserTflCredentials();
  const usingOverride = appKeyOverride !== undefined;
  const overrideKey = usingOverride ? appKeyOverride?.trim() || null : null;
  const source = usingOverride
    ? overrideKey
      ? "user"
      : "site"
    : selectArrivalsDataPath(status);
  const isInvalid = !usingOverride && status === "invalid";
  const trimmedStop = stopPointId.trim();
  const pollStopIds = [
    ...new Set(
      (stopPointIds?.length ? stopPointIds : [trimmedStop])
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  const pollStopKey = pollStopIds.join(",");
  const sharedTrackKey = [
    ...new Set(
      (sharedTrackLineIds ?? []).map((id) => id.trim()).filter(Boolean),
    ),
  ]
    .sort()
    .join(",");
  const sharedTrackIds = sharedTrackKey ? sharedTrackKey.split(",") : [];

  const [data, setData] = useState<RealtimePrediction[]>([]);
  const [pollError, setPollError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const pathKey = usingOverride
    ? `${source}:override:${pollStopKey}:${sharedTrackKey}`
    : `${source}:${status}:${pollStopKey}:${sharedTrackKey}`;

  useEffect(() => {
    if (isInvalid) return;
    if (!trimmedStop) {
      setData([]);
      setPollError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopPoll: (() => void) | undefined;
    let paused = false;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    };

    const applySuccess = (arrivals: RealtimePrediction[]) => {
      if (cancelled) return;
      setPollError(null);
      setData(arrivals);
      setTick((n) => n + 1);
      setLoading(false);
    };

    const tagStopArrivals = async (
      stopArrivals: RealtimePrediction[],
      fetchNetwork: () => Promise<RealtimePrediction[] | null>,
    ): Promise<RealtimePrediction[]> => {
      if (sharedTrackIds.length < 2) return stopArrivals;
      try {
        const network = await fetchNetwork();
        if (!network) return stopArrivals;
        return withSharedTrackIdentity(stopArrivals, sharedTrackIds, network);
      } catch {
        return stopArrivals;
      }
    };

    const applyFailure = (message: string) => {
      if (cancelled) return;
      setPollError(message);
      setData([]);
      setLoading(false);
    };

    const scheduleSitePoll = () => {
      clearTimer();
      if (cancelled || paused) return;
      timer = setTimeout(() => {
        void runSiteLoad();
      }, pollMs);
    };

    const runSiteLoad = async () => {
      if (cancelled || paused) return;
      try {
        const result = await getStopArrivalsAction(trimmedStop);
        if (cancelled || paused) return;
        if (!result.ok) {
          applyFailure(result.error);
        } else {
          const tagged = await tagStopArrivals(result.arrivals, async () => {
            const lineResult = await getLineArrivalsAction(sharedTrackIds);
            return lineResult.ok ? lineResult.arrivals : null;
          });
          if (cancelled || paused) return;
          applySuccess(tagged);
        }
      } catch {
        applyFailure("Failed to load arrivals.");
      } finally {
        if (!cancelled && !paused) scheduleSitePoll();
      }
    };

    const resolveUserKey = (): string | null =>
      usingOverride ? overrideKey : getAppKey();

    const startUserPoll = async () => {
      const appKey = resolveUserKey();
      if (!appKey) {
        applyFailure(
          "Add a TfL API key to load live arrivals with your quota.",
        );
        return;
      }

      try {
        const client = await createBrowserTflClient(appKey);
        if (cancelled) return;

        stopPoll = client.realtime.pollArrivals(
          {
            stopPointIds: pollStopIds,
            sortBy: "timeToStation",
            intervalMs: pollMs,
            immediate: true,
          },
          (arrivals) => {
            if (cancelled || paused) return;
            void tagStopArrivals(arrivals, async () =>
              client.line.getArrivals({ lineIds: sharedTrackIds }),
            ).then((tagged) => {
              if (cancelled || paused) return;
              applySuccess(tagged);
            });
          },
          (caught) => {
            if (cancelled) return;
            const translated = translateTflClientError(caught, [appKey]);
            if (
              !usingOverride &&
              (translated.kind === "invalid-key" ||
                translated.kind === "rate-limited")
            ) {
              markInvalid(translated);
            }
            applyFailure(translated.message);
          },
        );
      } catch (caught) {
        if (cancelled) return;
        const appKeyForRedact = resolveUserKey() ?? "";
        const translated = translateTflClientError(caught, [appKeyForRedact]);
        if (
          !usingOverride &&
          (translated.kind === "invalid-key" ||
            translated.kind === "rate-limited")
        ) {
          markInvalid(translated);
        }
        applyFailure(translated.message);
      }
    };

    const handleVisibility = () => {
      const hidden = shouldPausePollingForVisibility(document.visibilityState);
      if (hidden) {
        paused = true;
        clearTimer();
        stopPoll?.();
        stopPoll = undefined;
        return;
      }

      paused = false;
      if (source === "site") {
        void runSiteLoad();
      } else {
        void startUserPoll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    if (shouldPausePollingForVisibility(document.visibilityState)) {
      paused = true;
    } else if (source === "site") {
      void runSiteLoad();
    } else {
      void startUserPoll();
    }

    return () => {
      cancelled = true;
      clearTimer();
      stopPoll?.();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [
    pathKey,
    pollMs,
    source,
    trimmedStop,
    pollStopKey,
    sharedTrackKey,
    isInvalid,
    usingOverride,
    overrideKey,
    getAppKey,
    markInvalid,
  ]);

  if (isInvalid) {
    return {
      data: [],
      loading: false,
      fetchError: credentialError?.message ?? INVALID_KEY_FALLBACK,
      tick,
      source,
    };
  }

  if (!trimmedStop) {
    return {
      data: [],
      loading: false,
      fetchError: null,
      tick,
      source,
    };
  }

  return {
    data,
    loading,
    fetchError: pollError,
    tick,
    source,
  };
};
