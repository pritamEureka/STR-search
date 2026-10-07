import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  devIndicators: false,
  // The browser only ever talks to same-origin `/api/*`; Next proxies to the
  // FastAPI service. This avoids CORS and lets Playwright mock `/api/**`.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
};

export default nextConfig;
