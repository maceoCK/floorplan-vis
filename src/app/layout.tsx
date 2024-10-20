import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Floorplan Visualizer",
  description: "Visualize your floorplan",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Floorplan Visualizer",
    description: "Visualize your floorplan",
    url: "https://floorplan-vis.vercel.app",
    siteName: "Floorplan Visualizer",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/homepage.png",
        width: 1200,
        height: 630,
      },
    ],
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
