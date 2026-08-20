import Link from "next/link"
import { getDocsEntry } from "@/lib/docs-catalog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type RelationshipBadgesProps = {
  builtWith?: readonly string[]
  usesFoundations?: readonly string[]
  usedBy?: readonly string[]
  className?: string
}

const BadgeLink = ({ slug }: { slug: string }) => {
  const entry = getDocsEntry(slug)
  if (!entry) return null

  return (
    <Link
      href={entry.href}
      className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Badge variant="secondary" className="font-normal hover:bg-secondary/80">
        {entry.title}
      </Badge>
    </Link>
  )
}

const Row = ({ label, slugs }: { label: string; slugs: readonly string[] }) => {
  const resolved = slugs.map((slug) => getDocsEntry(slug)).filter(Boolean)
  if (resolved.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {slugs.map((slug) => (
        <BadgeLink key={slug} slug={slug} />
      ))}
    </div>
  )
}

/** Compact linked relationship row for Interfaces, Blocks, Primitives, Foundations. */
export const RelationshipBadges = ({
  builtWith = [],
  usesFoundations = [],
  usedBy = [],
  className,
}: RelationshipBadgesProps) => {
  if (
    builtWith.length === 0 &&
    usesFoundations.length === 0 &&
    usedBy.length === 0
  ) {
    return null
  }

  return (
    <div className={cn("space-y-2", className)} aria-label="Related surfaces">
      <Row label="Built with" slugs={builtWith} />
      <Row label="Uses foundations" slugs={usesFoundations} />
      <Row label="Used by" slugs={usedBy} />
    </div>
  )
}
