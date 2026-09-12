import type { ReactNode } from "react"

/** Prefetch this segment's static App Shell, not its live TfL data. */
export const prefetch = "partial"

/**
 * Persistent docs segment. Sibling pages (`/docs/a` → `/docs/b`) share this
 * layout; each leaf `loading.tsx` is the Suspense that actually covers that
 * navigation (a parent `loading.tsx` sits above the re-render scope).
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return children
}
