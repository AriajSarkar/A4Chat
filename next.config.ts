import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const internalHost = process.env.TAURI_DEV_HOST || "localhost";

const nextConfig: NextConfig = {
  // Static export required for Tauri (desktop + mobile).
  output: "export",
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
  // Point assets at the dev server's network IP so the Android WebView can reach them.
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
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
