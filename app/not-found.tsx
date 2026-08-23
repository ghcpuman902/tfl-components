import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Page not found",
}

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-start justify-center gap-4 px-4 py-16">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-medium text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        That route is not part of tfl-components. Browse the documentation, or
        use the agent guide and sitemap to find the nearest public resource.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button nativeButton={false} render={<Link href="/" />}>
          Home
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/docs/components" />}
          variant="outline"
        >
          Browse components
        </Button>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <Link href="/docs" className="underline underline-offset-4">
            Documentation index
          </Link>
        </li>
        <li>
          <a href="/llms.txt" className="underline underline-offset-4">
            Agent guide (llms.txt)
          </a>
        </li>
        <li>
          <a href="/sitemap.xml" className="underline underline-offset-4">
            XML sitemap
          </a>
        </li>
      </ul>
    </div>
  )
}
