import type { NextConfig } from "next";

const internalHost = process.env.TAURI_DEV_HOST || "localhost";

const nextConfig: NextConfig = {
  // Static export required for Tauri (desktop + mobile).
  output: "export",
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
  // Removed assetPrefix: Using relative paths works perfectly for Tauri Android DEV
  // whether on localhost or LAN IP, avoiding missing CSS on wireless debugging.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "0.0.0.0",
    "tauri.localhost",
    "10.0.2.2",
    internalHost,
  ],
  serverExternalPackages: [
    "@prisma/client-runtime-utils",
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
  ],
  // CORS headers for desktop Tauri dev (tauri.localhost → dev server cross-origin)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
