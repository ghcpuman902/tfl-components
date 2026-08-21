import {
  TFL_API_PORTAL_PRODUCT_URL,
  TFL_API_PORTAL_PROFILE_URL,
  TFL_API_PORTAL_SIGNUP_URL,
  TFL_API_PORTAL_URL,
} from "@/lib/tfl/api-portal"

export type TflApiKeyWalkthroughArrow = {
  /** Percent of the screenshot, 0–100. */
  x: number
  y: number
  /** Degrees clockwise from pointing down. */
  rotate?: number
}

export type TflApiKeyWalkthroughStep = {
  id: string
  src: string
  alt: string
  caption: string
  href?: string
  arrow: TflApiKeyWalkthroughArrow[]
  /** Wider shot (email), not a phone frame. */
  wide?: boolean
}

export const TFL_API_KEY_WALKTHROUGH: readonly TflApiKeyWalkthroughStep[] = [
  {
    id: "a-signup",
    src: "/images/tfl-api-key/a-signup.png",
    alt: "TfL API portal sign-up form",
    caption: "Create a TfL developer account.",
    href: TFL_API_PORTAL_SIGNUP_URL,
    arrow: [{ x: 46, y: 92, rotate: 90 }],
  },
  {
    id: "b-verify-email",
    src: "/images/tfl-api-key/b-verify-email.png",
    alt: "Confirmation email from the TfL API portal",
    caption: "Find the email and follow the link. You probably need to check the spam folder.",
    arrow: [{ x: 84, y: 53, rotate: 90 }],
    wide: true,
  },
  {
    id: "c-signin",
    src: "/images/tfl-api-key/c-signin.png",
    alt: "TfL API portal sign-in form",
    caption: "The confirmation email link will take you to the sign-in page, if not click:",
    href: `${TFL_API_PORTAL_URL}signin`,
    arrow: [{ x: 46, y: 55, rotate: 90 }],
  },
  {
    id: "d-open-products",
    src: "/images/tfl-api-key/d-open-products.png",
    alt: "Portal menu with Products highlighted",
    caption: "Find 'Products' from the menu bar, on mobile it's hidden in the hamburger menu.",
    arrow: [{ x: 90, y: 15, rotate: 180 }, { x: 29, y: 55, rotate: 90 }],
  },
  {
    id: "e-select-500",
    src: "/images/tfl-api-key/e-select-500.png",
    alt: "Products list showing 500 Requests per min",
    caption: "Select '500 Requests per min'.",
    arrow: [{ x: 35, y: 66, rotate: 120 }],
  },
  {
    id: "f-subscribe",
    src: "/images/tfl-api-key/f-subscribe.png",
    alt: "Subscribe form for 500 Requests per min",
    caption: "Name the app and click 'Subscribe'. If you couldn't find this page, click:",
    href: TFL_API_PORTAL_PRODUCT_URL,
    arrow: [{ x: 40, y: 58, rotate: 40 }, { x: 88, y: 64, rotate: 120 }],
  },
  {
    id: "g-copy-key",
    src: "/images/tfl-api-key/g-copy-key.png",
    alt: "Profile page with Primary and Secondary keys",
    caption: "You should be redirected to the profile page. Click 'Show'. Primary or Secondary both work. Copy the key and come back to continue. If you couldn't find this page, click:",
    href: TFL_API_PORTAL_PROFILE_URL,
    arrow: [{ x: 18, y: 98, rotate: 130 }],
  },
]
