"use client"

import type { ReactNode } from "react"
import { useLinkStatus } from "next/link"
import { cn } from "@/lib/utils"

/**
 * Immediate pending hint for the enclosing `<Link>`.
 * Next.js: use this when `loading.js` prefetch has not finished.
 */
export const LinkPendingHint = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  const { pending } = useLinkStatus()
  return (
    <span className={cn("transition-opacity", pending && "opacity-50", className)}>
      {children}
    </span>
  )
}
