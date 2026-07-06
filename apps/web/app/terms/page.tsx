import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = { title: "नियम व शर्तें" };

export default function TermsPage() {
  return (
    <StaticPage
      title="नियम व शर्तें"
      paragraphs={[
        "इस वेबसाइट की सामग्री केवल सूचना के उद्देश्य से प्रकाशित की जाती है। सामग्री का सर्वाधिकार सलिल संदेश के पास सुरक्षित है।",
        "बिना लिखित अनुमति के सामग्री का व्यावसायिक पुनःप्रकाशन प्रतिबंधित है। उद्धरण देते समय स्रोत का उल्लेख अनिवार्य है।",
        "वेबसाइट के उपयोग से आप इन शर्तों से सहमत माने जाएँगे।",
      ]}
    />
  );
}
