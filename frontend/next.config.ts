import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/portal", destination: "/login", permanent: true },
      { source: "/portal/:path*", destination: "/login", permanent: true },
      { source: "/scan/:serial", destination: "/check/:serial", permanent: true },
    ];
  },
};

export default nextConfig;
