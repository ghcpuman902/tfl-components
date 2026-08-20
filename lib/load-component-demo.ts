import type { ComponentType } from "react"

const toPascalCase = (slug: string) =>
  slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")

/**
 * Load `components/docs/demos/{slug}-demo.tsx`.
 * Prefers default export, then `{Pascal}Demo` named export.
 */
export const loadComponentDemo = async (
  slug: string
): Promise<ComponentType | null> => {
  try {
    const demoModule = await import(`@/components/docs/demos/${slug}-demo`)
    if (demoModule.default) return demoModule.default as ComponentType
    const named = demoModule[`${toPascalCase(slug)}Demo`]
    if (named) return named as ComponentType
    return null
  } catch {
    return null
  }
}
