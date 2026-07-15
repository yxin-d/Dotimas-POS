import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',   // Generates an 'out' folder with pure HTML/CSS/JS
  images: { unoptimized: true },
};

export default nextConfig;
