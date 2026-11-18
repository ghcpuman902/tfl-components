/** `/board/view?shared=1` marks a Board opened from someone's short link. */
export const BOARD_SHARED_PARAM = "shared"
const DISMISS_KEY = "tfl-board-shared-strip-dismissed"

export const isSharedArrival = (search: string): boolean =>
  new URLSearchParams(search).get(BOARD_SHARED_PARAM) === "1"

export const readSharedStripDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1"
  } catch {
    return false
  }
}

export const writeSharedStripDismissed = (): void => {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1")
  } catch {
    // Private mode: the strip may show again on the next shared link.
  }
}

/** Short-link share targets for the fallback sheet. */
export const shareTargets = (url: string, title: string) => {
  const text = `${title} ${url}`
  return [
    {
      id: "messages",
      label: "Messages",
      href: `sms:&body=${encodeURIComponent(text)}`,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(text)}`,
    },
    {
      id: "x",
      label: "X",
      href: `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    {
      id: "mail",
      label: "Mail",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
    },
  ] as const
}
