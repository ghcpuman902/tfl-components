"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-start justify-center gap-4 px-4 py-16">
      <p className="text-sm font-medium text-muted-foreground">Something went wrong</p>
      <h1 className="text-2xl font-medium text-foreground">
        This page could not be loaded
      </h1>
      <p className="text-sm text-muted-foreground">
        Live TfL data or a page render failed. You can try again, or go back to
        the components catalogue.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/docs/components" />}
          variant="outline"
        >
          Browse components
        </Button>
      </div>
    </div>
  );
}
