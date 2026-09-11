/**
 * iOS Safari (and other browsers) paint the top chrome from
 * `meta[name="theme-color"]`. Media queries follow the OS, not the site
 * light/dark selector. Lock the tag to the resolved theme so the bar
 * matches the header (`bg-background` → these hexes).
 */

export const THEME_STORAGE_KEY = "theme"

export const THEME_COLOR_LIGHT = "#ffffff"
export const THEME_COLOR_DARK = "#0a0a0a"

export type ThemePreference = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const SITE_VIEWPORT_THEME_COLOR = [
  { media: "(prefers-color-scheme: light)", color: THEME_COLOR_LIGHT },
  { media: "(prefers-color-scheme: dark)", color: THEME_COLOR_DARK },
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
 * choice (the header selector) needs a single locked tag.
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
  remove: () => void
}

export const applyThemeColorMeta = (color: string, doc: ThemeColorDocument) => {
  const metas = [...doc.querySelectorAll('meta[name="theme-color"]')]
  const standalone = metas.find((meta) => !meta.getAttribute("media"))

  for (const meta of metas) {
    if (meta !== standalone) {
      meta.remove()
    }
  }

  if (standalone) {
    standalone.setAttribute("content", color)
    return
  }

  const meta = doc.createElement("meta")
  meta.setAttribute("name", "theme-color")
  meta.setAttribute("content", color)
  doc.head.appendChild(meta)
}

/** Runs before paint. Locks theme-color when localStorage has light or dark. */
export const themeColorBootScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(s!=="light"&&s!=="dark")return;var c=s==="dark"?${JSON.stringify(THEME_COLOR_DARK)}:${JSON.stringify(THEME_COLOR_LIGHT)};var metas=document.querySelectorAll('meta[name="theme-color"]');var standalone=null;for(var i=0;i<metas.length;i++){if(!metas[i].getAttribute("media"))standalone=metas[i];}for(var j=0;j<metas.length;j++){if(metas[j]!==standalone)metas[j].remove();}if(standalone){standalone.setAttribute("content",c);return;}var m=document.createElement("meta");m.setAttribute("name","theme-color");m.setAttribute("content",c);document.head.appendChild(m);}catch(e){}})();`
