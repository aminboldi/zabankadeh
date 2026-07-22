import type { NextConfig } from "next";
import path from "node:path";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(path.resolve(process.cwd(), "../../.env"));
} catch {
  // Environment variables may be supplied by the hosting environment instead.
}

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: { typedEnv: false },
  turbopack: { root: path.resolve(process.cwd(), "../..") },
  async rewrites() {
    const apiInternalUrl = process.env.API_INTERNAL_URL;
    if (!apiInternalUrl) return [];
    return [{ source: "/v1/:path*", destination: `${apiInternalUrl}/v1/:path*` }];
  },
};

export default nextConfig;
