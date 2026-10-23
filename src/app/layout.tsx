import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cainta Queue · BPLO & Treasury",
  description: "Kumuha ng numero at bantayan ang pila mula sa inyong phone. Take a queue number and follow the line from your phone.",
  applicationName: "Cainta Queue",
  appleWebApp: { capable: true, title: "Cainta Queue", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b2a6f",
};

// Restore the person's chosen text size before the page paints.
const sizeScript = `try{var s=localStorage.getItem("cq_size");if(s)document.documentElement.dataset.size=s}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fil">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: sizeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
