import { Children, isValidElement, type ReactNode } from "react"

export const getHeadingText = (children: ReactNode): string => {
  const parts: string[] = []

  Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      parts.push(String(child))
      return
    }

    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.props.children
    ) {
      parts.push(getHeadingText(child.props.children))
    }
  })

  return parts.join("")
}

export const slugifyHeading = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
