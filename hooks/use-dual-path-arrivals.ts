"use client";

import { useEffect, useState } from "react";
import type { RealtimePrediction } from "tfl-ts";
import {
  selectArrivalsDataPath,
  shouldPausePollingForVisibility,
  type DualPathSource,
} from "@/lib/tfl/dual-path-arrivals";
import { createBrowserTflClient } from "@/lib/tfl/browser-tfl-client";
import { translateTflClientError } from "@/lib/tfl/tfl-error-translation";
import { getStopArrivalsAction } from "@/lib/tfl/live-arrivals-action";
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider";

const DEFAULT_POLL_MS = 20_000;

const INVALID_KEY_FALLBACK =
  "Your TfL API key was rejected. Replace or clear it in the sidebar.";

type UseDualPathArrivalsOptions = {
  stopPointId: string;
  pollMs?: number;
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
  pollMs = DEFAULT_POLL_MS,
}: UseDualPathArrivalsOptions): UseDualPathArrivalsResult => {
  const { status, getAppKey, markInvalid, error: credentialError } =
    useUserTflCredentials();
  const source = selectArrivalsDataPath(status);
  const isInvalid = status === "invalid";

  const [data, setData] = useState<RealtimePrediction[]>([]);
  const [pollError, setPollError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const pathKey = `${source}:${status}:${stopPointId}`;

  useEffect(() => {
    if (isInvalid) return;

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
        const result = await getStopArrivalsAction(stopPointId);
        if (cancelled || paused) return;
        if (!result.ok) {
          applyFailure(result.error);
        } else {
          applySuccess(result.arrivals);
        }
      } catch {
        applyFailure("Failed to load arrivals.");
      } finally {
        if (!cancelled && !paused) scheduleSitePoll();
      }
    };

    const startUserPoll = async () => {
      const appKey = getAppKey();
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
            stopPointIds: [stopPointId],
            sortBy: "timeToStation",
            intervalMs: pollMs,
            immediate: true,
          },
          (arrivals) => {
            if (cancelled || paused) return;
            applySuccess(arrivals);
          },
          (error) => {
            if (cancelled) return;
            const translated = translateTflClientError(error, [appKey]);
            if (
              translated.kind === "invalid-key" ||
              translated.kind === "rate-limited"
            ) {
              markInvalid(translated);
            }
            applyFailure(translated.message);
          },
        );
      } catch (error) {
        if (cancelled) return;
        const appKeyForRedact = getAppKey() ?? "";
        const translated = translateTflClientError(error, [appKeyForRedact]);
        if (
          translated.kind === "invalid-key" ||
          translated.kind === "rate-limited"
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
    stopPointId,
    isInvalid,
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

  return {
    data,
    loading,
    fetchError: pollError,
    tick,
    source,
  };
};
