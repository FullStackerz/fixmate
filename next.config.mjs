/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a second dev/build process use its own output folder (e.g. NEXT_DIST_DIR=.next-preview).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
