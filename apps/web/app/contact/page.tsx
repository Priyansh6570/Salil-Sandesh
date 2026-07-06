import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = { title: "संपर्क" };

export default function ContactPage() {
  return (
    <StaticPage
      title="संपर्क करें"
      paragraphs={[
        "सुझाव, शिकायत या समाचार से जुड़ी जानकारी के लिए हमें लिखें: sampark@salilsandesh.example",
        "संपादकीय कार्यालय: सलिल संदेश, प्रेस परिसर, नई दिल्ली।",
        "विज्ञापन और साझेदारी के लिए हमारी व्यावसायिक टीम से संपर्क करें: vyapar@salilsandesh.example",
      ]}
    />
  );
}
