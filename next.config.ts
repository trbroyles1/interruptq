import type { NextConfig } from "next";
import { applyVercelEnv } from "@/vercel/env";

applyVercelEnv();

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
