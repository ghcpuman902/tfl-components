import { flag } from "@vercel/flags/next"
import {
  LANDING_EXPERIMENT_KEY,
  type LandingAssignmentVariant,
} from "@/lib/landing/experiment"

/**
 * Vercel Flags declaration for the homepage landing experiment.
 * Assignment is decided in `lib/landing/assignment.ts` (server cookie + QA).
 * This flag stays `control` until the staged Board is production.
 * FLAGS_SECRET is only required for the toolbar / encrypted overrides —
 * see docs/vercel.md. Do not call this flag during render until that is set.
 */
export const landingVariantFlag = flag<LandingAssignmentVariant>({
  key: LANDING_EXPERIMENT_KEY,
  description: "Homepage landing variant. Desktop A/B only when enabled.",
  options: [
    { value: "control", label: "Current homepage" },
    { value: "simple", label: "Simple" },
    { value: "room", label: "Room" },
  ],
  decide: () => "control",
})
