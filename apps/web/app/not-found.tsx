import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";

export default function NotFound() {
  const dict = getDictionary();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{dict.notFoundTitle}</h1>
      <p className="text-muted-foreground">{dict.notFoundBody}</p>
      <Link href="/" className={buttonVariants({ variant: "default" })}>
        {dict.backHome}
      </Link>
    </div>
  );
}
