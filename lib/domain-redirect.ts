import { LEGACY_SITE_HOSTS, SITE_URL } from "./site"

/**
 * Host-based 301 from the old address to {@link SITE_URL}, same path and
 * query (Next.js redirects keep the query string).
 *
 * Off unless `DOMAIN_REDIRECT=1` is set at build time, so production keeps
 * serving tfl.manglekuo.com until the move is approved. To switch it on:
 * add `DOMAIN_REDIRECT=1` to the Production environment in Vercel and
 * redeploy. To rehearse on a preview, also set `DOMAIN_REDIRECT_HOSTS`
 * (comma-separated) to a preview alias, e.g. the branch alias, so that
 * alias redirects while the deployment's own URL keeps working.
 */
export type DomainRedirectEnv = {
  DOMAIN_REDIRECT?: string
  DOMAIN_REDIRECT_HOSTS?: string
}

export const domainRedirectHosts = (env: DomainRedirectEnv): string[] => {
  if (env.DOMAIN_REDIRECT !== "1") return []
  const extra = (env.DOMAIN_REDIRECT_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
  const target = new URL(SITE_URL).host
  return [...new Set([...LEGACY_SITE_HOSTS, ...extra])].filter(
    (host) => host !== target
  )
}

export const domainRedirects = (env: DomainRedirectEnv) =>
  domainRedirectHosts(env).map((host) => ({
    source: "/:path*",
    has: [{ type: "host" as const, value: host }],
    destination: `${SITE_URL}/:path*`,
    statusCode: 301 as const,
  }))
