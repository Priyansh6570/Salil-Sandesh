import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = { title: "गोपनीयता नीति" };

export default function PrivacyPage() {
  return (
    <StaticPage
      title="गोपनीयता नीति"
      paragraphs={[
        "सलिल संदेश आपकी निजता का सम्मान करता है। हम केवल वही जानकारी एकत्र करते हैं जो सेवा प्रदान करने के लिए आवश्यक है।",
        "हम आपकी व्यक्तिगत जानकारी किसी तीसरे पक्ष को नहीं बेचते। साइट के उपयोग के आँकड़े केवल सेवा सुधारने के लिए संकलित किए जाते हैं।",
        "इस नीति में किसी भी बदलाव की सूचना इसी पृष्ठ पर प्रकाशित की जाएगी।",
      ]}
    />
  );
}
