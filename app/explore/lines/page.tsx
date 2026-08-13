import { redirect } from "next/navigation";
import { mapLegacyBrowseLinesRedirect } from "@/lib/tfl/explorer-legacy-redirects";

export default function BrowseLinesRedirect() {
  redirect(mapLegacyBrowseLinesRedirect());
}
