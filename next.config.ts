import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WebStorm already runs TypeScript service; let Next skip TS check in dev/build.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
