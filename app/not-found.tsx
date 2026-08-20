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
        That route is not part of tfl-components. Browse the components
        catalogue or go home.
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
    </div>
  )
}
