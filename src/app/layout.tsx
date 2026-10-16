import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SoundProvider } from "@/components/providers/sound-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("title"),
    description: t("description"),
    icons: {
      icon: "/logo.svg",
      apple: "/logo.svg",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <SoundProvider>
            <NextIntlClientProvider messages={messages}>
              <ToastProvider>{children}</ToastProvider>
            </NextIntlClientProvider>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
