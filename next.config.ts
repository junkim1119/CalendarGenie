import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node-ical pulls in Node-only dependencies; load it at runtime instead of bundling it.
  serverExternalPackages: ["node-ical"],
};

export default nextConfig;
