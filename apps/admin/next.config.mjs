import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(appDir, "../../.env") });

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const remotePatterns = [];
if (process.env.MEDIA_PUBLIC_BASE_URL) {
  const mediaUrl = new URL(process.env.MEDIA_PUBLIC_BASE_URL);
  remotePatterns.push({
    protocol: mediaUrl.protocol.replace(":", ""),
    hostname: mediaUrl.hostname,
    pathname: `${mediaUrl.pathname.replace(/\/$/, "")}/**`,
  });
}

const nextConfig = {
  transpilePackages: ["@salil-sandesh/shared", "@salil-sandesh/editor-config"],
  images: { remotePatterns },
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
};

export default nextConfig;
