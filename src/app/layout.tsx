import type { Metadata } from "next";
import { Lato, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

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

export const metadata: Metadata = {
  title: "Domain Manager",
  description: "Professional domain management and WHOIS tracking system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font variables live on <html> because Tailwind's base font-family is applied there
    <html lang="en" className={`${lato.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-gray-50">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
