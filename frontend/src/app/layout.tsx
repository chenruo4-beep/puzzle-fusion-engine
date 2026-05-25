import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./ServiceWorkerRegister";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "拼拼看Me | PuzzleMe",
  description: "把你做过的事，拼成你的下一步 | Turn what you've done into your next step",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  
  return (
    <NextIntlClientProvider locale={locale}>
      <ServiceWorkerRegister />
      {children}
    </NextIntlClientProvider>
  );
}
