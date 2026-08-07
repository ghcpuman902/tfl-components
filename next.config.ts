import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
  async redirects() {
    return [
      { source: "/status", destination: "/", permanent: true },
      { source: "/batch-status", destination: "/", permanent: true },
    ]
  },
}

export default nextConfig
