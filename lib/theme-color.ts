/**
 * Browser chrome colour.
 *
 * iOS 15–18: `meta[name="theme-color"]`. Media queries follow the OS, not
 * the site selector — lock every tag (light media, dark media, standalone)
 * to the resolved colour so a light site on a dark phone still tints light.
 *
 * iOS 26 Safari: ignores theme-color and samples the sticky header / html
 * background instead. Keep those surfaces on solid `bg-background`.
 */

export const THEME_STORAGE_KEY = "theme"

export const THEME_COLOR_LIGHT = "#ffffff"
export const THEME_COLOR_DARK = "#0a0a0a"

export const THEME_COLOR_LIGHT_MEDIA = "(prefers-color-scheme: light)"
export const THEME_COLOR_DARK_MEDIA = "(prefers-color-scheme: dark)"

export type ThemePreference = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const SITE_VIEWPORT_THEME_COLOR = [
  { media: THEME_COLOR_LIGHT_MEDIA, color: THEME_COLOR_LIGHT },
  { media: THEME_COLOR_DARK_MEDIA, color: THEME_COLOR_DARK },
] as const

export const themeColorForResolved = (resolved: ResolvedTheme) =>
  resolved === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT

export const resolveStoredThemePreference = (
  stored: string | null
): ThemePreference => {
  if (stored === "light" || stored === "dark") {
    return stored
  }
  return "system"
}

export const resolvedThemeFromPreference = (
  preference: ThemePreference,
  prefersDark: boolean
): ResolvedTheme => {
  if (preference === "light" || preference === "dark") {
    return preference
  }
  return prefersDark ? "dark" : "light"
}

/**
 * Media-query metas already match the OS. Only an explicit light/dark
 * choice (the header selector) needs a locked colour on every tag.
 */
export const shouldLockThemeColor = (preference: ThemePreference) =>
  preference !== "system"

type ThemeColorDocument = {
  querySelectorAll: (selectors: string) => Iterable<ThemeColorMeta>
  createElement: (tagName: "meta") => ThemeColorMeta
  head: { appendChild: (node: ThemeColorMeta) => void }
}

type ThemeColorMeta = {
  getAttribute: (name: string) => string | null
  setAttribute: (name: string, value: string) => void
}

const insertThemeColorMeta = (
  doc: ThemeColorDocument,
  color: string,
  media?: string
) => {
  const meta = doc.createElement("meta")
  meta.setAttribute("name", "theme-color")
  meta.setAttribute("content", color)
  if (media) {
    meta.setAttribute("media", media)
  }
  doc.head.appendChild(meta)
}

/** Update React-owned metadata in place; removing it breaks route commits. See docs/client-navigation.md. */
export const applyThemeColorMeta = (
  color: string,
  doc: ThemeColorDocument = document as unknown as ThemeColorDocument
) => {
  let hasLight = false
  let hasDark = false
  let hasStandalone = false

  for (const meta of [...doc.querySelectorAll('meta[name="theme-color"]')]) {
    meta.setAttribute("content", color)
    const media = meta.getAttribute("media")
    if (media === THEME_COLOR_LIGHT_MEDIA) hasLight = true
    else if (media === THEME_COLOR_DARK_MEDIA) hasDark = true
    else if (!media) hasStandalone = true
  }

  if (!hasLight) insertThemeColorMeta(doc, color, THEME_COLOR_LIGHT_MEDIA)
  if (!hasDark) insertThemeColorMeta(doc, color, THEME_COLOR_DARK_MEDIA)
  if (!hasStandalone) insertThemeColorMeta(doc, color)
}

/** Runs before paint. Locks every theme-color tag when localStorage is light or dark. */
export const themeColorBootScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(s!=="light"&&s!=="dark")return;var c=s==="dark"?${JSON.stringify(THEME_COLOR_DARK)}:${JSON.stringify(THEME_COLOR_LIGHT)};var light=${JSON.stringify(THEME_COLOR_LIGHT_MEDIA)},dark=${JSON.stringify(THEME_COLOR_DARK_MEDIA)},hasLight=false,hasDark=false,hasStandalone=false;var metas=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<metas.length;i++){var media=metas[i].getAttribute("media");metas[i].setAttribute("content",c);if(media===light)hasLight=true;else if(media===dark)hasDark=true;else if(!media)hasStandalone=true;}var add=function(media){var m=document.createElement("meta");m.setAttribute("name","theme-color");m.setAttribute("content",c);if(media)m.setAttribute("media",media);document.head.appendChild(m);};if(!hasLight)add(light);if(!hasDark)add(dark);if(!hasStandalone)add();}catch(e){}})();`
