---
name: fresh-chat-when-thrashing
disable-model-invocation: true
description: >-
  Use when a Cursor chat is getting long, looping, or re-deriving the same
  decisions — capture a short state note and start a new chat instead of
  extending a thrash session. Triggers on — long chat, thrashing, looping,
  start fresh, new chat, context too long, going in circles.
metadata:
  short-description: Start a fresh chat when the current one is thrashing
---

# Fresh chat when thrashing

Long Cursor chats are a bad signal. Short chats that go idle after 1–2 turns are a good signal.

## Do this

1. Write a **5-line state note** (and stop coding):
   - Goal
   - Decided
   - Blocked
   - Paths
   - Next action
2. Start a **new chat** with that note + the relevant skill / `AGENTS.md` pointer.
3. Do **not** paste the prior transcript.
4. Prefer one worker stream with deltas over re-briefing full history.
5. If the same files have been rewritten ~3 times, lock the decision before more code (`early-decision-locking`).

## Do not

- Keep extending a 50k+ char thread "just one more fix".
- Re-read whole prior agent transcripts to continue.
