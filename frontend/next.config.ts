import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async redirects() {
    return [
      { source: "/portal", destination: "/login", permanent: true },
      { source: "/portal/:path*", destination: "/login", permanent: true },
      { source: "/scan/:serial", destination: "/check/:serial", permanent: true },
    ];
  },
};

export default nextConfig;
