const nextConfig = {
  async redirects() {
    return ["/pricing", "/plans", "/plan", "/subscribe", "/subscription", "/upgrade", "/success"].map((source) => ({
      source,
      destination: "/collection",
      permanent: true,
    }));
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ynnrxucsijyewvxcflmc.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
