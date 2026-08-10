import Link from "next/link";
import { APP_VERSION_LABEL } from "@/lib/version";

export const SiteFooter = () => {
  return (
    <footer className="mt-auto border-t border-border px-4 py-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-center text-sm text-muted-foreground">
        <p>
          Open React components for London transport · press{" "}
          <kbd className="rounded border px-1 text-xs">d</kbd> for dark mode
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
          <Link
            href="/drafts"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Drafts
          </Link>
          <span aria-hidden>·</span>
          <a
            href={`https://github.com/ghcpuman902/tfl-components/releases/tag/${APP_VERSION_LABEL}`}
            className="underline-offset-4 hover:text-foreground hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {APP_VERSION_LABEL}
          </a>
        </p>
      </div>
    </footer>
  );
};
