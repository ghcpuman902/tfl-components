# Launch plan

## Order of operations

1. Demo is live (done): https://tfl-components.vercel.app
2. Point `tfl.manglekuo.com` at the project (DNS CNAME at GoDaddy → `cname.vercel-dns.com`)
3. Take screenshots of `/status` and `/arrivals` in light and dark mode
4. Update tfl-ts README with those screenshots and the demo link
5. Post to channels below, demo URL first, npm package second

## Domain

Until DNS is set, use `https://tfl-components.vercel.app` in posts.

After DNS:

```
CNAME  tfl  cname.vercel-dns.com
```

Then prefer `https://tfl.manglekuo.com`.

## Channel notes

### r/webdev

Only on **Showoff Saturday**. Lead with a screenshot. Short caption. Link the live board. Do not open with "I built a TypeScript client".

### r/nextjs and r/reactjs

Fine any day. Frame as React/Next components you can copy with shadcn, backed by a typed client. Include the one-liner install.

### r/london

Useful-resident angle only. "Live tube status board with official line colours" beats "open source library". Soft-link the repo at the end. Mods remove pure promo.

### Hacker News (Show HN)

Title format: `Show HN: tfl-components – London tube status boards you can copy into a Next.js app`

First comment should cover the interesting bit: OpenAPI-generated types in tfl-ts, zero runtime deps in the client, registry distribution so users own the React source.

### Dev.to / blog

Longer write-up. Good for search. Link both the demo and tfl-ts npm.

## What not to do

- Do not post the same text to every subreddit on the same day.
- Do not lead with MCP / AI-agent framing on Reddit. Developers building UIs care about the boards.
- Do not claim official TfL endorsement.
- Do not use the roundel in promotional images.

## Assets to capture before posting

- `/status` light + dark
- `/arrivals` with a stop selected
- `/line-badge` showing Northern dark outline
- Optional 10–15s GIF of arrivals polling
