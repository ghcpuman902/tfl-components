import { redirect } from "next/navigation";

const SLUG_MAP: Record<string, string> = {
  "branch-strip": "/docs/branch-strip",
  "station-name": "/docs/station-name-labels",
};

type PageProps = { params: Promise<{ slug: string }> };

export default async function PrimitivesSlugRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(SLUG_MAP[slug] ?? "/docs/components");
}
