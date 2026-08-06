# Dev.to article outline

**Title:** Building London tube status components on a typed TfL client

**Tags:** nextjs, typescript, react, opensource

## Outline

1. **Why two repos.** An API client should stay zero-dependency. React boards cannot live there without dragging in a UI stack. Split them.

2. **What tfl-ts already gives you.** Friendly wrappers, full raw coverage, build-time metadata (`LINE_NAMES`, colours, severity). Link npm + brief code sample for `line.getStatus`.

3. **The UI contract.** Fetch once, then style. Disruptions first via `sortLinesBySeverityAndOrder` + `isNormalService`. Brand with `getLineCssProps`. Bus ≠ tube.

4. **Registry distribution.** Why not publish `tfl-components` to npm. Users copy source with shadcn, own upgrades, keep credentials in their env.

5. **Dark mode Northern line.** Soft glows erase brand identity. Hard outline ring keeps black fill readable.

6. **Rate limits and caching.** ~60s for status. ≥10–15s for arrivals. Free TfL keys still have limits.

7. **Try it.** Demo link, install one-liner, GitHub links.

## Closing

Point readers at the live demo and invite PRs for journey / disruption boards. Do not claim official TfL affiliation.
