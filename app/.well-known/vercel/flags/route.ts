import { createFlagsDiscoveryEndpoint, getProviderData } from "flags/next"
import * as flags from "@/flags"

/**
 * Flags Explorer discovery. Authenticated with FLAGS_SECRET.
 * Publishes flag metadata only — does not evaluate flags during page render.
 */
export const GET = createFlagsDiscoveryEndpoint(() => getProviderData(flags))
