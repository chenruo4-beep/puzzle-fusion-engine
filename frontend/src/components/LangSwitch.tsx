"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

export default function LangSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = () => {
    const next = locale === "zh" ? "en" : "zh";
    router.replace(pathname, { locale: next });
  };

  return (
    <button
      onClick={switchLocale}
      className="fixed top-4 right-4 z-50 px-3 py-1.5 text-sm font-medium rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-warm-accent/20 hover:bg-warm-accent/10 transition-colors shadow-sm"
      aria-label="Switch language"
    >
      {locale === "zh" ? "EN" : "中文"}
    </button>
  );
}
