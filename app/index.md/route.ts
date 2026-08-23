import {
  HOME_MARKDOWN,
  MARKDOWN_RESPONSE_HEADERS,
} from "@/lib/agent/machine-content"

export function GET() {
  return new Response(HOME_MARKDOWN, { headers: MARKDOWN_RESPONSE_HEADERS })
}
