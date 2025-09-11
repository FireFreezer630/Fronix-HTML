import type { Metadata } from "next";
import "./globals.css";
import MathRenderer from '@/src/components/MathRenderer';

export const metadata: Metadata = {
  title: "Fronix.ai",
  description: "Fronix.ai - Your AI Chat Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&family=Yu+Gothic&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full bg-light-background dark:bg-dark-background flex overflow-hidden text-light-text dark:text-dark-text font-inter font-normal">
        <div id="sidebar-overlay"></div>
        {children}
        <MathRenderer />
      </body>
    </html>
  );
}
