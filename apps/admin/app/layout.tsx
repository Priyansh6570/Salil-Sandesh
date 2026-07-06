import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "सलिल संदेश — प्रबंधन",
  description: "सलिल संदेश समाचार प्रबंधन प्रणाली",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  );
}
