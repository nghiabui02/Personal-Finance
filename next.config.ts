import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WebStorm already runs TypeScript service; let Next skip TS check in dev/build.
  // CI / production builds should re-enable this by running `tsc --noEmit` separately.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Same idea for ESLint — run `pnpm lint` manually instead.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
