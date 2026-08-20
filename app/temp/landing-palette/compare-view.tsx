import {
  CLASS_TO_TOKEN,
  ID_TOKEN_OVERRIDES,
  ORIGINAL_CLASS_HEX,
  SELECTOR_TOKEN_OVERRIDES,
  TOKENS,
  classesForToken,
  originalHexesForToken,
  paletteStyleSheet,
  tokenCss,
  type LandingScheme,
  type LandingToken,
  type TokenGroup,
  type TokenRole,
} from "./palette"

const SCHEMES: {
  id: "original" | LandingScheme
  label: string
  hint: string
  paper: string
}[] = [
  {
    id: "original",
    label: "Original",
    hint: "96 hexes, as exported",
    paper: "oklch(32% 0.03 55)",
  },
  {
    id: "dark",
    label: "Dark tokens",
    hint: "walls/sofa merged; carpet & painting unmerged",
    paper: "oklch(32% 0.03 55)",
  },
  {
    id: "light",
    label: "Light tokens",
    hint: "room lift; sofa cream-pink; original wood; kickers stay dark",
    paper: "oklch(94% 0.015 75)",
  },
]

const SECTIONS: {
  id: TokenGroup
  title: string
  compact?: boolean
}[] = [
  { id: "room", title: "Room — walls & floor lift; sofa cream-pink" },
  { id: "trim", title: "Kickers — stay dark" },
  { id: "scandi", title: "Table & drawer — original wood" },
  { id: "wood", title: "Other wood — frames, hearth, pot (mild lift)" },
  {
    id: "carpet",
    title: "Carpet — field lifts, pattern stays",
    compact: true,
  },
  { id: "painting", title: "Painting — every original ink", compact: true },
  { id: "fixed", title: "Fixed — iPad, plant, lamp, void" },
]

const staysInLight = (role: TokenRole) => role === "fixed" || role === "trim"

const Scene = ({
  scheme,
  svg,
}: {
  scheme: "original" | LandingScheme
  svg: string
}) => {
  const meta = SCHEMES.find((row) => row.id === scheme)!
  return (
    <figure className="min-w-0">
      <div
        aria-label={`${meta.label} landing room`}
        className="overflow-hidden rounded-lg border border-border"
        data-landing-scheme={scheme}
        role="img"
        style={{ background: meta.paper }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="mt-2 space-y-0.5">
        <p className="text-sm font-medium">{meta.label}</p>
        <p className="text-xs text-muted-foreground">{meta.hint}</p>
      </figcaption>
    </figure>
  )
}

const Swatch = ({ colour, label }: { colour: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5 text-xs">
    <span
      className="size-4 shrink-0 rounded-sm border border-border"
      style={{ background: colour }}
      title={label}
    />
    <code className="text-[11px] text-muted-foreground">{label}</code>
  </span>
)

const TokenRow = ({ token }: { token: LandingToken }) => {
  const classes = [
    ...classesForToken(token.id).map((n) => `cls-${n}`),
    ...Object.entries(ID_TOKEN_OVERRIDES)
      .filter(([, tokenId]) => tokenId === token.id)
      .map(([id]) => `#${id}`),
    ...SELECTOR_TOKEN_OVERRIDES.filter((row) => row.tokenId === token.id).map(
      (row) => row.selector,
    ),
  ].join(", ")
  const originals = originalHexesForToken(token.id)
  return (
    <tr className="border-t border-border align-top">
      <td className="py-2 pr-3">
        <code className="text-xs">--landing-{token.id}</code>
        <p className="text-xs text-muted-foreground">{token.label}</p>
      </td>
      <td className="py-2 pr-3">
        <Swatch colour={tokenCss(token, "dark")} label={tokenCss(token, "dark")} />
      </td>
      <td className="py-2 pr-3">
        {staysInLight(token.role) ? (
          <span className="text-xs text-muted-foreground">same</span>
        ) : (
          <Swatch
            colour={tokenCss(token, "light")}
            label={tokenCss(token, "light")}
          />
        )}
      </td>
      <td className="py-2 pr-3">
        <div className="flex flex-wrap gap-1">
          {originals.map((hex) => (
            <Swatch key={hex} colour={hex} label={hex} />
          ))}
        </div>
      </td>
      <td className="max-w-[16rem] py-2 text-xs text-muted-foreground">
        <p>{token.note}</p>
        {classes ? (
          <p className="mt-1 font-mono text-[11px]">{classes}</p>
        ) : null}
      </td>
    </tr>
  )
}

const CompactSwatches = ({ tokens }: { tokens: readonly LandingToken[] }) => (
  <ul className="flex flex-wrap gap-3">
    {tokens.map((token) => {
      const cls = classesForToken(token.id)[0]
      const lifts = !staysInLight(token.role)
      return (
        <li key={token.id} className="flex flex-col gap-1">
          <span className="flex gap-0.5">
            <span
              className="size-6 rounded-sm border border-border"
              style={{ background: tokenCss(token, "dark") }}
              title={`${token.id} dark`}
            />
            {lifts ? (
              <span
                className="size-6 rounded-sm border border-border"
                style={{ background: tokenCss(token, "light") }}
                title={`${token.id} light`}
              />
            ) : null}
          </span>
          <code className="text-[10px] text-muted-foreground">
            {cls != null ? `cls-${cls}` : token.id}
          </code>
        </li>
      )
    })}
  </ul>
)

export const LandingPaletteCompareView = ({ svg }: { svg: string }) => {
  const uniqueOriginal = new Set(
    Object.values(ORIGINAL_CLASS_HEX).map((h) => h.toLowerCase()),
  ).size
  const mappedClasses = Object.keys(CLASS_TO_TOKEN).length

  return (
    <div className="mx-auto max-w-360 space-y-10">
      <style>{paletteStyleSheet()}</style>
      <header className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Temp research — not linked in nav
        </p>
        <h1 className="text-2xl font-semibold">Landing palette</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          {uniqueOriginal} exported hexes across {mappedClasses} SVG classes.
          Walls and sofa still share named tokens; the carpet and wall painting
          keep every original colour. Light mode lifts the room and the rug
          field toward cream, keeps sofa lightness but raises chroma toward a
          peach-pink, keeps the table and drawer on their original wood, and
          leaves kickers, rug pattern, painting ink, and the iPad as they are.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        {SCHEMES.map((row) => (
          <Scene key={row.id} scheme={row.id} svg={svg} />
        ))}
      </section>

      {SECTIONS.map((section) => {
        const tokens = TOKENS.filter((token) => token.group === section.id)
        if (!tokens.length) return null
        return (
          <section key={section.id} className="space-y-3">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            {section.compact ? (
              <CompactSwatches tokens={tokens} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-3xl text-left text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Token</th>
                      <th className="pb-2 font-medium">Dark</th>
                      <th className="pb-2 font-medium">Light</th>
                      <th className="pb-2 font-medium">Merged from</th>
                      <th className="pb-2 font-medium">Used on</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((token) => (
                      <TokenRow key={token.id} token={token} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
