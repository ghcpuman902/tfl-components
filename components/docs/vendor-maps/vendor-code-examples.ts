/**
 * Copyable code examples for vendor map integrations.
 * These are rendered as syntax-highlighted blocks on the docs page.
 */

export const MAPLIBRE_EXAMPLE = `import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// After install: import geometry from your project
import tubeGeometry from "./data/geography/tube-geometry.json";

const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles: ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"],
        tileSize: 256,
      },
    },
    layers: [{ id: "carto", type: "raster", source: "carto" }],
  },
  center: [-0.12, 51.51],
  zoom: 10,
});

map.on("load", () => {
  // Lines — coloured by line identity
  map.addSource("tube-lines", { type: "geojson", data: tubeGeometry.lines });
  map.addLayer({
    id: "tube-lines",
    type: "line",
    source: "tube-lines",
    paint: {
      "line-color": ["get", "color"],
      "line-width": 3,
    },
  });

  // Stations — white circles with dark stroke
  map.addSource("tube-stations", { type: "geojson", data: tubeGeometry.stations });
  map.addLayer({
    id: "tube-stations",
    type: "circle",
    source: "tube-stations",
    paint: {
      "circle-radius": 3,
      "circle-color": "#ffffff",
      "circle-stroke-width": 1.25,
      "circle-stroke-color": "#111827",
    },
  });
});`;

export const LEAFLET_EXAMPLE = `import L from "leaflet";
import "leaflet/dist/leaflet.css";

import tubeGeometry from "./data/geography/tube-geometry.json";

const map = L.map("map").setView([51.51, -0.12], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// Lines
L.geoJSON(tubeGeometry.lines, {
  style: (feature) => ({
    color: feature?.properties?.color ?? "#0019A8",
    weight: 3,
    opacity: 0.9,
  }),
}).addTo(map);

// Stations
L.geoJSON(tubeGeometry.stations, {
  pointToLayer: (_feature, latlng) =>
    L.circleMarker(latlng, {
      radius: 3,
      fillColor: "#fff",
      color: "#111827",
      weight: 1.25,
      fillOpacity: 1,
    }),
}).addTo(map);`;

export const MAPBOX_EXAMPLE = `import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import tubeGeometry from "./data/geography/tube-geometry.json";

// Your Mapbox access token — consumers supply their own
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/light-v11",
  center: [-0.12, 51.51],
  zoom: 10,
});

map.on("load", () => {
  map.addSource("tube-lines", { type: "geojson", data: tubeGeometry.lines });
  map.addLayer({
    id: "tube-lines",
    type: "line",
    source: "tube-lines",
    paint: {
      "line-color": ["get", "color"],
      "line-width": 3,
    },
  });

  map.addSource("tube-stations", { type: "geojson", data: tubeGeometry.stations });
  map.addLayer({
    id: "tube-stations",
    type: "circle",
    source: "tube-stations",
    paint: {
      "circle-radius": 3,
      "circle-color": "#ffffff",
      "circle-stroke-width": 1.25,
      "circle-stroke-color": "#111827",
    },
  });
});`;

export const GOOGLE_MAPS_EXAMPLE = `import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

import tubeGeometry from "./data/geography/tube-geometry.json";

// Your Google Maps API key — consumers supply their own
setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY! });

const { Map } = await importLibrary("maps");

const map = new Map(document.getElementById("map")!, {
  center: { lat: 51.51, lng: -0.12 },
  zoom: 10,
});

map.data.addGeoJson(tubeGeometry.lines);
map.data.addGeoJson(tubeGeometry.stations);
map.data.setStyle((feature) => {
  if (feature.getGeometry()?.getType() === "Point") {
    return {
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 3,
        fillColor: "#ffffff",
        fillOpacity: 1,
        strokeColor: "#111827",
        strokeWeight: 1.25,
      },
    };
  }
  return {
    strokeColor: feature.getProperty("color") ?? "#0019A8",
    strokeWeight: 3,
    strokeOpacity: 0.9,
  };
});`;
