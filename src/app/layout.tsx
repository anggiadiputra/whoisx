import type { Metadata } from "next";
import { Lato, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { AppNameProvider } from "@/components/app-name-provider";
import { getAppName } from "@/lib/app-settings";

// Lato has no 500/600 weights: font-medium renders as 400 and font-semibold as 700
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Each route sets its own title; the app name (editable in Settings) is appended
export async function generateMetadata(): Promise<Metadata> {
  const appName = await getAppName();
  return {
    title: { default: appName, template: `%s | ${appName}` },
    description: "Professional domain management and WHOIS tracking system",
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
    <html lang="en" className={`${lato.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-gray-50">
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
