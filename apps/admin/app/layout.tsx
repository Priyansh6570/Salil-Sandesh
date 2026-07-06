import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "सलिल संदेश — प्रबंधन", template: "%s | सलिल संदेश प्रबंधन" },
  description: "सलिल संदेश समाचार प्रबंधन प्रणाली",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
