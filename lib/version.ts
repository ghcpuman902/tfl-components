import packageJson from "@/package.json"

/** App version — keep in sync with package.json and GitHub releases (vX.Y.Z). */
export const APP_VERSION = packageJson.version

export const APP_VERSION_LABEL = `v${APP_VERSION}`
