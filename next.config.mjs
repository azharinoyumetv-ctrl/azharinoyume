import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.azharinoyume.cloud" },
    ],
  },
  serverExternalPackages: ["puppeteer", "@prisma/adapter-pg", "pg"],
};

export default withNextIntl(nextConfig);
