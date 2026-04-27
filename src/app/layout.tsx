import type { Metadata } from "next";
import "./globals.css";
import Icons from "@/components/Icons";

export const metadata: Metadata = {
  title: "Aktivacity — Dashboard",
  description: "Aktivacity task tracking and team management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Icons />
        {children}
      </body>
    </html>
  );
}
