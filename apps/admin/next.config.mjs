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

const nextConfig = {
  transpilePackages: ["@salil-sandesh/shared", "@salil-sandesh/editor-config"],
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
};

export default nextConfig;
