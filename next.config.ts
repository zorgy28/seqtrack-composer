import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["webmidi", "@mediapipe/tasks-vision"],
};

export default nextConfig;
