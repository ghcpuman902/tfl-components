export const PLACEHOLDER_ROUNDEL_SPIN_ATLAS = "/brand/placeholder-roundel-spin.svg"

export const PLACEHOLDER_ROUNDEL_SPIN_META = {
  "frameCount": 56,
  "rows": 8,
  "columns": 7,
  "frameWidth": 64,
  "frameHeight": 64,
  "atlasWidth": 448,
  "atlasHeight": 512,
  "durationMs": 4100,
  "config": {
    "durationMs": 4100,
    "turns": 6,
    "spinProfile": "smootherstep",
    "accelFraction": 0.14,
    "maxTiltDeg": 16,
    "tiltAxis": "x",
    "spinAxis": "y",
    "wobbleAmpDeg": 8.5,
    "sphereRadius": 250,
    "ringRadius": 257.1,
    "ringThickness": 50.55,
    "cameraScale": 0.92,
    "frameCount": 56,
    "spriteRows": 8,
    "frameWidth": 64,
    "frameHeight": 64,
    "frameFit": "square",
    "previewSpeed": 1,
    "svgPrecision": 1,
    "svgExportSize": 200,
    "sphereColor": "#cecece",
    "ringColor": "#888888",
    "material": "basic",
    "sphereWidthSegments": 24,
    "sphereHeightSegments": 16,
    "ringRadialSegments": 12,
    "ringTubularSegments": 48
  },
  "clips": [
    {
      "id": "intro",
      "start": 0,
      "frameCount": 56,
      "durationMs": 4100,
      "loop": false,
      "sample": "inclusive"
    },
    {
      "id": "accel",
      "start": 0,
      "frameCount": 26,
      "durationMs": 1867,
      "loop": false,
      "sample": "inclusive"
    },
    {
      "id": "loop",
      "start": 25,
      "frameCount": 5,
      "durationMs": 366,
      "loop": true,
      "sample": "cycle"
    },
    {
      "id": "decel",
      "start": 30,
      "frameCount": 26,
      "durationMs": 1867,
      "loop": false,
      "sample": "inclusive"
    }
  ]
} as const
