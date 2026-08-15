---
name: tfl-copy-audit
description: Audit and rewrite user-facing copy in the tfl-components documentation and demos. Use when reviewing or drafting page titles, catalogue descriptions, taglines, introductions, section copy, demo labels, instructions, installation prose, metadata, or other public text. Detect implementation leakage, narrated interactions, fixture details, repetition, premature caveats, and generic AI writing while preserving necessary TfL API gotchas, licensing, security, and accessibility guidance. Use for copy reviews and copy changes, not for code comments or internal engineering notes unless the user asks.
---

# TfL copy audit

Keep the documentation concept-first, brief, and confident. Explain the component or TfL concept, then let the demo prove it. Hide the docs site's machinery unless it changes what the reader must do.

## Set the mode

Follow the user's requested scope:

- For an audit or discussion, inspect read-only and propose copy. Do not edit files.
- For a rewrite, edit only the approved copy surfaces. Do not refactor nearby code.
- For a broad audit, include catalogue metadata and repeated demo text, not only visible MDX paragraphs.

## Establish the page's job

Before judging sentences, state in one line what the page helps the reader understand, choose, or use. Treat that as the page's editorial boundary.

For the first fold, prefer this rhythm:

1. Title.
2. One-sentence description or promise.
3. At most one short introductory paragraph when the description is not enough.
4. The primary demo or action.

Do not invent copy to fill every slot. If the title, description, and demo are sufficient, omit the introduction.

## Classify every sentence

Place each sentence in one class before rewriting it:

- **Concept:** explains what the component or TfL entity is. Keep and tighten.
- **Decision:** helps the reader choose an option or approach. Keep near that choice.
- **Correct use:** prevents a realistic implementation, licensing, security, accessibility, or data error. Keep near the relevant action.
- **Site machinery:** describes caching, fixtures, seeds, fallback data, quota management, storage, or other demo infrastructure. Cut from product copy.
- **Interaction narration:** tells the reader to click, type, resize, or open something whose affordance and result are already obvious. Cut.
- **Visible repetition:** restates a heading, label, example value, control, or state already shown. Cut.

Keep a sentence only when it helps the reader understand the subject, make a decision, or use it correctly. Technical truth alone is not enough.

## Apply the tests

Ask these questions in order:

1. **Subject test:** Is this about the documented thing, or about how this site demonstrates it?
2. **Knowledge test:** Does it tell the reader something they cannot already see or safely infer?
3. **Decision test:** Will it change a choice or prevent a likely mistake?
4. **Timing test:** Is this information placed where the reader encounters the choice or problem?
5. **Demo test:** Can the interface explain this by itself?

Cut text that fails the first three tests. Move text that passes but fails the timing test. Let the demo carry text that fails the demo test.

## Keep implementation boundaries clear

Do not put these in a tagline, introduction, demo caption, or catalogue description unless they change the reader's immediate action:

- cached or fixture examples
- seed data and featured example selection
- request quota or the cost-saving reason for a product decision
- search radius or fixture location
- browser storage and fallback mechanics
- internal inspector, polling, streaming, or fetch behavior
- API-key prompts before live data is requested

Operational detail may belong in Installation, Getting the data, Security, Troubleshooting, or an inline prompt shown when live data is requested. Explain the reader's action there, not the internal rationale.

Preserve details that prevent incorrect output. StopPoint sibling selection, shared-track identity, licensing limits, key handling, and accessibility behavior are useful when they affect implementation. Keep them out of the opening unless they define the page itself.

## Rewrite in the house voice

- Use plain words and concrete TfL nouns.
- Prefer short sentences with one idea each.
- Name the thing directly. Avoid generic claims such as "flexible", "powerful", or "seamless".
- Do not narrate the page or address the reader without a reason.
- Do not add subtitles or captions to self-explanatory demos.
- Keep terminology stable. Do not cycle between synonyms for variety.
- Use sentence case and restrained punctuation.
- Treat metadata descriptions as public copy, not SEO storage or setup instructions.
- Distinguish arrivals from departures when the data or display makes that distinction.

## Report the audit

Lead with the editorial diagnosis. Then report only actionable findings, ordered by impact.

For each finding, include:

- location
- current wording or a short identifying excerpt
- failure pattern
- disposition: cut, move, keep, or rewrite
- proposed final copy when rewriting

Separate required changes from optional polish. Call out important technical text that should remain so brevity does not erase useful guidance.

End with the proposed first-fold copy as one continuous block when a page-level rewrite is in scope.

## Calibration examples

Cut implementation leakage:

> Open a Point or Line from a cached example, then search live with your own TfL key.

Prefer the concept:

> Explore how TfL stations, stops, docks, and lines relate.

Cut narrated behavior:

> Click one and the inspector opens a cached example.

Keep the non-obvious distinction:

> Points are stations, stops, and docks. Lines are the routes that serve them.

Move a necessary key instruction to the moment live data is requested. Do not announce quota, cache policy, or typing behavior in advance.
