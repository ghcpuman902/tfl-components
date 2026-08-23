import {
  LLMS_TEXT,
  MARKDOWN_RESPONSE_HEADERS,
} from "@/lib/agent/machine-content"

export function GET() {
  return new Response(LLMS_TEXT, { headers: MARKDOWN_RESPONSE_HEADERS })
}
