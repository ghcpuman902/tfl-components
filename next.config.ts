import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  cacheComponents: true,
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  experimental: {
    mdxRs: {
      mdxType: "gfm",
    },
  },
  async headers() {
    return [
      {
        source: "/images/home/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // —— J6 docs chrome ——
      { source: "/installation", destination: "/docs/installation", permanent: true },
      { source: "/interfaces", destination: "/docs/components", permanent: true },
      { source: "/interfaces/arrivals-board", destination: "/docs/tube-rail-arrivals", permanent: true },
      { source: "/interfaces/rail-arrivals-board", destination: "/docs/tube-rail-arrivals", permanent: true },
      { source: "/interfaces/bus-arrivals-board", destination: "/docs/bus-arrivals", permanent: true },
      { source: "/interfaces/tube-status-board", destination: "/docs/tube-rail-status", permanent: true },
      { source: "/interfaces/line-strip", destination: "/docs/line-strip", permanent: true },
      { source: "/primitives", destination: "/docs/components", permanent: true },
      { source: "/primitives/branch-strip", destination: "/docs/branch-strip", permanent: true },
      { source: "/primitives/station-name", destination: "/docs/station-name-labels", permanent: true },
      { source: "/foundations", destination: "/docs", permanent: true },
      { source: "/foundations/typography", destination: "/docs/typography", permanent: true },
      { source: "/foundations/line-badge", destination: "/docs/line-badge", permanent: true },
      { source: "/foundations/colours", destination: "/docs/colors", permanent: true },
      { source: "/foundations/colors", destination: "/docs/colors", permanent: true },
      { source: "/foundations/tfl-roundel", destination: "/docs/tfl-roundel", permanent: true },
      { source: "/foundations/licensing", destination: "/docs/tfl-licensing", permanent: true },
      { source: "/foundations/icons", destination: "/docs/icons", permanent: true },
      { source: "/foundations/station-labels", destination: "/docs/station-name-labels", permanent: true },
      { source: "/maps", destination: "/docs/components", permanent: true },
      { source: "/maps/geographic", destination: "/docs/map-geographic", permanent: true },
      { source: "/maps/schematic", destination: "/docs/map-schematic", permanent: true },
      { source: "/explore", destination: "/docs/explorer", permanent: true },

      // Legacy demos → docs routes
      { source: "/status", destination: "/docs/tube-rail-status", permanent: true },
      { source: "/batch-status", destination: "/docs/tube-rail-status", permanent: true },
      { source: "/arrivals", destination: "/docs/tube-rail-arrivals", permanent: true },
      { source: "/arrivals/live", destination: "/docs/tube-rail-arrivals", permanent: true },
      { source: "/line-badge", destination: "/docs/line-badge", permanent: true },
      { source: "/roundel", destination: "/docs/tfl-roundel", permanent: true },
      { source: "/line-diagram", destination: "/docs/line-strip", permanent: true },
      { source: "/components/line-diagram", destination: "/docs/line-strip", permanent: true },
      { source: "/tools/branch-diagram", destination: "/docs/branch-strip", permanent: true },
      { source: "/branch-diagram", destination: "/docs/branch-strip", permanent: true },
      { source: "/route", destination: "/explore/routes", permanent: true },
      { source: "/typography", destination: "/tools/typography", permanent: true },
      { source: "/tools/browse-lines", destination: "/explore/lines", permanent: true },
      { source: "/tools/route-stations", destination: "/explore/routes", permanent: true },
      { source: "/components/tube-status-board", destination: "/docs/tube-rail-status", permanent: true },
      { source: "/components/live-arrivals-board", destination: "/docs/tube-rail-arrivals", permanent: true },
      { source: "/components/bus-arrivals-board", destination: "/docs/bus-arrivals", permanent: true },
      { source: "/components/line-strip", destination: "/docs/line-strip", permanent: true },
      { source: "/primitives/line-strip", destination: "/docs/line-strip", permanent: true },
      { source: "/components/branch-strip", destination: "/docs/branch-strip", permanent: true },
      { source: "/components/tfl-roundel", destination: "/docs/tfl-roundel", permanent: true },
      { source: "/components/line-badge", destination: "/docs/line-badge", permanent: true },
    ];
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
