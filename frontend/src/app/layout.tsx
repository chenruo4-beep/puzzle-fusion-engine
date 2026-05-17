import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "拼图融合引擎 — 3分钟找到你的副业方向",
  description: "把你散落的能力碎片，拼成能变现的完整作品。AI自动识别你的技能组合，发现隐藏副业机会。",
  keywords: ["副业", "技能变现", "职业规划", "AI工具", "碎片融合"],
  authors: [{ name: "拼图融合引擎" }],
  openGraph: {
    title: "拼图融合引擎 — 3分钟找到你的副业方向",
    description: "把你散落的能力碎片，拼成能变现的完整作品",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}