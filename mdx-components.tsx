import type { MDXComponents } from "mdx/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MdxSyntaxPre } from "@/components/docs/syntax-highlighted-code";
import { compactMdxChildren } from "@/lib/mdx-children";
import { getHeadingText, slugifyHeading } from "@/lib/heading-slug";

const headingLinkClass = "no-underline hover:underline";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h1: ({ children }) => {
      const id = slugifyHeading(getHeadingText(children)) || "heading";
      return (
        <h1
          id={id}
          className="scroll-m-20 text-3xl font-bold"
        >
          <a href={`#${id}`} className={headingLinkClass}>
            {children}
          </a>
        </h1>
      );
    },
    h2: ({ children }) => {
      const id = slugifyHeading(getHeadingText(children)) || "heading";
      return (
        <h2 className="mt-10 scroll-m-20 border-b pb-2 text-2xl font-semibold first:mt-0">
          <a href={`#${id}`} id={id} className={headingLinkClass}>
            {children}
          </a>
        </h2>
      );
    },
    h3: ({ children }) => {
      const id = slugifyHeading(getHeadingText(children)) || "heading";
      return (
        <h3 className="mt-8 scroll-m-20 text-xl font-semibold">
          <a href={`#${id}`} id={id} className={headingLinkClass}>
            {children}
          </a>
        </h3>
      );
    },
    h4: ({ children }) => {
      const id = slugifyHeading(getHeadingText(children)) || "heading";
      return (
        <h4 className="scroll-m-20 text-lg font-semibold">
          <a href={`#${id}`} id={id} className={headingLinkClass}>
            {children}
          </a>
        </h4>
      );
    },

    table: ({ children }) => (
      <div className="my-6 w-full overflow-y-auto">
        <Table className="w-full">{compactMdxChildren(children)}</Table>
      </div>
    ),
    thead: ({ children }) => (
      <TableHeader>{compactMdxChildren(children)}</TableHeader>
    ),
    tbody: ({ children }) => (
      <TableBody>{compactMdxChildren(children)}</TableBody>
    ),
    tr: ({ children }) => (
      <TableRow className="m-0 border-t p-0">
        {compactMdxChildren(children)}
      </TableRow>
    ),
    th: ({ children }) => (
      <TableHead className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right">
        {children}
      </TableHead>
    ),
    td: ({ children }) => (
      <TableCell className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right">
        {children}
      </TableCell>
    ),

    p: ({ children }) => (
      <p className="leading-7 [&:not(:first-child)]:mt-6 max-w-prose">
        {children}
      </p>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="font-medium text-primary underline underline-offset-4"
      >
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-6 border-l-2 pl-6 italic text-muted-foreground">
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
        typeof className === "string" && className.includes("language-");
      if (isBlock) {
        return <code className={className}>{children}</code>;
      }
      return (
        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
          {children}
        </code>
      );
    },
  };
}
