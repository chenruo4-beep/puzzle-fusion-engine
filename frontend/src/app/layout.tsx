import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "拼拼看Me — 把你本来就有的东西，拼出一个自己",
  description: "你身上散落着很多碎片——你的经验、直觉、被夸过但自己没当真的小事。Me帮你把它们捡起来，拼拼看。",
  keywords: ["自我认知", "能力发现", "碎片融合", "AI工具", "拼拼看"],
  authors: [{ name: "拼拼看Me" }],
  openGraph: {
    title: "拼拼看Me — 把你本来就有的东西，拼出一个自己",
    description: "你身上散落着很多碎片。Me帮你把它们捡起来，拼出一个你不知道的自己。",
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
        <AuthGuard>{children}</AuthGuard>
        <ThemeToggle />
      </body>
    </html>
  );
}