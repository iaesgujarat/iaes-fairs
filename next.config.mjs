/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer ships ESM-only — transpile it so client bundles work.
  transpilePackages: ["@react-pdf/renderer"],
};

export default nextConfig;
