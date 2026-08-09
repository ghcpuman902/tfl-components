import { formatStationName } from "@/lib/tfl/diagram-station";
import {
  stationLabelKey,
  type StationLabelRecipe,
} from "@/lib/tfl/station-index";

export { stationLabelKey } from "@/lib/tfl/station-index";

/**
 * Hardwired horizontal-diagram label layout.
 * Used when adjacent labels collide at the shared column pitch —
 * not when a single name overflows its column.
 *
 * Lookup order: Naptan `stationId` / `stationIds`, then normalised name key.
 * Copy / aria always use full `formatStationName`. Find expands abbrs and
 * adds `&`/`and` + apostrophe aliases (see `station-label-find`).
 */
export type HorizontalStationLabelOverride = {
  /** Visible lines on the diagram. */
  lines: readonly string[];
  /**
   * Visual text shortens words (Road→Rd, Street→St).
   * Does not change copy / aria / find canonical handling.
   */
  abbreviated?: boolean;
};

/**
 * Editorial recipes for crowded horizontal spines.
 * Prefer attaching known Naptans; nameKey always present for demos.
 */
export const STATION_LABEL_RECIPES: readonly StationLabelRecipe[] = [
  // Victoria
  { nameKey: "seven sisters", lines: ["Seven", "Sisters"] },
  { nameKey: "oxford circus", stationId: "940GZZLUOXC", lines: ["Oxford", "Circus"] },
  { nameKey: "bond street", lines: ["Bond", "Street"] },

  // Bakerloo / Lioness (+ shared names elsewhere)
  {
    nameKey: "queens park",
    stationId: "940GZZLUQPS",
    lines: ["Queen's", "Park"],
  },
  {
    nameKey: "baker street",
    stationId: "940GZZLUBST",
    lines: ["Baker", "Street"],
  },
  {
    nameKey: "regents park",
    stationId: "940GZZLURGP",
    lines: ["Regent's", "Park"],
  },
  {
    nameKey: "charing cross",
    stationId: "940GZZLUCHX",
    lines: ["Charing", "Cross"],
  },

  // Piccadilly / District (Hammersmith neighbour)
  { nameKey: "barons court", lines: ["Barons", "Court"] },

  // Jubilee / Metropolitan
  { nameKey: "finchley road", lines: ["Finchley", "Road"] },

  // Northern
  { nameKey: "kentish town", lines: ["Kentish", "Town"] },

  // Piccadilly
  { nameKey: "south harrow", lines: ["South", "Harrow"] },
  { nameKey: "finsbury park", lines: ["Finsbury", "Park"] },
  { nameKey: "manor house", lines: ["Manor", "House"] },
  { nameKey: "turnpike lane", lines: ["Turnpike", "Lane"] },
  { nameKey: "wood green", lines: ["Wood", "Green"] },
  { nameKey: "bounds green", lines: ["Bounds", "Green"] },

  // District / H&C (Bromley-by-Bow neighbour)
  { nameKey: "west ham", lines: ["West", "Ham"] },

  // Circle / H&C / Bakerloo (after bracket strip)
  // Bakerloo Edgware Road is a distinct Naptan from Circle/H&C.
  {
    nameKey: "edgware road",
    stationId: "940GZZLUERB",
    lines: ["Edgware", "Road"],
  },
  { nameKey: "edgware road", lines: ["Edgware", "Road"] },

  // Metropolitan
  { nameKey: "moor park", lines: ["Moor", "Park"] },
  { nameKey: "north harrow", lines: ["North", "Harrow"] },
  {
    nameKey: "harrow-on-the-hill",
    lines: ["Harrow-on-", "the-Hill"],
  },
  { nameKey: "preston road", lines: ["Preston", "Road"] },

  // DLR
  { nameKey: "royal victoria", lines: ["Royal", "Victoria"] },
  { nameKey: "royal albert", lines: ["Royal", "Albert"] },

  // Mildmay
  {
    nameKey: "caledonian road & barnsbury",
    lines: ["Caledonian Rd", "& Barnsbury"],
    abbreviated: true,
  },
  {
    nameKey: "camden road",
    lines: ["Camden Rd"],
    abbreviated: true,
  },
  { nameKey: "acton central", lines: ["Acton", "Central"] },
  { nameKey: "south acton", lines: ["South", "Acton"] },

  // Suffragette
  {
    nameKey: "walthamstow queens road",
    lines: ["Walthamstow", "Queen's Rd"],
    abbreviated: true,
  },
  {
    nameKey: "leyton midland road",
    lines: ["Leyton", "Midland Rd"],
    abbreviated: true,
  },

  // Weaver
  {
    nameKey: "london liverpool street",
    lines: ["London", "Liverpool St"],
    abbreviated: true,
  },

  // Bakerloo terminus
  {
    nameKey: "elephant & castle",
    stationId: "940GZZLUEAC",
    lines: ["Elephant", "& Castle"],
  },

  // Tram
  { nameKey: "church street", lines: ["Church", "Street"] },
  { nameKey: "therapia lane", lines: ["Therapia", "Lane"] },
  { nameKey: "phipps bridge", lines: ["Phipps", "Bridge"] },
];

const recipesByStationId = new Map<string, StationLabelRecipe>();
const recipesByNameKey = new Map<string, StationLabelRecipe>();

for (const recipe of STATION_LABEL_RECIPES) {
  if (recipe.stationId) {
    recipesByStationId.set(recipe.stationId, recipe);
  }
  for (const id of recipe.stationIds ?? []) {
    recipesByStationId.set(id, recipe);
  }
  if (recipe.nameKey && !recipesByNameKey.has(recipe.nameKey)) {
    recipesByNameKey.set(recipe.nameKey, recipe);
  }
}

const recipeToOverride = (
  recipe: StationLabelRecipe,
): HorizontalStationLabelOverride => ({
  lines: recipe.lines,
  abbreviated: recipe.abbreviated,
});

/**
 * Resolve a horizontal label recipe by station id (preferred) or raw name.
 */
export const getStationLabelRecipe = (
  rawNameOrId: string,
  stationId?: string,
): StationLabelRecipe | undefined => {
  if (stationId) {
    const byId = recipesByStationId.get(stationId);
    if (byId) return byId;
  }
  const asId = recipesByStationId.get(rawNameOrId);
  if (asId) return asId;

  const displayName = formatStationName(rawNameOrId);
  return recipesByNameKey.get(stationLabelKey(displayName));
};

/**
 * Horizontal-diagram label override for a station, if any.
 * Accepts raw TfL names — `formatStationName` is applied first.
 * Pass `stationId` when available so ID-keyed recipes win.
 */
export const getHorizontalStationLabelOverride = (
  rawName: string,
  stationId?: string,
): HorizontalStationLabelOverride | undefined => {
  const recipe = getStationLabelRecipe(rawName, stationId);
  return recipe ? recipeToOverride(recipe) : undefined;
};

/** @deprecated Prefer `getHorizontalStationLabelOverride`. */
export const getHorizontalForcedLineBreak = (
  rawName: string,
): readonly string[] | undefined =>
  getHorizontalStationLabelOverride(rawName)?.lines;

/** @deprecated Prefer `STATION_LABEL_RECIPES` / `getStationLabelRecipe`. */
export const HORIZONTAL_STATION_LABEL_OVERRIDES: Readonly<
  Record<string, HorizontalStationLabelOverride>
> = Object.fromEntries(
  [...recipesByNameKey.entries()].map(([key, recipe]) => [
    key,
    recipeToOverride(recipe),
  ]),
);
