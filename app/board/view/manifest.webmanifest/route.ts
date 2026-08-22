import {
  BOARD_VIEW_MANIFEST,
  BOARD_VIEW_MANIFEST_HEADERS,
} from "@/lib/tfl/board-view-manifest"

export const GET = () =>
  new Response(JSON.stringify(BOARD_VIEW_MANIFEST), {
    headers: BOARD_VIEW_MANIFEST_HEADERS,
  })
