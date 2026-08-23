export type FontPreference = "p22" | "hammersmith"

export const FONT_STORAGE_KEY = "tfl-font-pref"

export const typekitStylesheetHref = (kitId: string) =>
  `https://use.typekit.net/${kitId}.css`

/** Legacy `"default"` was Hammersmith One when that face was the site default. */
export const isHammersmithStoredPref = (stored: string | null) =>
  stored === "hammersmith" || stored === "default"

export const resolveFontPreference = (
  stored: string | null,
  adobeFontsConfigured: boolean
): FontPreference => {
  if (!adobeFontsConfigured) return "hammersmith"
  if (isHammersmithStoredPref(stored)) return "hammersmith"
  return "p22"
}

/**
 * Apply P22 Underground before paint unless the visitor opted into
 * Hammersmith One. Typekit stays off the Hammersmith path.
 */
export const fontPreferenceBootScript = (kitId: string) =>
  `(function(){try{var p=localStorage.getItem(${JSON.stringify(FONT_STORAGE_KEY)});if(p==="hammersmith"||p==="default")return;var d=document.documentElement;d.setAttribute("data-font","p22");d.setAttribute("data-tfl-type-profile","johnston-compatible");if(document.querySelector('link[data-tfl-typekit="true"]'))return;var l=document.createElement("link");l.rel="stylesheet";l.href=${JSON.stringify(typekitStylesheetHref(kitId))};l.dataset.tflTypekit="true";l.media="print";l.onload=function(){this.media="all"};document.head.appendChild(l);}catch(e){}})();`
