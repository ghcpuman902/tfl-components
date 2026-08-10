"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  type ClipboardEvent,
  type CSSProperties,
  type ReactNode,
} from "react";

/** Chrome fires `beforematch` right before reveal but has no "unmatched" event. */
const REHIDE_DELAY_MS = 1500;

const FIND_PHRASE_WRAPPER_CLASS =
  "absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap";
const FIND_PHRASE_CHIP_CLASS =
  "inline-block bg-foreground px-1.5 py-0.5 text-[11px] font-medium leading-none text-background";

const escapeFindText = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Canonical text for Cmd/Ctrl+F when paint wraps (`<br>`) or abbreviates —
 * find-in-page cannot match a phrase across the `<br>` between visual lines.
 *
 * Three constraints shape this:
 * 1. React serialises `hidden` as a boolean (`hidden=""` → `display: none`,
 *    unsearchable), so `until-found` has to be written as raw markup.
 * 2. `until-found` is ignored on `display: inline` / `none`, hence `absolute`.
 * 3. Reveal walks a match's *ancestors*, so the text sits in a child.
 *
 * Firefox / Safari have no `until-found`; they do match `opacity: 0` text.
 *
 * There's also no native "find closed" event, so this re-hides a beat after
 * reveal and restarts the countdown if the browser matches it again.
 */
const FindPhrase = ({ text }: { text: string }) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current?.firstElementChild;
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
      ref={ref}
      className="contents"
      dangerouslySetInnerHTML={{
        __html: `<span hidden="until-found" class="${FIND_PHRASE_WRAPPER_CLASS}"><span class="${FIND_PHRASE_CHIP_CLASS}">${escapeFindText(text)}</span></span>`,
      }}
    />
  );
};

export type FindableTextProps = {
  /** Canonical full text — used for aria-label, clipboard, and find-in-page. */
  text: string;
  /** Extra searchable variants not already covered by the visible paint. */
  aliases?: readonly string[];
  /** Set when the visible paint is already the exact contiguous `text` — skips the redundant reveal chip. */
  paintMatchesText?: boolean;
  /**
   * Escape hatch. Defaults to on — disable only for text that's intentionally
   * decorative/non-identity, and say why at the call site.
   */
  enableFind?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/**
 * Wraps identity text (station names, line names, stop names — anything a
 * user might expect to copy or find-in-page) so that when the visible paint
 * differs from the canonical string — real abbreviation, or a name split
 * across a `<br>` — Cmd/Ctrl+F and copy still resolve the full name.
 *
 * Plain CSS clipping (`truncate`, `line-clamp`, `whitespace-nowrap`) never
 * needs this: the DOM text is unchanged, so the browser already finds and
 * copies it correctly through the clip. Reach for this only when the DOM
 * text itself is not the canonical string. See
 * `.cursor/rules/findable-identity-text.mdc`.
 */
export const FindableText = forwardRef<HTMLSpanElement, FindableTextProps>(
  (
    {
      text,
      aliases = [],
      paintMatchesText = false,
      enableFind = true,
      className,
      style,
      children,
    },
    ref,
  ) => {
    const handleCopy = (event: ClipboardEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.clipboardData.setData("text/plain", text);
    };

    return (
      <span
        ref={ref}
        className={className}
        style={style}
        aria-label={text}
        onCopy={handleCopy}
      >
        {enableFind && !paintMatchesText ? <FindPhrase text={text} /> : null}
        {enableFind
          ? aliases.map((alias) => <FindPhrase key={alias} text={alias} />)
          : null}
        {children}
      </span>
    );
  },
);
FindableText.displayName = "FindableText";
