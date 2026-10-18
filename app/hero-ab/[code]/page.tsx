import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { HomeContent } from "@/components/landing/home-content"
import { decodeHeroCode, heroStaticCodes } from "@/lib/landing/hero-precompute"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

/**
 * Static homepage permutations for the hero headline test (flags SDK
 * precompute pattern). The proxy rewrites `/` here, so the URL stays `/`.
 * Same metadata as the homepage, whose canonical is `/`.
 */
export const metadata: Metadata = pageMetadata({
  ...ROUTE_PAGE_META.home,
  absoluteTitle: true,
})

export async function generateStaticParams() {
  return (await heroStaticCodes()).map((code) => ({ code }))
}

export default async function HeroAbPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  let hero: Awaited<ReturnType<typeof decodeHeroCode>>
  try {
    hero = await decodeHeroCode(code)
  } catch {
    notFound()
  }
  return <HomeContent hero={hero} />
}
