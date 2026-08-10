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
  async redirects() {
    return [
      // Legacy demos → IA routes
      { source: "/status", destination: "/interfaces/tube-status-board", permanent: true },
      { source: "/batch-status", destination: "/interfaces/tube-status-board", permanent: true },
      { source: "/arrivals", destination: "/interfaces/arrivals-board", permanent: true },
      { source: "/arrivals/live", destination: "/interfaces/arrivals-board", permanent: true },
      { source: "/line-badge", destination: "/foundations/line-badge", permanent: true },
      { source: "/roundel", destination: "/foundations/tfl-roundel", permanent: true },
      { source: "/line-diagram", destination: "/interfaces/line-strip", permanent: true },
      { source: "/components/line-diagram", destination: "/interfaces/line-strip", permanent: true },
      { source: "/tools/branch-diagram", destination: "/primitives/branch-strip", permanent: true },
      { source: "/branch-diagram", destination: "/primitives/branch-strip", permanent: true },
      { source: "/route", destination: "/explore/routes", permanent: true },
      { source: "/typography", destination: "/tools/typography", permanent: true },
      // Old tools paths → Explore
      { source: "/tools/browse-lines", destination: "/explore/lines", permanent: true },
      { source: "/tools/route-stations", destination: "/explore/routes", permanent: true },
      // Old /components/* → group homes
      { source: "/components/tube-status-board", destination: "/interfaces/tube-status-board", permanent: true },
      { source: "/components/live-arrivals-board", destination: "/interfaces/arrivals-board", permanent: true },
      { source: "/components/bus-arrivals-board", destination: "/interfaces/arrivals-board", permanent: true },
      { source: "/components/line-strip", destination: "/interfaces/line-strip", permanent: true },
      { source: "/primitives/line-strip", destination: "/interfaces/line-strip", permanent: true },
      { source: "/components/branch-strip", destination: "/primitives/branch-strip", permanent: true },
      { source: "/components/tfl-roundel", destination: "/foundations/tfl-roundel", permanent: true },
      { source: "/components/line-badge", destination: "/foundations/line-badge", permanent: true },
    ];
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
