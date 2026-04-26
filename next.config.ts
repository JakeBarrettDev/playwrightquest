import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fictitious sites under /sites/* are static HTML with relative asset
  // paths (e.g. <link href="styles.css">). Without a trailing slash, those
  // relative URLs resolve one directory up and 404. Keep the slash.
  trailingSlash: true,
};

export default nextConfig;
