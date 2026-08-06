# Reddit — r/webdev (Showoff Saturday only)

**Title:** [Showoff Saturday] Live London tube status board with official line colours

**Body:**

[screenshot: /status light mode]

[screenshot: /status dark mode — Northern stays black with an outline ring]

Built this as React components on top of a typed TfL client. Demo is here:

https://tfl-components.vercel.app/status

If you want the same board in your Next app:

```bash
pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/tube-status-board.json
```

Source lands in your repo. Credentials stay in your env.
