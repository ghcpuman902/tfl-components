import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  cacheComponents: true,
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  experimental: {
    // Built-in GFM (tables, strikethrough). remark plugins ignored while mdxRs is on.
    mdxRs: {
      mdxType: "gfm",
    },
  },
  async redirects() {
    return [
      { source: "/status", destination: "/components/tube-status-board", permanent: true },
      { source: "/batch-status", destination: "/components/tube-status-board", permanent: true },
      { source: "/arrivals", destination: "/components/bus-arrivals-board", permanent: true },
      { source: "/arrivals/live", destination: "/components/live-arrivals-board", permanent: true },
      { source: "/line-badge", destination: "/components/line-badge", permanent: true },
      { source: "/roundel", destination: "/components/tfl-roundel", permanent: true },
      { source: "/line-diagram", destination: "/components/line-strip", permanent: true },
      { source: "/components/line-diagram", destination: "/components/line-strip", permanent: true },
      { source: "/tools/branch-diagram", destination: "/components/branch-strip", permanent: true },
      { source: "/branch-diagram", destination: "/components/branch-strip", permanent: true },
      { source: "/explore", destination: "/tools/browse-lines", permanent: true },
      { source: "/route", destination: "/tools/route-stations", permanent: true },
      { source: "/typography", destination: "/tools/typography", permanent: true },
    ];
  },
};

const withMDX = createMDX({
  options: {
    // Fallback when mdxRs is disabled; Turbopack needs string plugin names.
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
