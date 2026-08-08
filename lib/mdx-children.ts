import { Children, type ReactNode } from "react";

/**
 * MDX/GFM often inserts `"\\n"` text nodes between table/list tags.
 * Those are invalid HTML children of table/thead/tbody/tr and cause hydration errors.
 */
export const compactMdxChildren = (children: ReactNode): ReactNode[] =>
  Children.toArray(children).filter(
    (child) => typeof child !== "string" || child.trim() !== "",
  );
