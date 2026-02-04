import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SaaS Voice AI - Voice Assistant",
  description:
    "AI-powered voice assistant. Hold to speak, get instant voice responses. Built with OpenAI.",
  keywords: ["voice assistant", "AI", "speech to text", "text to speech", "OpenAI"],
  authors: [{ name: "SaaS Voice AI" }],
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  },
  openGraph: {
    title: "SaaS Voice AI - Voice Assistant",
    description:
      "AI-powered voice assistant. Hold to speak, get instant voice responses.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SaaS Voice AI - Voice Assistant",
    description:
      "AI-powered voice assistant. Hold to speak, get instant voice responses.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
