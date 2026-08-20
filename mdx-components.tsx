import type { MDXComponents } from "mdx/types"
import { MdxSyntaxPre } from "@/components/docs/syntax-highlighted-code"
import { compactMdxChildren } from "@/lib/mdx-children"
import { getHeadingText, slugifyHeading } from "@/lib/heading-slug"

const headingLinkClass = "no-underline hover:underline"

/**
 * MDX maps must stay RSC-only (no `"use client"` leaves). Client components
 * break Cache Components `instant` validation with
 * `client reference proxy … module factory is not available`.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h1: ({ children }) => {
      const id = slugifyHeading(getHeadingText(children)) || "heading"
      return (
        <h1 id={id} className="tfl-title text-3xl">
          <a href={`#${id}`} className={headingLinkClass}>
            {children}
          </a>
        </h1>
      )
    },
    h2: ({ children }) => {
      const id = slugifyHeading(getHeadingText(children)) || "heading"
      return (
        <h2
          id={id}
          className="mt-10 scroll-mt-20 text-lg font-semibold text-foreground first:mt-0"
        >
          <a href={`#${id}`} className={headingLinkClass}>
            {children}
          </a>
        </h2>
      )
    },
    h3: ({ children }) => {
      const id = slugifyHeading(getHeadingText(children)) || "heading"
      return (
        <h3
          id={id}
          className="mt-8 scroll-mt-20 text-xl font-medium text-foreground first:mt-0"
        >
          <a href={`#${id}`} className={headingLinkClass}>
            {children}
          </a>
        </h3>
      )
    },
    h4: ({ children }) => {
      const id = slugifyHeading(getHeadingText(children)) || "heading"
      return (
        <h4 id={id} className="text-base font-medium text-foreground">
          <a href={`#${id}`} className={headingLinkClass}>
            {children}
          </a>
        </h4>
      )
    },

    table: ({ children }) => (
      <div className="my-6 w-full overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          {compactMdxChildren(children)}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="[&_tr]:border-b">{compactMdxChildren(children)}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="[&_tr:last-child]:border-0">
        {compactMdxChildren(children)}
      </tbody>
    ),
    tr: ({ children }) => (
      <tr className="m-0 border-t border-b p-0 transition-colors hover:bg-muted/50">
        {compactMdxChildren(children)}
      </tr>
    ),
    th: ({ children }) => (
      <th className="h-10 border px-4 py-2 text-left align-middle font-bold [&[align=center]]:text-center [&[align=right]]:text-right">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border px-4 py-2 text-left align-middle [&[align=center]]:text-center [&[align=right]]:text-right">
        {children}
      </td>
    ),

    p: ({ children }) => <p className="max-w-prose leading-7">{children}</p>,
    a: ({ href, children }) => (
      <a
        href={href}
        className="font-medium text-primary underline underline-offset-4"
      >
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-6 border-l-2 pl-6 text-muted-foreground italic">
        {children}
      </blockquote>
    ),

    ul: ({ children }) => (
      <ul className="my-6 ml-6 list-disc [&>li]:mt-2">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-6 ml-6 list-decimal [&>li]:mt-2">{children}</ol>
    ),

    pre: ({ children, className }) => (
      <MdxSyntaxPre className={className}>{children}</MdxSyntaxPre>
    ),
    code: ({ children, className }) => {
      const isBlock =
        typeof className === "string" && className.includes("language-")
      if (isBlock) {
        return <code className={className}>{children}</code>
      }
      return (
        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
          {children}
        </code>
      )
    },
  }
}
