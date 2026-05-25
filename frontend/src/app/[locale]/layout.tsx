import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import AuthGuard from "@/components/AuthGuard";
import { routing } from "@/i18n/routing";
import type { Metadata, Viewport } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://pinpinkan.me";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f0eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a2e" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: "拼拼看Me — 把你本来就有的东西，拼出一个自己", template: "%s | 拼拼看Me" },
  description: "你身上散落着很多碎片——Me帮你把它们捡起来，拼出一个你不知道的自己。",
  keywords: ["自我认知", "能力发现", "碎片融合", "AI工具", "拼拼看", "自我探索", "知识管理", "思维碎片", "个人成长"],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: BASE_URL,
    siteName: "拼拼看Me",
    title: "拼拼看Me — 把你本来就有的东西，拼出一个自己",
    description: "你身上散落着很多碎片。Me帮你把它们捡起来，拼出一个你不知道的自己。",
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: "拼拼看Me" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "拼拼看Me — 把你本来就有的东西，拼出一个自己",
    description: "你身上散落着很多碎片。Me帮你把它们捡起来，拼出一个你不知道的自己。",
    images: [`${BASE_URL}/og-image.png`],
  },
  alternates: { canonical: BASE_URL },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  manifest: "/manifest.json",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "zh" | "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <AuthGuard>{children}</AuthGuard>
          <ThemeToggle />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
