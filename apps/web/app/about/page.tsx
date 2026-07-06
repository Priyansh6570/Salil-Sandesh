import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = { title: "हमारे बारे में" };

export default function AboutPage() {
  return (
    <StaticPage
      title="हमारे बारे में"
      paragraphs={[
        "सलिल संदेश एक स्वतंत्र समाचार मंच है जो निष्पक्ष, तथ्यपरक और जन-सरोकार की पत्रकारिता के लिए प्रतिबद्ध है।",
        "हम हिन्दी में समाचार प्रकाशित करते हैं और चुनिंदा लेख अन्य भारतीय भाषाओं तथा अंग्रेज़ी में भी उपलब्ध कराते हैं, ताकि हर पाठक अपनी भाषा में भरोसेमंद खबर पढ़ सके।",
        "हमारी संपादकीय टीम सटीकता, संतुलन और पारदर्शिता के उच्चतम मानकों का पालन करती है।",
      ]}
    />
  );
}
