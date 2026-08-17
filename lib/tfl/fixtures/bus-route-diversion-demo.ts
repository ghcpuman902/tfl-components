import { TFL_MODAL_COLOURS } from "@/lib/tfl/brand-colours";
import type { BusRouteGeometry } from "@/lib/tfl/bus-geography-types";

/**
 * Hand-built Westminster loop for the Bus (Geo) Preview.
 * Exercises current / diverted / disabled paint — not live TfL disruption data.
 */
export const BUS_ROUTE_DIVERSION_DEMO: BusRouteGeometry = {
  routeId: "24",
  direction: "outbound",
  color: TFL_MODAL_COLOURS.buses.hex,
  stops: [
    {
      id: "490000091G",
      name: "Trafalgar Square",
      lat: 51.508,
      lon: -0.128,
      sequence: 0,
    },
    {
      id: "490000252N",
      name: "Whitehall / Horse Guards",
      lat: 51.5056,
      lon: -0.1272,
      sequence: 1,
    },
    {
      id: "490000191S",
      name: "Parliament Square",
      lat: 51.5008,
      lon: -0.1265,
      sequence: 2,
    },
    {
      id: "490014259N",
      name: "Great Smith Street",
      lat: 51.4978,
      lon: -0.1298,
      sequence: 3,
    },
  ],
  segments: [
    {
      id: "demo-current",
      status: "current",
      line: {
        type: "LineString",
        coordinates: [
          [-0.128, 51.508],
          [-0.1276, 51.5068],
          [-0.1272, 51.5056],
        ],
      },
    },
    {
      id: "demo-disabled",
      status: "disabled",
      line: {
        type: "LineString",
        coordinates: [
          [-0.1272, 51.5056],
          [-0.1268, 51.5032],
          [-0.1265, 51.5008],
        ],
      },
    },
    {
      id: "demo-diverted",
      status: "diverted",
      line: {
        type: "LineString",
        coordinates: [
          [-0.1272, 51.5056],
          [-0.1304, 51.5042],
          [-0.131, 51.5016],
          [-0.1298, 51.4978],
        ],
      },
    },
    {
      id: "demo-current-resume",
      status: "current",
      line: {
        type: "LineString",
        coordinates: [
          [-0.1265, 51.5008],
          [-0.1282, 51.4992],
          [-0.1298, 51.4978],
        ],
      },
    },
  ],
};
