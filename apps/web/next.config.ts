import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: { typedEnv: false },
  turbopack: { root: path.resolve(process.cwd(), "../..") },
};

export default nextConfig;
