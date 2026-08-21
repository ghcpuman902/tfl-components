"use client"

import { useEffect } from "react"

type GlobalErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Root-level fallback when the root layout itself fails.
 * Must include its own <html>/<body> — layout chrome is unavailable.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en-GB">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#fff",
          color: "#171717",
        }}
      >
        <main
          style={{
            maxWidth: "32rem",
            margin: "0 auto",
            padding: "4rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#737373" }}>
            Something went wrong
          </p>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 500 }}>
            tfl-components could not load
          </h1>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#525252" }}>
            A root layout error occurred. Try reloading the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              alignSelf: "flex-start",
              padding: "0.5rem 0.875rem",
              border: "1px solid #d4d4d4",
              borderRadius: "0.375rem",
              background: "#171717",
              color: "#fff",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
