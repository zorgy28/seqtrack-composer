import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["webmidi", "@mediapipe/tasks-vision"],
  // Allow Electron's 127.0.0.1 origin for HMR websocket in dev mode
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
