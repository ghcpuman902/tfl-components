import type { Map as MapLibreMap } from "maplibre-gl";

const WOOD_PATTERN_ID = "wood-pattern";
const WOOD_PIXEL = new Uint8Array([32, 32, 32, 255]);
const EMPTY_PIXEL = new Uint8Array(4);

/**
 * OpenFreeMap dark style paints woods with `fill-pattern: wood-pattern`,
 * but that image is not in the published sprite. Supply a 1×1 stand-in so
 * MapLibre does not warn; any other missing sprite gets a transparent pixel.
 */
export const provideMissingStyleImages = (map: MapLibreMap) => {
  map.on("styleimagemissing", (event) => {
    if (map.hasImage(event.id)) return;
    map.addImage(event.id, {
      width: 1,
      height: 1,
      data: new Uint8Array(
        event.id === WOOD_PATTERN_ID ? WOOD_PIXEL : EMPTY_PIXEL,
      ),
    });
  });
};
