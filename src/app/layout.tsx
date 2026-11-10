import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { AppNameProvider } from "@/components/app-name-provider";
import { getAppName } from "@/lib/app-settings";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = { themeColor: "#f3f1ec", viewportFit: "cover" };

// Each route sets its own title; the app name (editable in Settings) is appended
export async function generateMetadata(): Promise<Metadata> {
  const appName = await getAppName();
  return {
    title: { default: appName, template: `%s | ${appName}` },
    description: "Kelola domain, server, dan website, lengkap dengan pantauan WHOIS",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appName = await getAppName();

  return (
    // Font variables live on <html> because Tailwind's base font-family is applied there
    <html lang="id" className={`${jakarta.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh">
        <AppNameProvider value={appName}>
          <Providers>
            {children}
          </Providers>
        </AppNameProvider>
        <Toaster />
      </body>
    </html>
  );
}
