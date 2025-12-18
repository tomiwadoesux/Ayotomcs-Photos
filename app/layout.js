import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata = {
  title: "Photos | Ayotomcs",
  description: "Ayotomiwa's Photos",
  openGraph: {
    images: "/opengraph.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
