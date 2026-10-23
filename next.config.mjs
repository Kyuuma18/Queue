/** @type {import('next').NextConfig} */
const nextConfig = {
  // PGlite is only used for local development when DATABASE_URL is not set.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
