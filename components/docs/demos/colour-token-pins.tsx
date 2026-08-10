/**
 * Visually hidden swatches with every generated `bg-tfl-*` / `text-tfl-*`
 * utility as a complete class string. Production Tailwind only keeps theme
 * colours it can see statically — `data-line` bindings alone are not enough.
 *
 * Keep in sync with `scripts/build-colour-tokens.ts` (`buildColourTokens`).
 */
export const ColourTokenPins = () => (
  <div className="sr-only" aria-hidden="true">
    <span className="bg-tfl-line-bakerloo text-tfl-line-bakerloo" />
    <span className="bg-tfl-line-central text-tfl-line-central" />
    <span className="bg-tfl-line-circle text-tfl-line-circle" />
    <span className="bg-tfl-line-district text-tfl-line-district" />
    <span className="bg-tfl-line-hammersmith-city text-tfl-line-hammersmith-city" />
    <span className="bg-tfl-line-jubilee text-tfl-line-jubilee" />
    <span className="bg-tfl-line-metropolitan text-tfl-line-metropolitan" />
    <span className="bg-tfl-line-northern text-tfl-line-northern" />
    <span className="bg-tfl-line-piccadilly text-tfl-line-piccadilly" />
    <span className="bg-tfl-line-victoria text-tfl-line-victoria" />
    <span className="bg-tfl-line-waterloo-city text-tfl-line-waterloo-city" />
    <span className="bg-tfl-line-liberty text-tfl-line-liberty" />
    <span className="bg-tfl-line-lioness text-tfl-line-lioness" />
    <span className="bg-tfl-line-mildmay text-tfl-line-mildmay" />
    <span className="bg-tfl-line-suffragette text-tfl-line-suffragette" />
    <span className="bg-tfl-line-weaver text-tfl-line-weaver" />
    <span className="bg-tfl-line-windrush text-tfl-line-windrush" />
    <span className="bg-tfl-mode-tfl text-tfl-mode-tfl" />
    <span className="bg-tfl-mode-dlr text-tfl-mode-dlr" />
    <span className="bg-tfl-mode-elizabeth text-tfl-mode-elizabeth" />
    <span className="bg-tfl-mode-buses text-tfl-mode-buses" />
    <span className="bg-tfl-mode-cable-car text-tfl-mode-cable-car" />
    <span className="bg-tfl-mode-coaches text-tfl-mode-coaches" />
    <span className="bg-tfl-mode-dial-a-ride text-tfl-mode-dial-a-ride" />
    <span className="bg-tfl-mode-overground text-tfl-mode-overground" />
    <span className="bg-tfl-mode-river text-tfl-mode-river" />
    <span className="bg-tfl-mode-trams text-tfl-mode-trams" />
    <span className="bg-tfl-mode-underground text-tfl-mode-underground" />
    <span className="bg-tfl-mode-cycles text-tfl-mode-cycles" />
  </div>
);
