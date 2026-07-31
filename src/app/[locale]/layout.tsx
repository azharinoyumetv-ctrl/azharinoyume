import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";
import PwaRegister from "@/components/PwaRegister";
import ClientProviders from "@/components/ClientProviders";

const inter = Inter({ subsets: ["latin"] });
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://studio.azharinoyume.cloud";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Azyume Cut AI — AI Video Editing Studio",
  description: "Premium AI video editing delivered worldwide. Cinematic quality, fast delivery.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Azyume Cut AI — AI Video Editing Studio",
    description: "Premium AI video editing delivered worldwide.",
    url: appUrl,
    siteName: "Azyume Cut AI",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#050508",
  colorScheme: "dark",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as never)) notFound();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <ClientProviders><PwaRegister />{children}</ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
