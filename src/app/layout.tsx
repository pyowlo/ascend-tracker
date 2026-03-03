import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ascend Tracker — Admin Dashboard",
  description: "Internal business admin dashboard for operations and sales teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}

