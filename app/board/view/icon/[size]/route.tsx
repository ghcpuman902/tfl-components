import { ImageResponse } from "next/og"
import { placeholderRoundelMark } from "@/lib/brand/placeholder-roundel-icon"

const ICON_SIZES = [192, 512] as const
type IconSize = (typeof ICON_SIZES)[number]

type RouteContext = {
  params: Promise<{ size: string }>
}

const parseIconSize = (value: string): IconSize | null => {
  const size = Number.parseInt(value, 10)
  return ICON_SIZES.includes(size as IconSize) ? (size as IconSize) : null
}

export const GET = async (_request: Request, context: RouteContext) => {
  const { size: rawSize } = await context.params
  const size = parseIconSize(rawSize)
  if (!size) {
    return new Response("Not found", { status: 404 })
  }
  return new ImageResponse(placeholderRoundelMark(size), {
    width: size,
    height: size,
  })
}
