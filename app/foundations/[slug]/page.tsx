import { redirect } from "next/navigation";

const SLUG_MAP: Record<string, string> = {
  "line-badge": "/docs/line-badge",
  colours: "/docs/colors",
  colors: "/docs/colors",
  "tfl-roundel": "/docs/tfl-roundel",
};

type PageProps = { params: Promise<{ slug: string }> };

export default async function FoundationsSlugRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(SLUG_MAP[slug] ?? "/docs");
}
