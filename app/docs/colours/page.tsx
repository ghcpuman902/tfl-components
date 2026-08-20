import { redirect } from "next/navigation"

/** Preferred spelling — canonical page remains `/docs/colors` for now. */
export default function DocsColoursRedirectPage() {
  redirect("/docs/colors")
}
