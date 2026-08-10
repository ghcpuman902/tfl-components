---
name: Re-hide FindPhrase after match
overview: Auto re-hide the FindPhrase chips in StationName a couple of seconds after find-in-page reveals them, restarting the timer if the browser re-matches the same element (e.g. user searches again or cycles matches back to it).
todos:
  - id: implement-rehide
    content: Add beforematch listener + restart-on-rematch timeout to FindPhrase in station-name.tsx
    status: completed
  - id: verify-headful
    content: Verify reveal -> re-hide -> re-reveal-on-rematch cycle with headful browser CDP testing, check for flicker/fight with active match
    status: completed
isProject: false
---

## Why this is tricky

Chrome has no "find bar closed" event. The only signal page JS gets is `beforematch`, fired right before the browser flips a `hidden="until-found"` element to visible. There's no matching "hide again" event — per Chrome's own docs and community write-ups (schepp.dev, knowler.dev), the standard workaround is: listen for `beforematch`, then re-apply `hidden="until-found"` after a short delay, restarting the delay if `beforematch` fires again on the same element.

That's exactly the behaviour requested: reveal → wait ~1.5s → re-hide, but if the user re-triggers a match on that element before the timer fires, cancel and restart the countdown.

## Where it lives

[components/tfl/station-name.tsx](components/tfl/station-name.tsx) — the `FindPhrase` component (around lines 122-142). This is shared by every `StationName` consumer (arrivals boards, diagrams, the docs demo), so the fix applies everywhere at once, per your answer.

## Implementation

Attach a `beforematch` listener to the actual `hidden="until-found"` element (reached via `wrapperRef.current.firstElementChild`, since the markup is injected with `dangerouslySetInnerHTML` to dodge React's boolean-only `hidden` typing). On each `beforematch`:

1. Clear any pending re-hide timeout.
2. Start a new `setTimeout(() => el.setAttribute("hidden", "until-found"), REHIDE_DELAY_MS)`.

Clean up the listener and pending timeout on unmount / text change.

```tsx
const REHIDE_DELAY_MS = 1500;

const FindPhrase = ({ text }: { text: string }) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = wrapperRef.current?.firstElementChild;
    if (!(el instanceof HTMLElement)) return;

    if (!("onbeforematch" in document.body)) {
      el.removeAttribute("hidden");
      el.style.opacity = "0";
      return;
    }

    let rehideTimer: ReturnType<typeof setTimeout> | undefined;
    const handleBeforeMatch = () => {
      if (rehideTimer) clearTimeout(rehideTimer);
      rehideTimer = setTimeout(() => {
        el.setAttribute("hidden", "until-found");
      }, REHIDE_DELAY_MS);
    };

    el.addEventListener("beforematch", handleBeforeMatch);
    return () => {
      el.removeEventListener("beforematch", handleBeforeMatch);
      if (rehideTimer) clearTimeout(rehideTimer);
    };
  }, [text]);

  return (
    <span
      ref={wrapperRef}
      className="contents"
      dangerouslySetInnerHTML={{ __html: /* unchanged */ }}
    />
  );
};
```

Firefox/Safari path (no `onbeforematch`) is untouched — they already fall back to a permanently `opacity: 0` match target, since they have no reveal/re-hide mechanism to restart in the first place.

## Known risk to verify

Chrome may try to keep the *currently active* find match visible. If the user is dwelling on this match when our timer fires and hides it, the browser could immediately fight back (re-reveal) or leave a stale highlight over hidden content. This wasn't documented anywhere I found, so I'll verify with the headful browser (same `browser_cdp` + `#:~:text=` technique used earlier):

1. Reveal via a text-fragment match, confirm the chip is visible.
2. Wait ~1.7s, confirm `hidden="until-found"` is re-applied.
3. Re-trigger the same match again and confirm it reveals and the countdown restarts (no premature hide).
4. Screenshot to check there's no visual flicker/fight while the match is "active" in Chrome's find UI.

If step 4 turns up a fight with the browser, I'll report back before deciding on a mitigation (e.g. longer delay, or hiding only on `blur`/`click` instead) rather than silently picking one.

## Out of scope

No unit test added — this is a browser-timing behavior that `node:test` can't exercise; verification is via headful CDP as above, consistent with how the original `hidden="until-found"` bug was diagnosed earlier in this session.
