import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "सलिल संदेश",
  description: "सलिल संदेश — आपका विश्वसनीय समाचार स्रोत",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  );
}
