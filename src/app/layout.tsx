import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A4Chat",
  description: "Cross-platform AI chat for OpenRouter, LM Studio, and compatible APIs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <body className="min-h-full bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
