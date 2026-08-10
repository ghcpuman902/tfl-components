import { redirect } from "next/navigation";

const SLUG_MAP: Record<string, string> = {
  "arrivals-board": "/docs/tube-rail-arrivals",
  "tube-status-board": "/docs/tube-rail-status",
  "cycle-hire-docks": "/docs/cycle-hire-docks",
  "line-strip": "/docs/line-strip",
};

type PageProps = { params: Promise<{ slug: string }> };

export default async function InterfacesSlugRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(SLUG_MAP[slug] ?? "/docs/components");
}
